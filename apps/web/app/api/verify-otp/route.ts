import { NextResponse } from "next/server";
import prisma from "@repo/db";


export async function POST(req: Request) {
  const { phoneNumber, code }: { phoneNumber: string, code: string } = await req.json();

  if (!phoneNumber || !code) {
    return NextResponse.json({ error: "phoneNumber or code is missing" }, { status: 404 });
  }


  const user = await prisma.user.upsert({
    where: {
      phoneNumber
    },
    update: {},
    create: {
      phoneNumber,
      balance: 0
    }
  });
  //const otp = await prisma.oTP.create({
  //  data: {
  //    phoneNumber,
  //    code,
  //    userId: user.id,
  //    expiresAt: new Date(Date.now() + 5 * 60 * 1000)
  //  }
  // })

  // await prisma.oTP.update({
  //   where: { id: otp.id },
  //   data: { isVerified: true }
  // })

  return NextResponse.json({ success: true, userId: user.id });

}
