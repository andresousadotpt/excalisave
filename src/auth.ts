import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { hashEmail, serverDecrypt } from "@/lib/server-crypto";

class EmailNotVerified extends CredentialsSignin {
  code = "email_not_verified";
}

class AccountBanned extends CredentialsSignin {
  code = "account_banned";
}

class AccountNotSetup extends CredentialsSignin {
  code = "account_not_setup";
}

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

        if (!email || !password) {
          console.warn("[auth] Missing email or password in credentials");
          return null;
        }

        const emailH = hashEmail(email);
        const user = await prisma.user.findUnique({
          where: { emailHash: emailH },
        });

        if (!user) {
          console.warn(`[auth] No user found for email hash ${emailH.slice(0, 8)}...`);
          return null;
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
          console.warn(`[auth] Invalid password for user ${user.id}`);
          return null;
        }

        if (!user.emailVerified) {
          console.warn(`[auth] Unverified email for user ${user.id}`);
          throw new EmailNotVerified();
        }

        if (user.banned) {
          console.warn(`[auth] Banned user ${user.id} attempted login`);
          throw new AccountBanned();
        }

        if (user.inviteToken) {
          console.warn(`[auth] User ${user.id} hasn't accepted invite yet`);
          throw new AccountNotSetup();
        }

        const decryptedEmail = serverDecrypt(user.encryptedEmail);

        console.log(`[auth] User ${user.id} authenticated (role: ${user.role})`);

        return {
          id: user.id,
          email: decryptedEmail,
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
