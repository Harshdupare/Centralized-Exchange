import { NextResponse } from "next/server";
import { client } from "../../../lib/twilio";
import prisma from "@repo/db";
import { randomInt } from "crypto";


export async function POST(req: Request) {
  const { phoneNumber }: { phoneNumber: string } = await req.json();

  if (!phoneNumber) return NextResponse.json({ error: "Missing Phone number" }, { status: 400 });

  const code = randomInt(10000, 99999).toString();

  const user = await prisma.user.findUnique({
    where: {
      phoneNumber
    }
  })

  if (!user) return NextResponse.json({ error: `User not found with phone number : ${phoneNumber}` }, { status: 404 });

  await prisma.oTP.create({
    data: {
      phoneNumber,
      code,
      userId: user?.id,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000)
    },
  });

  await client.messages.create({
    to: phoneNumber,
    from: process.env.TWILIO_PHONE_NUMBER,
    body: `Your code is {code}`
  });

  return NextResponse.json({ success: true });
}
