"use strict";

import Email from "email-templates";
import nodemailer from "nodemailer";
import nodemailerSparkpostTransport from "nodemailer-sparkpost-transport";
import path from "path";
import config from "../config";

// eslint-disable-next-line no-useless-escape
export const emailRegex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

const transporter = nodemailer.createTransport(
    nodemailerSparkpostTransport({
        sparkPostApiKey: config.email.apiKey
    })
);
const root = path.join(__dirname, "../../..", "mail-templates");
const email = new Email({
    views: { root: root },
    message: {
        from: config.email.defaultFrom
    },
    //send: true,
    transport: transporter
});

export async function sendMail(templateName, templateParams, to, replyTo) {
    const message = { to };
    if (replyTo) {
        Object.assign(message, { replyTo });
    }
    return email.send({
        template: templateName,
        message,
        locals: enrichTemplateParams(templateParams)
    });
}

function enrichTemplateParams(templateParams) {
    return Object.assign(templateParams, { baseUrl: config.server.baseUrl });
}
