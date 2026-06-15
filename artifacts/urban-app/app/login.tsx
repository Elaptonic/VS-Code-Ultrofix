import { Icon as Feather } from "@/components/Icon";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/context/auth";

const DEFAULT_COUNTRY_CODE = "+91";

function normalizePhone(input: string): string {
  // Strip everything except digits.
  const digits = input.replace(/[^\d]/g, "");
  return digits;
}

export default function LoginScreen() {
  const {
    sendOtp,
    verifyOtp,
    resendOtp,
    cancelOtp,
    isOtpSending,
    isOtpVerifying,
    pendingPhoneNumber,
    isAuthenticated,
    isLoading,
  } = useAuth();

  const [countryCode, setCountryCode] = useState(DEFAULT_COUNTRY_CODE);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");

  const stage: "phone" | "otp" = pendingPhoneNumber ? "otp" : "phone";

  const fullNumber = useMemo(() => {
    const normalized = normalizePhone(phone);
    const cc = countryCode.startsWith("+") ? countryCode : `+${countryCode}`;
    return `${cc}${normalized}`;
  }, [countryCode, phone]);

  const isPhoneValid = normalizePhone(phone).length >= 7;

  const handleSendOtp = async () => {
    if (!isPhoneValid) {
      Alert.alert("Invalid number", "Please enter a valid mobile number.");
      return;
    }
    try {
      await sendOtp(fullNumber);
    } catch (err: any) {
      Alert.alert(
        "Could not send OTP",
        err?.message ?? "Please check the number and try again.",
      );
    }
  };

  const handleVerify = async () => {
    if (otp.length < 4) {
      Alert.alert("Invalid code", "Please enter the OTP you received.");
      return;
    }
    try {
      await verifyOtp(otp);
    } catch (err: any) {
      Alert.alert(
        "Verification failed",
        err?.message ?? "The code you entered is incorrect or expired.",
      );
    }
  };

  const handleResend = async () => {
    try {
      await resendOtp();
      setOtp("");
    } catch (err: any) {
      Alert.alert("Could not resend OTP", err?.message ?? "Please try again.");
    }
  };

  const handleChangeNumber = () => {
    cancelOtp();
    setOtp("");
  };

  // While auth state is true but navigator hasn't redirected yet after verify,
  // show a spinner so users don't briefly see the phone form again.
  if (!isLoading && isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ActivityIndicator color="#38BDF8" size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.hero}>
            <View style={styles.logoContainer}>
              <Feather name="home" size={44} color="#fff" />
            </View>
            <Text style={styles.appName}>Ultrofix</Text>
            <Text style={styles.tagline}>
              Professional home services at your doorstep
            </Text>
          </View>

          {stage === "phone" ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Sign in with your mobile</Text>
              <Text style={styles.cardSubtitle}>
                We'll send a 6-digit verification code via SMS.
              </Text>

              <View style={styles.phoneRow}>
                <TextInput
                  style={styles.countryInput}
                  value={countryCode}
                  onChangeText={setCountryCode}
                  keyboardType="phone-pad"
                  maxLength={5}
                  autoCorrect={false}
                />
                <TextInput
                  style={styles.phoneInput}
                  value={phone}
                  onChangeText={(t) => setPhone(normalizePhone(t))}
                  placeholder="98765 43210"
                  placeholderTextColor="#9ca3af"
                  keyboardType="phone-pad"
                  maxLength={15}
                  autoFocus
                />
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.primaryButton,
                  (!isPhoneValid || isOtpSending) && styles.buttonDisabled,
                  pressed && styles.buttonPressed,
                ]}
                onPress={handleSendOtp}
                disabled={!isPhoneValid || isOtpSending}
              >
                {isOtpSending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={styles.primaryButtonText}>Send OTP</Text>
                    <Feather name="arrow-right" size={20} color="#fff" />
                  </>
                )}
              </Pressable>

              <Text style={styles.disclaimer}>
                By continuing, you agree to our Terms of Service and Privacy
                Policy.
              </Text>
            </View>
          ) : (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Enter verification code</Text>
              <Text style={styles.cardSubtitle}>
                Sent to {pendingPhoneNumber}.{" "}
                <Text style={styles.linkText} onPress={handleChangeNumber}>
                  Change number
                </Text>
              </Text>

              <TextInput
                style={styles.otpInput}
                value={otp}
                onChangeText={(t) => setOtp(t.replace(/[^\d]/g, ""))}
                placeholder="------"
                placeholderTextColor="#cbd5e1"
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
              />

              <Pressable
                style={({ pressed }) => [
                  styles.primaryButton,
                  (otp.length < 4 || isOtpVerifying) && styles.buttonDisabled,
                  pressed && styles.buttonPressed,
                ]}
                onPress={handleVerify}
                disabled={otp.length < 4 || isOtpVerifying}
              >
                {isOtpVerifying ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={styles.primaryButtonText}>Verify & Continue</Text>
                    <Feather name="arrow-right" size={20} color="#fff" />
                  </>
                )}
              </Pressable>

              <Pressable
                onPress={handleResend}
                disabled={isOtpSending}
                style={styles.resendRow}
              >
                {isOtpSending ? (
                  <ActivityIndicator color="#38BDF8" />
                ) : (
                  <Text style={styles.linkText}>Resend OTP</Text>
                )}
              </Pressable>
            </View>
          )}

          <View style={styles.features}>
            {[
              { icon: "check-circle" as const, text: "Verified professionals" },
              { icon: "shield" as const, text: "Safe & secure service" },
              { icon: "star" as const, text: "Top-rated providers" },
            ].map((item) => (
              <View key={item.text} style={styles.featureRow}>
                <Feather name={item.icon} size={18} color="#38BDF8" />
                <Text style={styles.featureText}>{item.text}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  scroll: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    paddingTop: 32,
    gap: 24,
  },
  hero: { alignItems: "center", gap: 12 },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: "#38BDF8",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#38BDF8",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  appName: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: "#111827",
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#6b7280",
    textAlign: "center",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#f3f4f6",
    gap: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    color: "#111827",
  },
  cardSubtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#6b7280",
    lineHeight: 18,
  },
  phoneRow: {
    flexDirection: "row",
    gap: 8,
  },
  countryInput: {
    width: 72,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    color: "#111827",
    textAlign: "center",
  },
  phoneInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    color: "#111827",
  },
  otpInput: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 24,
    fontFamily: "Inter_600SemiBold",
    color: "#111827",
    textAlign: "center",
    letterSpacing: 8,
  },
  primaryButton: {
    backgroundColor: "#38BDF8",
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#38BDF8",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonPressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  resendRow: {
    alignItems: "center",
    paddingVertical: 8,
  },
  linkText: {
    color: "#38BDF8",
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  disclaimer: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "#9ca3af",
    textAlign: "center",
    lineHeight: 16,
  },
  features: {
    gap: 10,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#F0F9FF",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
  },
  featureText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "#374151",
  },
});
