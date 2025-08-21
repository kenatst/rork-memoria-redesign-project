import { Stack } from "expo-router";
import React from "react";

export default function HomeStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="details" options={{ headerTitle: "Détails" }} />
    </Stack>
  );
}