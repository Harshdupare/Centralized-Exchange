import { NextResponse } from "next/server";
import prisma from "@repo/db";


export async function POST(req: Request) {
  const { phoneNumber, code }: { phoneNumber: string, code: string } = await req.json();

  if (!phoneNumber || !code) {
    return NextResponse.json({ error: "phoneNumber or code is missing" }, { status: 404 });
  }

  const otp = await prisma.oTP.findFirst({
    where: {
      phoneNumber,
      code,
      isVerified: false,
      expiresAt: { gt: new Date() }
    },
    orderBy: { createdAt: "desc" }
  })

  if (!otp) {
    return NextResponse.json({ error: "code is invalid or expired" }, { status: 500 });
  }

  await prisma.oTP.update({
    where: { id: otp.id },
    data: { isVerified: true }
  })

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

  return NextResponse.json({ success: true, userId: user.id });

}
