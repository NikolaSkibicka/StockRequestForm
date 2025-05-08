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

// This function is used to handle the request and response
module.exports = async (req, res) => {
    // Handle CORS for your frontend domain
    cors({
        origin: 'https://stock-request-form.vercel.app/', // Your frontend domain
        methods: ['POST'],
        allowedHeaders: ['Content-Type'],
    })(req, res, () => {});

    if (req.method === 'POST') {
        const { name, email, category, stockItem, description, captchaResponse } = req.body;

        // Step 1: Verify the reCAPTCHA response with Google
        const captchaSecret = process.env.RECAPTCHA_SECRET_KEY;
        const captchaVerificationUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${captchaSecret}&response=${captchaResponse}`;

        try {
            // Verify reCAPTCHA response
            const captchaVerificationResponse = await axios.post(captchaVerificationUrl);
            const captchaData = captchaVerificationResponse.data;

            // If CAPTCHA is not verified, return error
            if (!captchaData.success) {
                return res.status(400).json({
                    success: false,
                    message: 'reCAPTCHA verification failed. Please try again.',
                });
            }

            // Step 2: Send confirmation email to the user
            await transporter.sendMail({
                from: process.env.ADMIN_EMAIL,  // Verified sender email
                to: email,
                subject: 'Thank you for your enquiry!',
                text: `Hi ${name},\n\nThank you for your enquiry about ${stockItem} (${category}). We’ve received your request and will get back to you shortly.\n\nBest,\nYour Team`,
            });

            console.log(`Confirmation email sent to ${email}`);

            // Step 3: Send full form details to the admin
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
            console.error('Error sending email:', error);
            return res.status(500).json({ success: false, message: 'Error sending email' });
        }
    } else {
        return res.status(405).json({ success: false, message: 'Method Not Allowed' });
    }
};
