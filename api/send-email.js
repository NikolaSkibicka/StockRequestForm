const nodemailer = require('nodemailer');
require('dotenv').config();
const cors = require('cors');

module.exports = async (req, res) => {
    // Enable CORS
    cors({
        origin: 'https://stock-request-form.vercel.app', // Replace with the actual frontend URL
        methods: ['POST'],
        allowedHeaders: ['Content-Type'],
    })(req, res, () => {});

    if (req.method === 'POST') {
        const { name, email, category, stockItem, description } = req.body;

        // Setup transporter
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });

        try {
            // 1️⃣ Send confirmation email to the user
            await transporter.sendMail({
                from: process.env.ADMIN_EMAIL,  // must be verified sender
                to: email,
                subject: 'Thank you for your enquiry!',
                text: `Hi ${name},\n\nThank you for your enquiry about ${stockItem} (${category}). We’ve received your request and will get back to you shortly.\n\nBest,\nYour Team`,
            });

            console.log(`Confirmation email sent to ${email}`);

            // 2️⃣ Send full form details to the admin
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
