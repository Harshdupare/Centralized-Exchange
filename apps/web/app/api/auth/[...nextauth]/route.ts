import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "@repo/db";


const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Phone",
      credentials: {
        phoneNumber: { lable: "Phone", type: "text" }
      },
      async authorize(credentials: any) {
        let phone = credentials?.phoneNumber;
        if (!phone) return null;


        let otp = await prisma.oTP.findFirst({
          where: {
            phoneNumber: phone,
            isVerified: true,
            expiresAt: { gt: new Date() }
          },
          orderBy: { createdAt: "desc" }
        });

        if (!otp) return null;

        // auth bypass for demo purpose

        if (phone == "0000") {
          return {
            id: "demoUser1",
            phoneNumber: "0000",
            balance: 100000
          };
        }

        if (phone == "12345") {
          return {
            id: "demoUser2",
            phoneNumber: "12345",
            balance: 100000
          };
        }

        const user = await prisma.user.findFirst({
          where: { phoneNumber: phone }
        });

        if (!user) return null;

        return user ? { id: user.id, phoneNumber: user.phoneNumber, balance: user.balance } : null;
      }
    })
  ],

  pages: {
    signIn: "/auth"
  },

  session: {
    strategy: "jwt"
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.phoneNumber = user.phoneNumber;
        token.balance = user.balance;
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id;
        session.user.phoneNumber = token.phoneNumber;
        session.user.balance = token.balance;
      }

      return session;
    }
  },

  secret: process.env.NEXTAUTH_SECRET


});

export { handler as GET, handler as POST };






