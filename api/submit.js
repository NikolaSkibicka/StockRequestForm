module.exports = async (req, res) => {
    try {
        // Handle CORS
        cors({
            origin: 'https://stock-request-form.vercel.app/', // frontend domain
            methods: ['POST'],
            allowedHeaders: ['Content-Type'],
        })(req, res, () => {});

        if (req.method !== 'POST') {
            return res.status(405).json({ success: false, message: 'Method Not Allowed' });
        }

        const { name, email, category, stockItem, description, captchaResponse } = req.body;

        if (!captchaResponse) {
            return res.status(400).json({ success: false, message: 'Missing CAPTCHA response' });
        }

        // Step 1: Verify the reCAPTCHA response with Google
        const captchaSecret = process.env.RECAPTCHA_SECRET_KEY;
        const captchaVerificationUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${captchaSecret}&response=${captchaResponse}`;

        const captchaVerificationResponse = await axios.post(captchaVerificationUrl);
        const captchaData = captchaVerificationResponse.data;

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

        return res.status(200).json({ success: true, message: 'Request submitted successfully' });

    } catch (error) {
        console.error('Server error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error', error: error.message });
    }
};
