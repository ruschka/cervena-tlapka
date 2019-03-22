module.exports = {
    server: {
        baseUrl: "https://www.cervenatlapka.cz",
        port: 80
    },
    user: {
        jwtSecret: process.env.JWT_SECRET,
        saltRounds: process.env.SALT_ROUNDS | 10
    },
    email: {
        apiKey: process.env.EMAIL_API_KEY
    }
};
