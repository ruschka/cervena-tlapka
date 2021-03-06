"use strict";

import mongoose from "mongoose";

const passwordResetSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    passwordResetHash: {
        type: String,
        required: true
    },
    createdDate: {
        type: Date,
        required: true
    }
});

passwordResetSchema.index({ createdDate: 1 }, { expireAfterSeconds: 60 * 60 });
passwordResetSchema.index({ passwordResetHash: 1 });

export const PasswordReset = mongoose.model(
    "PasswordReset",
    passwordResetSchema,
    "user.password-reset"
);
