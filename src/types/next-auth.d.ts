import "next-auth";

declare module "next-auth" {
  interface User {
    role?: string;
    mustChangePassword?: boolean;
    encryptedMasterKey?: string;
    masterKeySalt?: string;
    masterKeyIv?: string;
    encryptedMasterKeyPin?: string;
    masterKeyPinSalt?: string;
    masterKeyPinIv?: string;
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
      encryptedMasterKeyPin?: string;
      masterKeyPinSalt?: string;
      masterKeyPinIv?: string;
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
    encryptedMasterKeyPin?: string;
    masterKeyPinSalt?: string;
    masterKeyPinIv?: string;
  }
}
