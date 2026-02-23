import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;

        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) return null;

        if (!user.emailVerified) {
          throw new Error("Please verify your email before signing in");
        }

        return {
          id: user.id,
          email: user.email,
          role: user.role,
          mustChangePassword: user.mustChangePassword,
          encryptedMasterKey: user.encryptedMasterKey,
          masterKeySalt: user.masterKeySalt,
          masterKeyIv: user.masterKeyIv,
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = (user.role as string) || "user";
        token.mustChangePassword = user.mustChangePassword ?? false;
        token.encryptedMasterKey = user.encryptedMasterKey as string;
        token.masterKeySalt = user.masterKeySalt as string;
        token.masterKeyIv = user.masterKeyIv as string;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as string;
      session.user.mustChangePassword = token.mustChangePassword as boolean;
      session.user.encryptedMasterKey = token.encryptedMasterKey as string;
      session.user.masterKeySalt = token.masterKeySalt as string;
      session.user.masterKeyIv = token.masterKeyIv as string;
      return session;
    },
  },
});
