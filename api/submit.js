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

// The handler function to handle requests
module.exports = async (req, res) => {
    // Handle CORS for your frontend domain (allowing only this domain)
    const corsOptions = {
        origin: 'https://stock-request-form.vercel.app', // Your frontend domain
        methods: ['POST'],
        allowedHeaders: ['Content-Type'],
    };

    // Apply CORS middleware
    cors(corsOptions)(req, res, async () => {
        // Only handle POST requests
        if (req.method !== 'POST') {
            return res.status(405).json({ success: false, message: 'Method Not Allowed' });
        }

        // Destructure the fields from the incoming request
        const { name, email, category, stockItem, description, captchaResponse } = req.body;

        // Check if CAPTCHA response is missing
        if (!captchaResponse) {
            return res.status(400).json({ success: false, message: 'Missing CAPTCHA response' });
        }

        try {
            // Step 1: Verify the reCAPTCHA response with Google
            const captchaSecret = process.env.RECAPTCHA_SECRET_KEY;
            const captchaVerificationUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${captchaSecret}&response=${captchaResponse}`;

            // Make a request to Google's reCAPTCHA API for verification
            const captchaVerificationResponse = await axios.post(captchaVerificationUrl);
            const captchaData = captchaVerificationResponse.data;

            // If CAPTCHA verification failed, send an error response
            if (!captchaData.success) {
                return res.status(400).json({
                    success: false,
                    message: 'reCAPTCHA verification failed. Please try again.',
                });
            }

            // Step 2: Send confirmation email to the user
            await transporter.sendMail({
                from: process.env.ADMIN_EMAIL,
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

            // Send a success response to the frontend
            return res.status(200).json({ success: true, message: 'Request submitted successfully' });
        } catch (error) {
            console.error('Error during API call:', error);
            return res.status(500).json({ success: false, message: 'Internal Server Error', error: error.message });
        }
    });
};
