// api/submit.js

const nodemailer = require('nodemailer');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method Not Allowed' });
    }

    const { name, email, category, stockItem, description } = req.body;

    // Setup transporter using environment variables from Vercel
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT, 10),
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });

    try {
        // Send confirmation email to user
        await transporter.sendMail({
            from: process.env.ADMIN_EMAIL,  // must be a verified sender in Brevo
            to: email,
            subject: 'Thank you for your enquiry!',
            text: `Hi ${name},

Thank you for your enquiry about ${stockItem} (${category}).
We’ve received your request and will get back to you shortly.

Best,
Your Team`,
        });

        console.log(`✅ Confirmation email sent to ${email}`);

        // Send form details to admin
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

        console.log(`✅ Form details sent to admin: ${process.env.ADMIN_EMAIL}`);

        return res.status(200).json({ success: true, message: 'Request submitted successfully' });
    } catch (error) {
        console.error('❌ Error sending email:', error);
        return res.status(500).json({ success: false, message: 'Error sending email', error: error.message });
    }
};
