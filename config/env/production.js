module.exports = {
    server: {
        baseUrl: process.env.SERVER_BASE_URL,
        port: process.env.SERVER_PORT,
        secure: false
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
    }
};
