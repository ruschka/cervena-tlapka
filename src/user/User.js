"use strict";

import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: [true, "Email je povinný."]
    },
    passwordHash: {
        type: String,
        required: true
    },
    registerDate: {
        type: Date,
        required: true
    },
    activated: {
        type: Boolean,
        required: true
    },
    activateDate: Date,
    activateHash: String,
    lastLogin: Date,
    zip: {
        type: String,
        required: [true, "PSČ je povinné."]
    }
});

export const User = mongoose.model("User", userSchema, "user");
