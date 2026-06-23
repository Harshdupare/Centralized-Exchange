import { NextResponse } from "next/server";
import { auth } from "../../lib/firebase";
import { signInWithPhoneNumber } from "firebase/auth";
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
  try {
    const { phoneNumber }: { phoneNumber: string } = await req.json();

    if (!phoneNumber) {
      return NextResponse.json({ error: "Missing Phone number" }, { status: 400 });
    }

    const result = await signInWithPhoneNumber(
      auth,
      phoneNumber,
      window.recaptchaVerifier
    )

    return NextResponse.json(
      { success: true, body: result }
    );

  } catch (error) {
    console.error("request-otp error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
