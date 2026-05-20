import { DefaultSession } from "next-auth";
import { Role } from "@/generated/prisma";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      isVerified: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    role: Role;
    isVerified: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    isVerified: boolean;
  }
}
