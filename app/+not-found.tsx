import { useEffect } from "react";
import { View, ActivityIndicator, Text } from "react-native";
import { useRouter, usePathname } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";

export default function NotFound() {
  const router = useRouter();
  const pathname = usePathname();
  const { isSignedIn, isLoaded } = useAuth();

  useEffect(() => {
    // Don't redirect if we're on an OAuth callback route
    if (pathname?.includes("oauth") || pathname?.includes("callback")) {
      return;
    }

    if (isLoaded) {
      // Small delay to prevent immediate redirect
      const timer = setTimeout(() => {
        if (isSignedIn) {
          router.replace("/(tabs)");
        } else {
          router.replace("/(auth)");
        }
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [isSignedIn, isLoaded, router, pathname]);

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#121212",
      }}
    >
      <ActivityIndicator size="large" color="#1DB954" />
      <Text style={{ color: "#fff", marginTop: 16 }}>Redirecting...</Text>
    </View>
  );
}
