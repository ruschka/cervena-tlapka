"use strict";

import mongoose from "mongoose";

const zipSchema = new mongoose.Schema({
    zip: String,
    district: String,
    region: String,
    coordinates: [Number]
});

zipSchema.index({ zip: 1 });

export const Zip = mongoose.model("Zip", zipSchema, "zip");
