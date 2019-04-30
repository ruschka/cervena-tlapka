"use strict";

import mongoose from "mongoose";
import { emailRegex } from "../core/mail";

const userSchema = new mongoose.Schema({
    // lower case email
    email: {
        type: String,
        validate: {
            validator: function(v) {
                return emailRegex.test(v);
            },
            message: props => "Email není validní."
        },
        required: [true, "Email je povinný."]
    },
    // how user entered it in registration
    // this should be used to send emails
    originalEmail: {
        type: String,
        required: true
    },
    passwordHash: {
        type: String,
        required: true
    },
    agreements: {
        privacyPolicy: {
            type: Boolean,
            required: true
        },
        newsletter: {
            type: Boolean,
            required: true
        }
    },
    firstName: String,
    surname: String,
    street: String,
    city: String,
    zip: {
        type: String,
        required: [true, "PSČ je povinné."]
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
    lastLogin: Date
});

userSchema.index({ email: 1, activateHash: 1 });

export const User = mongoose.model("User", userSchema, "user");
