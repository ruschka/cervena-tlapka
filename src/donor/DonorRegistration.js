"use strict";

import mongoose from "mongoose";

const donorRegistrationSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Jméno je povinné."],
        trim: true
    },
    weight: {
        type: Number,
        required: [true, "Hmotnost je povinná."],
        min: [20, "Minimální hmotnost je 20 kg."],
        max: [150, "Maximální hmotnost je 150 kg."]
    },
    birthYear: {
        type: Number,
        required: [true, "Rok narození je povinný."]
    },
    sex: {
        type: String,
        required: [true, "Pohlaví je povinné."],
        match: /[MF]/
    },
    breed: {
        type: String,
        required: [true, "Plemeno je povinné."]
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: [true, "Uživatel je povinný."]
    },
    zip: {
        type: String,
        required: true
    },
    district: {
        type: String,
        required: true
    },
    location: {
        type: {
            type: String,
            default: "Point",
            enum: ["Point"]
        },
        coordinates: {
            type: [Number],
            default: [0, 0]
        }
    },
    note: {
        type: String,
        maxlength: [250, "Maximání délka poznámky je 250 znaků."]
    },
    phoneFilledIn: Boolean,
    registerDate: {
        type: Date,
        required: true
    },
    modifyDate: {
        type: Date,
        required: true
    }
});

donorRegistrationSchema.index({ location: "2dsphere" });
donorRegistrationSchema.index({ userId: 1 });

export const DonorRegistration = mongoose.model(
    "DonorRegistration",
    donorRegistrationSchema,
    "donor-registration"
);
