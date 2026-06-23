import NextAuth from "next-auth";
import {
  RecaptchaVerifier,
  ConfirmationResult,
} from "firebase/auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      phoneNumber: string
      balance: number
      name?: string | null
      email?: string | null
      image?: string | null
    }
  }

  interface User {
    id: string
    phoneNumber: string
    balance: number
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    phoneNumber: string
    balance: number
  }
}


declare global {
  interface Window {
    recaptchaVerifier: RecaptchaVerifier;
    confirmationResult: ConfirmationResult;
  }
}

