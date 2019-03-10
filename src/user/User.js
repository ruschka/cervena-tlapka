"use strict";

import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    email: String,
    passwordHash: String
});

export const User = mongoose.model("User", userSchema, "user");
