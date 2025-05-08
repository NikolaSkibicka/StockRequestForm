const nodemailer = require('nodemailer');
const axios = require('axios');
require('dotenv').config();
const cors = require('cors');

// Create a transporter to send emails
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

module.exports = async (req, res) => {
    // Handle CORS
    cors({
        origin: 'https://stock-request-form.vercel.app/',
        methods: ['POST'],
        allowedHeaders: ['Content-Type'],
    })(req, res, async () => {
        if (req.method !== 'POST') {
            return res.status(405).json({ success: false, message: 'Method Not Allowed' });
        }

        const { name, email, category, stockItem, description, captchaResponse } = req.body;

        if (!captchaResponse) {
            return res.status(400).json({ success: false, message: 'Captcha token missing' });
        }

        try {
            // ✅ STEP 1: Verify reCAPTCHA
            const params = new URLSearchParams();
            params.append('secret', process.env.RECAPTCHA_SECRET_KEY);
            params.append('response', captchaResponse);

            const captchaRes = await axios.post(
                'https://www.google.com/recaptcha/api/siteverify',
                params
            );

            if (!captchaRes.data.success) {
                return res.status(400).json({
                    success: false,
                    message: 'reCAPTCHA verification failed. Please try again.',
                });
            }

            // ✅ STEP 2: Send confirmation email to user
            await transporter.sendMail({
                from: process.env.ADMIN_EMAIL,
                to: email,
                subject: 'Thank you for your enquiry!',
                text: `Hi ${name},\n\nThank you for your enquiry about ${stockItem} (${category}). We’ve received your request and will get back to you shortly.\n\nBest,\nYour Team`,
            });

            console.log(`Confirmation email sent to ${email}`);

            // ✅ STEP 3: Send full details to admin
            await transporter.sendMail({
                from: process.env.ADMIN_EMAIL,
                to: process.env.ADMIN_EMAIL,
                subject: `New Stock Request from ${name}`,
                text: `
You received a new stock request:

Name: ${name}
Email: ${email}
Category: ${category}
Item: ${stockItem}
Description: ${description}
                `,
            });

            console.log(`Form details sent to admin: ${process.env.ADMIN_EMAIL}`);

            return res.status(200).json({ success: true, message: 'Request submitted successfully' });
        } catch (error) {
            console.error('Error:', error);
            return res.status(500).json({ success: false, message: 'Internal Server Error' });
        }
    });
};
