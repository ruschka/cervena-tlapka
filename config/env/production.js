module.exports = {
    server: {
        baseUrl: "https://www.cervenatlapka.cz",
        port: process.env.SERVER_PORT
    },
    user: {
        jwtSecret: process.env.JWT_SECRET,
        saltRounds: process.env.SALT_ROUNDS | 10
    },
    email: {
        apiKey: process.env.EMAIL_API_KEY
    },
    recaptcha: {
        apiKey: process.env.RECAPTCHA_API_KEY,
        clientKey: process.env.RECAPTCHA_CLIENT_KEY
    }
};
