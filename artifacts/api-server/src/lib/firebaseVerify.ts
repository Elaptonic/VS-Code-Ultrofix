import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";

const FIREBASE_JWKS_URL =
  "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";

const projectId = process.env.FIREBASE_PROJECT_ID;
if (!projectId) {
  throw new Error(
    "FIREBASE_PROJECT_ID environment variable is required for Firebase token verification.",
  );
}

const issuer = `https://securetoken.google.com/${projectId}`;
const jwks = createRemoteJWKSet(new URL(FIREBASE_JWKS_URL));

export interface FirebaseClaims extends JWTPayload {
  user_id: string;
  phone_number?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
  firebase?: {
    sign_in_provider?: string;
    identities?: Record<string, unknown>;
  };
  auth_time?: number;
}

export async function verifyFirebaseIdToken(
  idToken: string,
): Promise<FirebaseClaims> {
  const { payload } = await jwtVerify(idToken, jwks, {
    issuer,
    audience: projectId,
    algorithms: ["RS256"],
  });

  const claims = payload as FirebaseClaims;
  if (!claims.sub) {
    throw new Error("Firebase token missing subject claim");
  }
  // Normalize: Firebase uses both `sub` and `user_id` for the UID.
  claims.user_id = claims.user_id ?? (claims.sub as string);

  if (typeof claims.auth_time === "number") {
    if (claims.auth_time > Math.floor(Date.now() / 1000)) {
      throw new Error("Firebase token auth_time is in the future");
    }
  }

  return claims;
}
