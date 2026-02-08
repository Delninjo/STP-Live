import { getIronSession, type IronSessionOptions } from "iron-session";
import { cookies } from "next/headers";

export type SessionUser = {
  id: string;
  email: string;
  displayName: string;
};

export type SessionData = {
  user?: SessionUser;
};

const sessionOptions: IronSessionOptions = {
  cookieName: "stp_live_session",
  password: process.env.SESSION_PASSWORD!, // min 32 chars
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    httpOnly: true,
    path: "/",
  },
};

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), sessionOptions);
}

