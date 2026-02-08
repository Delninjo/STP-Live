import { getIronSession, IronSessionOptions } from "iron-session";
import { cookies } from "next/headers";

export type SessionUser = {
  id: string;
  email: string;
  displayName: string;
};

export type SessionData = {
  user?: SessionUser;
};

export const sessionOptions: IronSessionOptions = {
  cookieName: "stp_live_session",
  password: process.env.SESSION_PASSWORD as string,
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    httpOnly: true,
    path: "/",
  },
};

export async function getSession() {
  // iron-session radi s Next cookies() u App Routeru
  return getIronSession<SessionData>(cookies(), sessionOptions);
}
