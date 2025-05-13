export const config = {
  api: {
    bodyParser: true,
  },
};

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
});

const nodemailer = require('nodemailer');
require('dotenv').config();

// In-memory rate limiter and IP banlist
const rateLimitMap = new Map(); // {ip: [timestamps]}
const banlist = new Set(); // Set of banned IPs

// Check environment variables
if (!process.env.ADMIN_EMAIL || !process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
  throw new Error('Missing required environment variables');
}

// Email transporter setup
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT),
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Utility: Check if IP is rate-limited
function isRateLimited(ip) {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 5;

  if (!rateLimitMap.has(ip)) {
    rateLimitMap.set(ip, []);
  }

  const timestamps = rateLimitMap.get(ip).filter(ts => now - ts < windowMs);
  timestamps.push(now);
  rateLimitMap.set(ip, timestamps);

  return timestamps.length > maxRequests;
}

// Utility: Check if IP is banned
function isBanned(ip) {
  return banlist.has(ip);
}

module.exports = async (req, res) => {
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

  const { name, email, category, stockItem, description, captchaResponse } = req.body;

  if (!name || !email || !category || !stockItem || !captchaResponse) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }

  const ip = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim();

  // Ban and rate limit checks
  if (isBanned(ip)) {
    console.warn(`Blocked IP (banned): ${ip}`);
    return res.status(403).json({ success: false, message: 'Your IP is banned.' });
  }

  if (isRateLimited(ip)) {
    console.warn(`Rate limit exceeded for IP: ${ip}`);
    return res.status(429).json({ success: false, message: 'Too many requests, please slow down.' });
  }

  try {
    // Verify CAPTCHA with Google
    const captchaSecret = process.env.RECAPTCHA_SECRET_KEY;
    const captchaVerificationUrl = `https://www.google.com/recaptcha/api/siteverify`;

   const https = require('https');
const querystring = require('querystring');

function verifyCaptcha(secret, response, remoteip) {
    const postData = querystring.stringify({
        secret,
        response,
        remoteip
    });

    const options = {
        hostname: 'www.google.com',
        path: '/recaptcha/api/siteverify',
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(postData)
        }
    };

    return new Promise((resolve, reject) => {
        const req = https.request(options, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    resolve(json);
                } catch (err) {
                    reject(err);
                }
            });
        });

        req.on('error', reject);
        req.write(postData);
        req.end();
    });
}

const captchaResult = await verifyCaptcha(captchaSecret, captchaResponse, ip);

if (!captchaResult.success) {
  console.warn(`CAPTCHA failed for IP: ${ip}`);
  return res.status(400).json({ success: false, message: 'reCAPTCHA verification failed' });
}

    // Send confirmation email to the user
    await transporter.sendMail({
      from: process.env.ADMIN_EMAIL,
      to: email,
      subject: 'Thank you for your enquiry!',
      text: `Hi ${name},\n\nThank you for your enquiry about ${stockItem} (${category}).\n\nBest,\nDrew`,
    });

    // Send admin notification
    await transporter.sendMail({
      from: process.env.ADMIN_EMAIL,
      to: process.env.ADMIN_EMAIL,
      subject: `New Stock Request from ${name}`,
      text: `New stock request:\nName: ${name}\nEmail: ${email}\nCategory: ${category}\nItem: ${stockItem}\nDescription: ${description}`,
    });

    return res.status(200).json({ success: true, message: 'Request submitted successfully' });
  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal Server Error',
      error: error.message,
    });
  }
};
