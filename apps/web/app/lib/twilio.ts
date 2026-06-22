import twilio from "twilio";

const accountSid = process.env.TWILIO_SID;
const accountToken = process.env.TWILIO_AUTH_TOKEN;

export const client = twilio(accountSid, accountToken);


