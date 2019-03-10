'use strict';

import mongoose from 'mongoose';

const donorRegistrationSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Jméno je povinné.'],
        trim: true
    },
    weight: {
        type: Number,
        required: [true, 'Hmotnost je povinná.'],
        min: [1, 'Minimální hmotnost je 1 kg.'],
        max: [150, 'Maximální hmotnost je 150 kg.']
    },
    birthYear: {
        type: Number,
        required: [true, 'Rok narození je povinný.']
    },
    sex: {
        type: String,
        required: [true, 'Pohlaví je povinné.'],
        match: /[MF]/
    },
    breed: {
        type: String,
        required: [true, 'Plemeno je povinné.']
    }
});

export const DonorRegistration = mongoose.model('DonorRegistration', donorRegistrationSchema, 'donor-registration');