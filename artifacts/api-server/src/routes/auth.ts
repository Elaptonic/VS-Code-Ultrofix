import { Router, type IRouter, type Request, type Response } from "express";
import {
  GetCurrentAuthUserResponse,
  VerifyFirebaseIdTokenBody,
  VerifyFirebaseIdTokenResponse,
  LogoutSessionResponse,
  SetUserRoleBody,
  SetUserRoleResponse,
} from "@workspace/api-zod";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  clearSession,
  getSessionId,
  createSession,
  deleteSession,
  getSession,
  updateSession,
  type SessionData,
} from "../lib/auth";
import { verifyFirebaseIdToken, type FirebaseClaims } from "../lib/firebaseVerify";

const router: IRouter = Router();

async function upsertUserFromFirebase(claims: FirebaseClaims) {
  const userId = claims.user_id;
  const phoneNumber = claims.phone_number ?? null;
  const email = claims.email ?? null;
  const profileImageUrl = (claims.picture as string | undefined) ?? null;

  // First, try to find by phone number to avoid duplicates if a user re-auths
  // with the same phone but a different Firebase project mapping.
  let existing: { id: string } | undefined;
  if (phoneNumber) {
    const [row] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.phoneNumber, phoneNumber));
    existing = row;
  }

  const targetId = existing?.id ?? userId;

  const [user] = await db
    .insert(usersTable)
    .values({
      id: targetId,
      phoneNumber,
      email,
      profileImageUrl,
    })
    .onConflictDoUpdate({
      target: usersTable.id,
      set: {
        phoneNumber,
        email,
        profileImageUrl,
        updatedAt: new Date(),
      },
    })
    .returning();
  return user;
}

router.get("/auth/user", (req: Request, res: Response) => {
  // Disable HTTP caching for the current-user endpoint. Without this Express
  // computes an ETag, and a subsequent request that matches gets a bare 304
  // (no body). React Native's fetch on Android doesn't transparently serve
  // the cached body for 304s, so the client would parse an empty response,
  // see `data.user === undefined`, treat the user as logged out, and bounce
  // back to the login screen right after a successful OTP verify.
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.json(
    GetCurrentAuthUserResponse.parse({
      user: req.isAuthenticated() ? req.user : null,
    }),
  );
});

router.post("/auth/firebase-verify", async (req: Request, res: Response) => {
  const parsed = VerifyFirebaseIdTokenBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Missing or invalid idToken" });
    return;
  }

  let claims: FirebaseClaims;
  try {
    claims = await verifyFirebaseIdToken(parsed.data.idToken);
  } catch (err) {
    req.log.error({ err }, "Firebase ID token verification failed");
    res.status(401).json({ error: "Invalid Firebase ID token" });
    return;
  }

  const dbUser = await upsertUserFromFirebase(claims);

  const sessionData: SessionData = {
    user: {
      id: dbUser.id,
      phoneNumber: dbUser.phoneNumber,
      email: dbUser.email,
      firstName: dbUser.firstName,
      lastName: dbUser.lastName,
      profileImageUrl: dbUser.profileImageUrl,
      role: dbUser.role ?? null,
    },
    firebase_uid: claims.user_id,
    issued_at: Math.floor(Date.now() / 1000),
  };

  const sid = await createSession(sessionData);
  res.json(
    VerifyFirebaseIdTokenResponse.parse({
      token: sid,
      user: sessionData.user,
    }),
  );
});

router.post("/auth/logout", async (req: Request, res: Response) => {
  const sid = getSessionId(req);
  if (sid) {
    await deleteSession(sid);
  }
  await clearSession(res);
  res.json(LogoutSessionResponse.parse({ success: true }));
});

router.patch("/auth/role", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsed = SetUserRoleBody.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: "Invalid role. Must be 'consumer' or 'provider'" });
    return;
  }

  const { role } = parsed.data;

  const [updated] = await db
    .update(usersTable)
    .set({ role, updatedAt: new Date() })
    .where(eq(usersTable.id, req.user.id))
    .returning();

  const sid = getSessionId(req);
  if (sid) {
    const session = await getSession(sid);
    if (session) {
      session.user = {
        ...session.user,
        role,
      };
      await updateSession(sid, session);
    }
  }

  res.json(
    SetUserRoleResponse.parse({
      user: {
        id: updated.id,
        phoneNumber: updated.phoneNumber,
        email: updated.email,
        firstName: updated.firstName,
        lastName: updated.lastName,
        profileImageUrl: updated.profileImageUrl,
        role: updated.role,
      },
    }),
  );
});

export default router;
