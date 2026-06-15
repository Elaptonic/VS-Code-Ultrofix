import { Stack } from "expo-router";
import React from "react";

export default function VendorLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }} initialRouteName="(tabs)">
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="radar" />
      <Stack.Screen name="onboarding" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="subscribe" options={{ animation: "slide_from_bottom" }} />
      <Stack.Screen name="vendor-reviews" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="personal-info" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="service-areas" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="skills" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="documents" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="notifications-settings" options={{ animation: "slide_from_right" }} />
    </Stack>
  );
}
