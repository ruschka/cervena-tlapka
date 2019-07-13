module.exports = {
    server: {
        baseUrl: process.env.SERVER_BASE_URL,
        port: process.env.SERVER_PORT,
        secure: true,
        proxy: true
    },
    user: {
        jwtSecret: process.env.JWT_SECRET,
        saltRounds: process.env.SALT_ROUNDS || 10
    },
    email: {
        apiKey: process.env.EMAIL_API_KEY
    },
    recaptcha: {
        apiKey: process.env.RECAPTCHA_API_KEY,
        clientKey: process.env.RECAPTCHA_CLIENT_KEY,
        scoreThreshold: process.env.RECAPTCHA_SCORE_THRESHOLD || 0.5
    },
    twilio: {
        accountSid: process.env.TWILIO_ACCOUNT_SID,
        authToken: process.env.TWILIO_AUTH_TOKEN,
        defaultFrom: process.env.TWILIO_DEFAULT_FROM
    }
};
