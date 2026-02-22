import { Stack } from "expo-router";
import "../global.css";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ClerkProvider, ClerkLoaded } from "@clerk/clerk-expo";
import { tokenCache } from "@clerk/clerk-expo/token-cache";
import { StripeProvider } from "@stripe/stripe-react-native";
import { View, Text, ActivityIndicator } from "react-native";
import axios from "axios";
import React, { useEffect, useRef, useState } from "react";

/**
 * ENV VALIDATION
 */
const CLERK_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;
const API_URL = process.env.EXPO_PUBLIC_API_URL;
const STRIPE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;

if (!CLERK_KEY || !API_URL || !STRIPE_KEY) {
  console.error("❌ Missing ENV variables", {
    CLERK_KEY: !!CLERK_KEY,
    API_URL: !!API_URL,
    STRIPE_KEY: !!STRIPE_KEY,
  });
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Server is guaranteed to be up by the time queries fire (ServerReadyGate).
      // Still retry a couple of times for transient errors.
      retry: (failureCount, error: any) => {
        const status = error?.response?.status;
        if (status === 503 || !status) return failureCount < 3;
        return false;
      },
      retryDelay: (attemptIndex) => [2000, 5000, 10000][attemptIndex] ?? 10000,
      staleTime: 1000 * 60, // 1 minute
    },
  },
});

/**
 * BACKEND WARM-UP GATE
 *
 * Render.com free tier instances sleep after inactivity and take 30-60s to
 * cold-start.  This component pings /api/health until the server responds,
 * showing a friendly "waking up" screen instead of flooding the app with 503
 * errors.  All data queries are held behind this gate so they only fire once
 * the server is confirmed alive.
 */
function ServerReadyGate({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const cancelled = useRef(false);

  useEffect(() => {
    if (!API_URL) {
      setIsReady(true);
      return;
    }

    cancelled.current = false;
    let attempt = 0;

    const ping = async () => {
      while (!cancelled.current) {
        try {
          await axios.get(`${API_URL}/api/health`, { timeout: 15000 });
          if (!cancelled.current) {
            if (__DEV__) console.log("✅ Backend is ready");
            setIsReady(true);
          }
          return;
        } catch {
          attempt++;
          if (__DEV__)
            console.log(`⏳ Backend warming up… attempt ${attempt}`);
          setElapsed((prev) => prev + 1);
          // Back-off: first few retries fast, then every 5s
          const delay = attempt <= 3 ? 3000 : 5000;
          await new Promise((r) => setTimeout(r, delay));
        }
      }
    };

    ping();

    return () => {
      cancelled.current = true;
    };
  }, []);

  if (!isReady) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#121212",
          justifyContent: "center",
          alignItems: "center",
          gap: 16,
        }}
      >
        <ActivityIndicator size="large" color="#a855f7" />
        <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>
          Starting server…
        </Text>
        {elapsed >= 3 && (
          <Text
            style={{ color: "#888", fontSize: 13, textAlign: "center", paddingHorizontal: 32 }}
          >
            The server is waking up from sleep.{"\n"}This usually takes under a minute.
          </Text>
        )}
      </View>
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {

  if (!CLERK_KEY || !API_URL || !STRIPE_KEY) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#121212",
          justifyContent: "center",
          alignItems: "center",
          padding: 20,
        }}
      >
        <Text style={{ color: "#fff", fontSize: 18, marginBottom: 12 }}>
          Configuration Error
        </Text>

        <Text style={{ color: "#aaa" }}>
          Clerk Key: {CLERK_KEY ? "OK" : "❌ MISSING"}
        </Text>
        <Text style={{ color: "#aaa" }}>
          API URL: {API_URL ? "OK" : "❌ MISSING"}
        </Text>
        <Text style={{ color: "#aaa" }}>
          Stripe Key: {STRIPE_KEY ? "OK" : "❌ MISSING"}
        </Text>
      </View>
    );
  }

  return (
    <ClerkProvider publishableKey={CLERK_KEY} tokenCache={tokenCache}>
      <ClerkLoaded>
        <ServerReadyGate>
          <QueryClientProvider client={queryClient}>
            <StripeProvider publishableKey={STRIPE_KEY}>
              <Stack screenOptions={{ headerShown: false }} />
            </StripeProvider>
          </QueryClientProvider>
        </ServerReadyGate>
      </ClerkLoaded>
    </ClerkProvider>
  );
}
