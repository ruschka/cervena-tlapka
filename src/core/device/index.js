"use strict";
import parser from "ua-parser-js";

export function detectDevice(ctx, next) {
    ctx.state.userAgent = parser(ctx.request.headers["user-agent"]);
    return next();
}
