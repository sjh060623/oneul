// app/_layout.js  (Provider 감싸기)
import { Stack } from "expo-router";
import React from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "./geoBackground";
import { GoalsProvider } from "./src/goalsStore";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <GoalsProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="add-goal"
            options={{
              presentation: "modal",
              animation: "slide_from_bottom",
            }}
          />
        </Stack>
      </GoalsProvider>
    </SafeAreaProvider>
  );
}
