// lib/auth.ts
import { authOptions } from "./authOptions";
import { getServerSession as getServerSessionInner } from "next-auth";

export async function getServerSession() {
  return await getServerSessionInner(authOptions);
}

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string;
      email?: string;
      image?: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
  }
}