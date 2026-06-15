import { Platform } from "react-native";
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type Auth,
  type ConfirmationResult,
  type UserCredential,
} from "firebase/auth";

export const firebaseConfig = {
  apiKey: "AIzaSyBdqFqB0o-wWO-pL5w6yvpMVjV697BBmEo",
  authDomain: "ultrofix-e5ed6.firebaseapp.com",
  projectId: "ultrofix-e5ed6",
  storageBucket: "ultrofix-e5ed6.firebasestorage.app",
  messagingSenderId: "1015159560629",
  appId: "1:1015159560629:web:0000000000000000000000",
};

const HAS_DOM =
  typeof window !== "undefined" && typeof document !== "undefined";
const IS_BROWSER = Platform.OS === "web" && HAS_DOM;

let app: FirebaseApp | null = null;
let webAuth: Auth | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (!app) {
    app = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);
  }
  return app;
}

export function getWebAuth(): Auth {
  if (!webAuth) {
    webAuth = getAuth(getFirebaseApp());
    try {
      webAuth.useDeviceLanguage();
    } catch {
      // useDeviceLanguage may be a no-op outside the browser
    }
    // In development, allow phone numbers added to Firebase Console under
    // Authentication → Sign-in method → Phone → "Phone numbers for testing"
    // to bypass real SMS and the reCAPTCHA challenge. The static OTP code
    // configured for that number in the console is what the user enters.
    if (process.env.NODE_ENV !== "production" && IS_BROWSER) {
      try {
        webAuth.settings.appVerificationDisabledForTesting = true;
      } catch {
        // ignore
      }
    }
  }
  return webAuth;
}

export const RECAPTCHA_CONTAINER_ID = "firebase-recaptcha-container";

let recaptchaVerifier: RecaptchaVerifier | null = null;

function ensureBrowserRecaptcha(): RecaptchaVerifier {
  if (!HAS_DOM) {
    throw new Error("Browser environment is required for reCAPTCHA.");
  }

  let container = document.getElementById(RECAPTCHA_CONTAINER_ID);
  if (!container) {
    container = document.createElement("div");
    container.id = RECAPTCHA_CONTAINER_ID;
    container.style.position = "fixed";
    container.style.bottom = "16px";
    container.style.right = "16px";
    container.style.zIndex = "9999";
    document.body.appendChild(container);
  }

  if (!recaptchaVerifier) {
    recaptchaVerifier = new RecaptchaVerifier(getWebAuth(), container, {
      size: "invisible",
    });
  }
  return recaptchaVerifier;
}

// ---------------------------------------------------------------------------
// REST-based phone-auth flow for React Native (Expo Go).
//
// Firebase's JS SDK `signInWithPhoneNumber` requires a verifier object that
// implements internal methods (`_reset`, `_initialize`, …). On React Native we
// don't have a real DOM-backed RecaptchaVerifier, and a stubbed object trips
// the SDK's internals. To avoid that entire surface, we call Firebase's
// Identity Toolkit REST API directly. This works with phone numbers added
// under Firebase Console → Authentication → Phone → "Phone numbers for
// testing" without sending real SMS, and with real numbers when the project
// is configured for Phone Auth.
// ---------------------------------------------------------------------------

const IDENTITY_TOOLKIT = "https://identitytoolkit.googleapis.com/v1";

interface RestSendVerificationCodeResponse {
  sessionInfo?: string;
  error?: { message?: string; code?: number };
}

interface RestSignInResponse {
  idToken?: string;
  refreshToken?: string;
  localId?: string;
  isNewUser?: boolean;
  error?: { message?: string; code?: number };
}

async function restSendVerificationCode(
  phoneNumberE164: string,
): Promise<string> {
  const url = `${IDENTITY_TOOLKIT}/accounts:sendVerificationCode?key=${encodeURIComponent(
    firebaseConfig.apiKey,
  )}`;
  const body = {
    phoneNumber: phoneNumberE164,
    // Test phone numbers in Firebase Console accept any (or empty) recaptcha
    // token. Real numbers would need a real reCAPTCHA Enterprise token here,
    // which Expo Go can't produce — that's why Expo Go is test-numbers only.
    recaptchaToken: "expo-go-test-token",
  };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const data: RestSendVerificationCodeResponse = await res.json();
    if (!res.ok || !data.sessionInfo) {
      const code = data.error?.message ?? `HTTP ${res.status}`;
      throw new Error(translateRestError(code));
    }
    return data.sessionInfo;
  } catch (err: any) {
    if (err?.name === "AbortError") {
      throw new Error("Network request timed out. Check your connection and try again.");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

async function restSignInWithVerificationCode(
  sessionInfo: string,
  code: string,
): Promise<{ idToken: string }> {
  const url = `${IDENTITY_TOOLKIT}/accounts:signInWithPhoneNumber?key=${encodeURIComponent(
    firebaseConfig.apiKey,
  )}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionInfo, code }),
      signal: controller.signal,
    });
    const data: RestSignInResponse = await res.json();
    if (!res.ok || !data.idToken) {
      const errCode = data.error?.message ?? `HTTP ${res.status}`;
      throw new Error(translateRestError(errCode));
    }
    return { idToken: data.idToken };
  } catch (err: any) {
    if (err?.name === "AbortError") {
      throw new Error("Network request timed out. Check your connection and try again.");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

function translateRestError(code: string): string {
  // Firebase REST error message codes are uppercase strings like
  // CAPTCHA_CHECK_FAILED, INVALID_PHONE_NUMBER, INVALID_CODE, etc.
  const upper = code.toUpperCase();
  if (upper.includes("CAPTCHA")) {
    return "This phone number isn't whitelisted as a test number. In Firebase Console → Authentication → Sign-in method → Phone → 'Phone numbers for testing', add your number with a static code, then try again.";
  }
  if (upper.includes("INVALID_PHONE_NUMBER")) {
    return "That phone number doesn't look right. Use international format, e.g. +919876543210.";
  }
  if (upper.includes("MISSING_PHONE_NUMBER")) {
    return "Please enter a phone number.";
  }
  if (upper.includes("QUOTA_EXCEEDED")) {
    return "Daily SMS quota exceeded for this Firebase project.";
  }
  if (upper.includes("TOO_MANY_ATTEMPTS")) {
    return "Too many OTP attempts from this device. Try again in a little while.";
  }
  if (upper.includes("INVALID_CODE")) {
    return "That code is incorrect. Please try again.";
  }
  if (upper.includes("CODE_EXPIRED") || upper.includes("SESSION_EXPIRED")) {
    return "That code has expired. Tap Resend to get a new one.";
  }
  if (upper.includes("MISSING_CODE")) {
    return "Please enter the verification code.";
  }
  if (upper.includes("BILLING_NOT_ENABLED")) {
    return "Phone Auth is disabled because your Firebase project is on the free Spark plan. Go to Firebase Console → Project Settings → Usage & Billing → Upgrade to Blaze plan, then wait 2 minutes and try again.";
  }
  return `Firebase: ${code}`;
}

// A ConfirmationResult-shaped object returned from `webSendOtp` on RN. It
// matches the JS SDK's `ConfirmationResult` shape closely enough that the
// existing auth-context code can call `.confirm(code)` and then read the
// resulting user's `.getIdToken()` without branching by platform.
type RestConfirmation = {
  verificationId: string;
  confirm: (code: string) => Promise<UserCredential>;
};

function makeRestConfirmation(sessionInfo: string): RestConfirmation {
  return {
    verificationId: sessionInfo,
    confirm: async (code: string) => {
      const { idToken } = await restSignInWithVerificationCode(
        sessionInfo,
        code,
      );
      // Return a UserCredential-compatible shape so auth.tsx can call
      // `credential.user.getIdToken()` uniformly.
      return {
        user: {
          getIdToken: async () => idToken,
        },
      } as unknown as UserCredential;
    },
  };
}

export async function webSendOtp(
  phoneNumberE164: string,
): Promise<ConfirmationResult> {
  // React Native (Expo Go) → REST API path.
  if (!IS_BROWSER) {
    const sessionInfo = await restSendVerificationCode(phoneNumberE164);
    return makeRestConfirmation(sessionInfo) as unknown as ConfirmationResult;
  }

  // Browser → SDK + invisible reCAPTCHA.
  const verifier = ensureBrowserRecaptcha();
  try {
    return await signInWithPhoneNumber(
      getWebAuth(),
      phoneNumberE164,
      verifier,
    );
  } catch (err: any) {
    console.error("[firebaseWeb] signInWithPhoneNumber failed:", {
      code: err?.code,
      message: err?.message,
    });
    try {
      recaptchaVerifier?.clear();
    } catch {
      // ignore
    }
    recaptchaVerifier = null;
    const code: string | undefined = err?.code;
    if (
      code === "auth/invalid-app-credential" ||
      code === "auth/captcha-check-failed"
    ) {
      throw new Error(
        "This domain isn't authorized in Firebase. Add the current preview domain under Firebase Console → Authentication → Settings → Authorized domains.",
      );
    }
    if (code === "auth/invalid-phone-number") {
      throw new Error(
        "That phone number doesn't look right. Use the full international format, e.g. +919876543210.",
      );
    }
    if (code === "auth/too-many-requests") {
      throw new Error(
        "Too many OTP attempts from this device. Try again in a little while.",
      );
    }
    if (code === "auth/quota-exceeded") {
      throw new Error("Daily SMS quota exceeded for this Firebase project.");
    }
    if (code === "auth/billing-not-enabled") {
      throw new Error(
        "Phone Auth requires the Blaze (pay-as-you-go) plan in this Firebase project.",
      );
    }
    throw err instanceof Error ? err : new Error(String(err));
  }
}

export function resetWebRecaptcha() {
  try {
    recaptchaVerifier?.clear();
  } catch {
    // ignore
  }
  recaptchaVerifier = null;
}
