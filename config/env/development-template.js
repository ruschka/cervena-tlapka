module.exports = {
    server: {
        baseUrl: "http://localhost:3000",
        port: 3000,
        secure: false,
        proxy: false
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
    },
    twilio: {
        accountSid: "changeme",
        authToken: "changeme",
        // test twilio number
        defaultFrom: "+15005550006"
    }
};
