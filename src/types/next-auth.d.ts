import "next-auth";

declare module "next-auth" {
  interface User {
    role?: string;
    mustChangePassword?: boolean;
    encryptedMasterKey?: string;
    masterKeySalt?: string;
    masterKeyIv?: string;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      role: string;
      mustChangePassword: boolean;
      encryptedMasterKey: string;
      masterKeySalt: string;
      masterKeyIv: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    mustChangePassword: boolean;
    encryptedMasterKey: string;
    masterKeySalt: string;
    masterKeyIv: string;
  }
}
