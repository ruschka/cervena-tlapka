const defaultConfig = require("./default.js");
const envConfig = require(`./env/${process.env.NODE_ENV}.js`);

module.exports = {
    defaultConfig,
    envConfig
};
