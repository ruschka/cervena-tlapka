const mongoose = require('mongoose');

const donorRegistrationSchema = new mongoose.Schema({
    name: String,
    weight: Number,
    birthYear: Number,
    sex: String,
    breed: String
});

const DonorRegistration = mongoose.model('DonorRegistration', donorRegistrationSchema, 'donor-registration');

module.exports = DonorRegistration;
