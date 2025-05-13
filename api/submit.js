const nodemailer = require('nodemailer');
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

// In-memory store to track user submissions (should be replaced with a persistent store in production)
const requestLog = {};

const MAX_REQUESTS = 5;  // Max number of requests per user
const TIME_WINDOW = 10 * 60 * 1000;  // 10 minutes in milliseconds

// This function is used to handle the request and response
module.exports = async (req, res) => {
    // Handle CORS for your frontend domain
    cors({
        origin: 'https://stock-request-form.vercel.app/', // Your frontend domain
        methods: ['POST'],
        allowedHeaders: ['Content-Type'],
    })(req, res, () => {});

    if (req.method === 'POST') {
        const { name, email, category, stockItem, description } = req.body;

        // Get the current time
        const currentTime = Date.now();

        // Initialize request log for the user if it doesn't exist
        if (!requestLog[email]) {
            requestLog[email] = [];
        }

        // Filter out requests older than the time window
        requestLog[email] = requestLog[email].filter(timestamp => currentTime - timestamp < TIME_WINDOW);

        // Check if the user has reached the maximum request limit
        if (requestLog[email].length >= MAX_REQUESTS) {
            return res.status(429).json({
                success: false,
                message: 'You have reached the maximum number of requests. Please try again later.',
            });
        }

        // Log the current request time
        requestLog[email].push(currentTime);

        try {
            // Send confirmation email to the user
            await transporter.sendMail({
                from: process.env.ADMIN_EMAIL,  // Verified sender email
                to: email,
                subject: 'Thank you for your enquiry!',
                text: `Hi ${name},\n\nThank you for your enquiry about ${stockItem} (${category}). We’ve received your request and will get back to you shortly.\n\nBest,\nYour Team`,
            });

            console.log(`Confirmation email sent to ${email}`);

            // Send full form details to the admin
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
