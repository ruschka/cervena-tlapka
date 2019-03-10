'use strict';

import mongoose from 'mongoose';

const donorRegistrationSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    weight: {
        type: Number,
        required: true,
        min: 1,
        max: 150
    },
    birthYear: {
        type: Number,
        required: true
    },
    sex: {
        type: String,
        required: true,
        match: /[MF]/
    },
    breed: {
        type: String,
        required: true
    }
});

export const DonorRegistration = mongoose.model('DonorRegistration', donorRegistrationSchema, 'donor-registration');
