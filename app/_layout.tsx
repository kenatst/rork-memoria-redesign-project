import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppStateProvider } from "@/providers/AppStateProvider";
import { AuthProvider } from "@/providers/AuthProvider";
import { trpc, trpcClient } from "@/lib/trpc";
import { NotificationsProvider } from "@/providers/NotificationsProvider";
import { ToastProvider } from "@/providers/ToastProvider";
import { OfflineQueueProvider } from "@/providers/OfflineQueueProvider";
import { ImageCompressionProvider } from "@/providers/ImageCompressionProvider";
import { AIProvider } from "@/providers/AIProvider";
import { AccessibilityProvider } from "@/components/AccessibilityProvider";
import Toast from 'react-native-toast-message';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync().catch((e) => console.log("Splash error", e));

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ 
      headerBackTitle: "Back",
      headerStyle: { backgroundColor: '#000000' },
      headerTintColor: '#FFFFFF',
      headerTitleStyle: { fontWeight: '700' }
    }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding/index" options={{ headerShown: false }} />
      <Stack.Screen name="local-events" options={{ headerShown: false }} />
      <Stack.Screen name="qr-scan" options={{ 
        title: "Scanner QR", 
        presentation: "modal",
        headerStyle: { backgroundColor: '#000000' },
        headerTintColor: '#FFFFFF'
      }} />
      <Stack.Screen name="notifications" options={{ 
        title: "Notifications", 
        presentation: "modal",
        headerStyle: { backgroundColor: '#000000' },
        headerTintColor: '#FFFFFF'
      }} />

      <Stack.Screen name="settings" options={{ 
        title: "Paramètres",
        headerStyle: { backgroundColor: '#000000' },
        headerTintColor: '#FFFFFF'
      }} />
      <Stack.Screen name="modal" options={{ 
        title: "Modal",
        headerStyle: { backgroundColor: '#000000' },
        headerTintColor: '#FFFFFF'
      }} />
      <Stack.Screen name="album/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="album/[id]/mini-film" options={{ headerShown: false }} />
      <Stack.Screen name="event/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="group/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="photo/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="create-event" options={{ 
        title: "Créer un événement",
        headerStyle: { backgroundColor: '#000000' },
        headerTintColor: '#FFFFFF'
      }} />
      <Stack.Screen name="notification-settings" options={{ 
        title: "Paramètres notifications",
        presentation: "modal",
        headerStyle: { backgroundColor: '#000000' },
        headerTintColor: '#FFFFFF'
      }} />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync().catch((e) => console.log("Hide splash error", e));
  }, []);

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <AccessibilityProvider>
          <AuthProvider>
            <AppStateProvider>
              <NotificationsProvider>
                <ToastProvider>
                  <OfflineQueueProvider>
                    <ImageCompressionProvider>
                      <AIProvider>
                        <GestureHandlerRootView style={{ flex: 1 }}>
                          <StatusBar style="light" backgroundColor="#000000" />
                          <ErrorBoundary>
                            <RootLayoutNav />
                          </ErrorBoundary>
                          <Toast />
                        </GestureHandlerRootView>
                      </AIProvider>
                    </ImageCompressionProvider>
                  </OfflineQueueProvider>
                </ToastProvider>
              </NotificationsProvider>
            </AppStateProvider>
          </AuthProvider>
        </AccessibilityProvider>
      </QueryClientProvider>
    </trpc.Provider>
  );
}