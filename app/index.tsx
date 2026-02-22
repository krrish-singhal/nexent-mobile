import { Redirect } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { View } from "react-native";
import { useEffect, useState } from "react";

export default function Index() {
  const { isSignedIn, isLoaded } = useAuth();
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (__DEV__) {
      console.log("Index - isLoaded:", isLoaded, "isSignedIn:", isSignedIn);
    }

    // Add small delay to let everything initialize
    const timer = setTimeout(() => {
      setShouldRender(true);
    }, 100);

    return () => clearTimeout(timer);
  }, [isLoaded, isSignedIn]);

  // Show loading screen while initializing
  if (!isLoaded || !shouldRender) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#121212",
        }}
      />
    );
  }

  if (__DEV__) {
    console.log("Index - Redirecting to:", isSignedIn ? "/(tabs)" : "/(auth)");
  }

  // Redirect based on auth status
  if (isSignedIn) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/(auth)" />;
}
