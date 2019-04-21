"use strict";

import * as mongoose from "mongoose";

const dogTagOrderSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    donorRegistrationId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    orderState: {
        type: String,
        enum: ["NEW", "EXPORTED", "DISPATCHED"],
        required: true
    },
    firstName: {
        type: String,
        required: true
    },
    surname: {
        type: String,
        required: true
    },
    street: {
        type: String,
        required: true
    },
    city: {
        type: String,
        required: true
    },
    zip: {
        type: String,
        required: true
    },
    createdDate: {
        type: Date,
        required: true
    }
});

dogTagOrderSchema.index(
    { userId: 1, donorRegistrationId: 1 },
    { unique: true, background: true }
);

export const DogTagOrder = mongoose.model(
    "DogTagOrder",
    dogTagOrderSchema,
    "dog-tag-order"
);
