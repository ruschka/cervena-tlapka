module.exports = {
    server: {
        baseUrl: "http://localhost:3000",
        port: 3000
    },
    user: {
        jwtSecret: "changeme",
        saltRounds: 10
    },
    email: {
        apiKey: "changeme"
    },
    recaptcha: {
        apiKey: "changeme",
        clientKey: "changeme"
    }
};
