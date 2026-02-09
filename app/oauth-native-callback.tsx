import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";

export default function OAuthNativeCallback() {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();

  useEffect(() => {
    if (!isLoaded) return;

    // Wait a bit for auth state to fully settle
    const timer = setTimeout(() => {
      if (isSignedIn) {
        router.replace("/(tabs)");
      } else {
        router.replace("/(auth)");
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [isSignedIn, isLoaded, router]);

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
    </View>
  );
}
