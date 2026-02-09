import { Redirect, Stack } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { ActivityIndicator, View } from "react-native";
import { useEffect, useState } from "react";

export default function AuthRoutesLayout() {
  const { isSignedIn, isLoaded } = useAuth();
  const [shouldRedirect, setShouldRedirect] = useState(false);

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      // Add small delay before redirect to allow state to settle
      const timer = setTimeout(() => {
        setShouldRedirect(true);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isLoaded, isSignedIn]);

  if (!isLoaded) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#fff",
        }}
      >
        <ActivityIndicator size="large" color="#1DB954" />
      </View>
    );
  }

  if (isSignedIn && shouldRedirect) {
    return <Redirect href="/(tabs)" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
