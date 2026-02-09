import { Stack } from "expo-router";
import "../global.css";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ClerkProvider, ClerkLoaded } from "@clerk/clerk-expo";
import { tokenCache } from "@clerk/clerk-expo/token-cache";
import { StripeProvider } from "@stripe/stripe-react-native";
import { View, Text } from "react-native";

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

const queryClient = new QueryClient();

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
        <QueryClientProvider client={queryClient}>
          <StripeProvider publishableKey={STRIPE_KEY}>
            <Stack screenOptions={{ headerShown: false }} />
          </StripeProvider>
        </QueryClientProvider>
      </ClerkLoaded>
    </ClerkProvider>
  );
}
