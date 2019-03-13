"use strict";

import mongoose from "mongoose";

const zipSchema = new mongoose.Schema({
    zip: String,
    city: String,
    coordinates: [Number]
});

export const Zip = mongoose.model("Zip", zipSchema, "zip");
