import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import * as SecureStore from "expo-secure-store";
import { Alert, Platform } from "react-native";
import { setAuthTokenGetter, setUnauthorizedHandler } from "@workspace/api-client-react";
import type { FirebaseAuthTypes } from "@react-native-firebase/auth";
import type { ConfirmationResult as WebConfirmationResult } from "firebase/auth";
import {
  webSendOtp,
  resetWebRecaptcha,
  getWebAuth,
} from "@/lib/firebaseWeb";

export const AUTH_TOKEN_KEY = "auth_session_token";

type FirebaseAuthFn = () => FirebaseAuthTypes.Module;
let nativeAuth: FirebaseAuthFn | null = null;
if (Platform.OS !== "web") {
  // Try to load the native Firebase module. In Expo Go this throws because the
  // native module is not linked — we just fall back to the Firebase JS SDK.
  try {
    const mod = require("@react-native-firebase/auth");
    // Probe the module: accessing default() will throw "RNFBAppModule not found"
    // in Expo Go, but works in a proper dev build.
    if (typeof mod?.default === "function") {
      mod.default();
      nativeAuth = mod.default as FirebaseAuthFn;
    }
  } catch (err) {
    console.warn(
      "[auth] Native Firebase not available — falling back to JS SDK. " +
        "(This is expected in Expo Go.)",
    );
  }
}

// `USE_JS_SDK` is true on web AND on native when the @react-native-firebase
// module isn't usable (e.g. running in Expo Go).
const USE_JS_SDK = Platform.OS === "web" || !nativeAuth;

if (typeof console !== "undefined") {
  console.log(
    "[auth] Platform.OS=",
    Platform.OS,
    "USE_JS_SDK=",
    USE_JS_SDK,
    "nativeAuth=",
    !!nativeAuth,
  );
}

export type UserRole = "consumer" | "provider" | null;

export interface AuthUser {
  id: string;
  phoneNumber: string | null;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  role: UserRole;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isOtpSending: boolean;
  isOtpVerifying: boolean;
  pendingPhoneNumber: string | null;
  sendOtp: (phoneNumberE164: string) => Promise<void>;
  verifyOtp: (code: string) => Promise<void>;
  cancelOtp: () => void;
  resendOtp: () => Promise<void>;
  logout: () => Promise<void>;
  setRole: (role: "consumer" | "provider") => Promise<void>;
  refreshUser: () => Promise<void>;
  needsOnboarding: boolean;
  onboardingChecked: boolean;
  markOnboardingComplete: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  isOtpSending: false,
  isOtpVerifying: false,
  pendingPhoneNumber: null,
  sendOtp: async () => {},
  verifyOtp: async () => {},
  cancelOtp: () => {},
  resendOtp: async () => {},
  logout: async () => {},
  setRole: async () => {},
  refreshUser: async () => {},
  needsOnboarding: false,
  onboardingChecked: false,
  markOnboardingComplete: () => {},
});

export function getApiBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_DOMAIN) {
    return `https://${process.env.EXPO_PUBLIC_DOMAIN}`;
  }
  if (USE_JS_SDK && typeof window !== "undefined") {
    return window.location.origin;
  }
  return "";
}

setAuthTokenGetter(() => SecureStore.getItemAsync(AUTH_TOKEN_KEY));

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOtpSending, setIsOtpSending] = useState(false);
  const [isOtpVerifying, setIsOtpVerifying] = useState(false);
  const [pendingPhoneNumber, setPendingPhoneNumber] = useState<string | null>(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const nativeConfirmationRef =
    useRef<FirebaseAuthTypes.ConfirmationResult | null>(null);
  const webConfirmationRef = useRef<WebConfirmationResult | null>(null);

  const fetchUser = useCallback(async () => {
    try {
      const apiBase = getApiBaseUrl();
      const token = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
      if (!token) {
        setUser(null);
        setIsLoading(false);
        return;
      }
      const res = await fetch(`${apiBase}/api/auth/user`, {
        headers: {
          Authorization: `Bearer ${token}`,
          // Never serve a cached response for the current-user endpoint —
          // otherwise Android can short-circuit with a stale/empty body and
          // we'd think the session was rejected.
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
        // RN's fetch on Android honours this and bypasses HTTP cache.
        cache: "no-store" as RequestCache,
      });

      // Only treat 401/403 as "session is invalid". For any other non-2xx
      // (network blip, gateway error, transient 304 with no body, …) keep
      // the existing user state and the stored token so we don't bounce
      // the user back to login spuriously.
      if (res.status === 401 || res.status === 403) {
        await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
        setUser(null);
        setIsLoading(false);
        return;
      }
      if (!res.ok) {
        setIsLoading(false);
        return;
      }

      let data: any = null;
      try {
        data = await res.json();
      } catch {
        // Empty body (e.g. 304) — leave the existing user state untouched.
        setIsLoading(false);
        return;
      }

      if (data?.user) {
        setUser({
          id: data.user.id,
          phoneNumber: data.user.phoneNumber ?? null,
          email: data.user.email ?? null,
          firstName: data.user.firstName ?? null,
          lastName: data.user.lastName ?? null,
          profileImageUrl: data.user.profileImageUrl ?? null,
          role: (data.user.role as UserRole) ?? null,
        });
      } else {
        // Server explicitly returned `{ user: null }` → session is gone.
        await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
        setUser(null);
      }
    } catch {
      // Network error — don't tear down the session; just stop loading.
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    setIsLoading(true);
    await fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // Any API call made through the generated React Query hooks that comes
  // back 401 means the session is missing/expired — log out app-wide so
  // AuthGate redirects to /login, without every screen needing its own check.
  useEffect(() => {
    setUnauthorizedHandler(async () => {
      await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
      setUser(null);
      Alert.alert("Session expired", "Please log in again.");
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  useEffect(() => {
    if (!user) {
      setOnboardingChecked(false);
      setNeedsOnboarding(false);
      return;
    }
    if (user.role !== "provider" || onboardingChecked) return;
    const apiBase = getApiBaseUrl();
    const checkOnboarding = async () => {
      let complete = false;
      try {
        let token: string | null = null;
        try { token = await SecureStore.getItemAsync(AUTH_TOKEN_KEY); } catch {}
        const res = await fetch(`${apiBase}/api/onboarding/provider/status`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          complete = !!data.onboardingComplete;
        }
      } catch {
        complete = false;
      }
      setNeedsOnboarding(!complete);
      setOnboardingChecked(true);
    };
    checkOnboarding();
  }, [user?.id, user?.role, onboardingChecked]);

  const markOnboardingComplete = useCallback(() => {
    setNeedsOnboarding(false);
    setOnboardingChecked(true);
  }, []);

  const exchangeFirebaseToken = useCallback(
    async (idToken: string) => {
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/api/auth/firebase-verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? "Server rejected verification");
      }
      const data = await res.json();
      if (!data?.token) throw new Error("Server did not return a session token");
      await SecureStore.setItemAsync(AUTH_TOKEN_KEY, data.token);
      setIsLoading(true);
      await fetchUser();
    },
    [fetchUser],
  );

  const sendOtp = useCallback(async (phoneNumberE164: string) => {
    setIsOtpSending(true);
    // Safety net: never leave the spinner stuck on if the promise hangs.
    const safety = setTimeout(() => setIsOtpSending(false), 15_000);
    try {
      if (USE_JS_SDK) {
        const confirmation = await webSendOtp(phoneNumberE164);
        webConfirmationRef.current = confirmation;
        setPendingPhoneNumber(phoneNumberE164);
        return;
      }
      if (!nativeAuth) {
        throw new Error(
          "Phone sign-in requires a native build with Firebase configured.",
        );
      }
      const confirmation = await nativeAuth().signInWithPhoneNumber(
        phoneNumberE164,
        true,
      );
      nativeConfirmationRef.current = confirmation;
      setPendingPhoneNumber(phoneNumberE164);
    } finally {
      clearTimeout(safety);
      setIsOtpSending(false);
    }
  }, []);

  const resendOtp = useCallback(async () => {
    if (!pendingPhoneNumber) return;
    setIsOtpSending(true);
    const safety = setTimeout(() => setIsOtpSending(false), 15_000);
    try {
      if (USE_JS_SDK) {
        // Reset reCAPTCHA between attempts so a fresh challenge runs.
        resetWebRecaptcha();
        const confirmation = await webSendOtp(pendingPhoneNumber);
        webConfirmationRef.current = confirmation;
        return;
      }
      if (!nativeAuth) return;
      const confirmation = await nativeAuth().signInWithPhoneNumber(
        pendingPhoneNumber,
        true,
      );
      nativeConfirmationRef.current = confirmation;
    } finally {
      clearTimeout(safety);
      setIsOtpSending(false);
    }
  }, [pendingPhoneNumber]);

  const verifyOtp = useCallback(
    async (code: string) => {
      setIsOtpVerifying(true);
      try {
        let idToken: string;
        if (USE_JS_SDK) {
          const confirmation = webConfirmationRef.current;
          if (!confirmation) {
            throw new Error(
              "No OTP request in progress. Please request a new code.",
            );
          }
          const credential = await confirmation.confirm(code);
          const fbUser = credential.user ?? getWebAuth().currentUser;
          if (!fbUser) throw new Error("Verification did not return a user");
          idToken = await fbUser.getIdToken(true);
          webConfirmationRef.current = null;
        } else {
          const confirmation = nativeConfirmationRef.current;
          if (!confirmation) {
            throw new Error(
              "No OTP request in progress. Please request a new code.",
            );
          }
          const credential = await confirmation.confirm(code);
          const fbUser = credential?.user ?? nativeAuth?.().currentUser;
          if (!fbUser) throw new Error("Verification did not return a user");
          idToken = await fbUser.getIdToken(true);
          nativeConfirmationRef.current = null;
        }
        await exchangeFirebaseToken(idToken);
        setPendingPhoneNumber(null);
      } finally {
        setIsOtpVerifying(false);
      }
    },
    [exchangeFirebaseToken],
  );

  const cancelOtp = useCallback(() => {
    nativeConfirmationRef.current = null;
    webConfirmationRef.current = null;
    if (USE_JS_SDK) resetWebRecaptcha();
    setPendingPhoneNumber(null);
  }, []);

  const logout = useCallback(async () => {
    try {
      const apiBase = getApiBaseUrl();
      const token = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
      if (token) {
        await fetch(`${apiBase}/api/auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch {
      // ignore network errors
    } finally {
      try {
        if (USE_JS_SDK) {
          await getWebAuth().signOut();
        } else if (nativeAuth?.().currentUser) {
          await nativeAuth?.().signOut();
        }
      } catch {
        // ignore
      }
      await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
      nativeConfirmationRef.current = null;
      webConfirmationRef.current = null;
      setPendingPhoneNumber(null);
      setUser(null);
    }
  }, []);

  const setRole = useCallback(async (role: "consumer" | "provider") => {
    if (role === "provider") {
      setOnboardingChecked(false);
      setNeedsOnboarding(false);
    }
    try {
      const apiBase = getApiBaseUrl();
      const token = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
      if (!token) return;
      const res = await fetch(`${apiBase}/api/auth/role`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.user) {
        setUser((prev) => (prev ? { ...prev, role } : null));
      }
    } catch (err) {
      console.error("Set role error:", err);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        isOtpSending,
        isOtpVerifying,
        pendingPhoneNumber,
        sendOtp,
        verifyOtp,
        cancelOtp,
        resendOtp,
        logout,
        setRole,
        refreshUser,
        needsOnboarding,
        onboardingChecked,
        markOnboardingComplete,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
