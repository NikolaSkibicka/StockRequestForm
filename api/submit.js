const nodemailer = require('nodemailer');
const axios = require('axios');
const rateLimitMap = new Map(); // In-memory rate limiter

require('dotenv').config();

// Email transporter setup
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

// Utility: Simple in-memory rate limiter (per IP)
function isRateLimited(ip) {
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute
    const maxRequests = 5; // max 5 requests per minute

    if (!rateLimitMap.has(ip)) {
        rateLimitMap.set(ip, []);
    }

    const timestamps = rateLimitMap.get(ip).filter(ts => now - ts < windowMs);
    timestamps.push(now);
    rateLimitMap.set(ip, timestamps);

    return timestamps.length > maxRequests;
}

module.exports = async (req, res) => {
    try {
        // Handle CORS
        res.setHeader('Access-Control-Allow-Origin', 'https://stock-request-form.vercel.app');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
            return res.status(200).end();
        }

        if (req.method !== 'POST') {
            return res.status(405).json({ success: false, message: 'Method Not Allowed' });
        }
const ip = (req.headers['x-forwarded-for'] || req.connection.remoteAddress || '')
    .split(',')[0]
    .trim();
        if (isRateLimited(ip)) {
            console.warn(`Rate limit exceeded for IP: ${ip}`);
            return res.status(429).json({ success: false, message: 'Too many requests, please slow down.' });
        }

        const { name, email, category, stockItem, description, captchaResponse } = req.body;

        if (!captchaResponse) {
            return res.status(400).json({ success: false, message: 'Missing CAPTCHA response' });
        }

        // Verify CAPTCHA with Google
        const captchaSecret = process.env.RECAPTCHA_SECRET_KEY;
        const captchaVerificationUrl = `https://www.google.com/recaptcha/api/siteverify`;

        const captchaRes = await axios.post(
            captchaVerificationUrl,
            new URLSearchParams({
                secret: captchaSecret,
                response: captchaResponse,
            }),
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );

        if (!captchaRes.data.success) {
            console.warn(`CAPTCHA failed for IP: ${ip}`);
            return res.status(400).json({ success: false, message: 'reCAPTCHA verification failed' });
        }

        // Send confirmation email
        await transporter.sendMail({
            from: process.env.ADMIN_EMAIL,
            to: email,
            subject: 'Thank you for your enquiry!',
            text: `Hi ${name},\n\nThank you for your enquiry about ${stockItem} (${category}). We’ve received your request and will get back to you shortly.\n\nBest,\nDrew`,
        });

        // Send admin notification
        await transporter.sendMail({
            from: process.env.ADMIN_EMAIL,
            to: process.env.ADMIN_EMAIL,
            subject: `New Stock Request from ${name}`,
            text: `You received a new stock request:\n\nName: ${name}\nEmail: ${email}\nCategory: ${category}\nItem: ${stockItem}\nDescription: ${description}`,
        });

        console.log(`Request processed successfully for IP: ${ip}`);

        return res.status(200).json({ success: true, message: 'Request submitted successfully' });

    } catch (error) {
        console.error('Server error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error', error: error.message });
    }
};
