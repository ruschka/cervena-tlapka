module.exports = {
    server: {
        baseUrl: "http://localhost:3000",
        port: 3000,
        secure: false
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
        clientKey: "changeme",
        scoreThreshold: 0.5
    }
};
