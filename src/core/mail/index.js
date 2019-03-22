"use strict";

import Email from "email-templates";
import nodemailer from "nodemailer";
import nodemailerSparkpostTransport from "nodemailer-sparkpost-transport";
import path from "path";
import config from "../config";

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
    send: true,
    transport: transporter
});

export async function sendMail(templateName, templateParams, to) {
    return email.send({
        template: templateName,
        message: {
            to: to
        },
        locals: enrichTemplateParams(templateParams)
    });
}

function enrichTemplateParams(templateParams) {
    return Object.assign(templateParams, { baseUrl: config.server.baseUrl });
}
