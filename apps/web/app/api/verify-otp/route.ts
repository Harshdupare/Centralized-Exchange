import { NextResponse } from "next/server";
import prisma from "@repo/db";

import {
  RecaptchaVerifier,
  ConfirmationResult,
} from "firebase/auth";

declare global {
  interface Window {
    recaptchaVerifier: RecaptchaVerifier;
    confirmationResult: ConfirmationResult;
  }
}

export async function POST(req: Request) {
  const { phoneNumber, code }: { phoneNumber: string, code: string } = await req.json();

  if (!phoneNumber || !code) {
    return NextResponse.json({ error: "phoneNumber or code is missing" }, { status: 404 });
  }

  const result = await window.confirmationResult.confirm(code);

  if (!result) {
    return NextResponse.json({ error: "code is invalid or expired" }, { status: 500 });
  }

  let user = await prisma.user.findUnique({
    where: { phoneNumber }
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        phoneNumber,
        balance: 0
      }
    });
  }

  // const otp = await prisma.oTP.create({
  //   data: {
  //     phoneNumber,
  //     code,
  //     userId: user.id,
  //     expiresAt: new Date(Date.now() + 5 * 60 * 1000)
  //   }
  // })

  // await prisma.oTP.update({
  //   where: { id: otp.id },
  //   data: { isVerified: true }
  // })

  return NextResponse.json({ success: true, userId: user.id });

}
