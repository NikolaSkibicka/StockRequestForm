const nodemailer = require('nodemailer');
const axios = require('axios');
require('dotenv').config();
const cors = require('cors');

// Create transporter
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

module.exports = async (req, res) => {
    cors({
        origin: 'https://stock-request-form.vercel.app/',
        methods: ['POST'],
        allowedHeaders: ['Content-Type'],
    })(req, res, async () => {
        if (req.method !== 'POST') {
            return res.status(405).json({ success: false, message: 'Method Not Allowed' });
        }

        const { name, email, category, stockItem, description, captchaResponse } = req.body;

        console.log('Incoming body:', req.body);

        if (!captchaResponse) {
            console.error('No captcha response provided.');
            return res.status(400).json({ success: false, message: 'Captcha missing.' });
        }

        const captchaSecret = process.env.RECAPTCHA_SECRET_KEY;
        const captchaVerificationUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${captchaSecret}&response=${captchaResponse}`;

        try {
            const captchaVerificationResponse = await axios.post(captchaVerificationUrl);
            const captchaData = captchaVerificationResponse.data;

            console.log('Captcha verification response:', captchaData);

            if (!captchaData.success) {
                console.error('Captcha failed:', captchaData);
                return res.status(400).json({
                    success: false,
                    message: 'Captcha verification failed. Please try again.',
                });
            }
        } catch (captchaError) {
            console.error('Error verifying captcha:', captchaError.response?.data || captchaError.message);
            return res.status(500).json({ success: false, message: 'Captcha verification error.' });
        }

        try {
            await transporter.sendMail({
                from: process.env.ADMIN_EMAIL,
                to: email,
                subject: 'Thank you for your enquiry!',
                text: `Hi ${name},\n\nThank you for your enquiry about ${stockItem} (${category}). We’ve received your request and will get back to you shortly.\n\nBest,\nYour Team`,
            });

            console.log(`Confirmation email sent to ${email}`);

            await transporter.sendMail({
                from: process.env.ADMIN_EMAIL,
                to: process.env.ADMIN_EMAIL,
                subject: `New Stock Request from ${name}`,
                text: `
New stock request:

Name: ${name}
Email: ${email}
Category: ${category}
Item: ${stockItem}
Description: ${description}
                `,
            });

            console.log(`Admin notified at ${process.env.ADMIN_EMAIL}`);

            return res.status(200).json({ success: true, message: 'Request submitted successfully' });
        } catch (emailError) {
            console.error('Error sending email:', emailError);
            return res.status(500).json({ success: false, message: 'Email sending failed.' });
        }
    });
};
