"use strict";

import mongoose from "mongoose";

const donorApplicationSchema = new mongoose.Schema({
    applicantEmail: {
        type: String,
        required: [true, "Email je povinný."]
    },
    applicantName: {
        type: String,
        required: [true, "Jméno je povinné."]
    },
    applicantMessage: {
        type: String,
        required: [true, "Zpráva je povinná."]
    },
    donorRegistrationId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId
    },
    createdDate: {
        type: Date,
        required: true
    }
});

export const DonorApplication = mongoose.model(
    "DonorApplication",
    donorApplicationSchema,
    "donor-application"
);
