import { useOAuth } from "@clerk/clerk-expo";
import { useState } from "react";
import { Alert } from "react-native";

function useSocialAuth() {
  const [loadingStrategy, setLoadingStrategy] = useState<string | null>(null);
  const { startOAuthFlow: startGoogleOAuthFlow } = useOAuth({
    strategy: "oauth_google",
  });
  const { startOAuthFlow: startAppleOAuthFlow } = useOAuth({
    strategy: "oauth_apple",
  });

  const handleSocialAuth = async (strategy: "oauth_google" | "oauth_apple") => {
    setLoadingStrategy(strategy);

    try {
      const startOAuthFlow =
        strategy === "oauth_google"
          ? startGoogleOAuthFlow
          : startAppleOAuthFlow;

      const { createdSessionId, setActive } = await startOAuthFlow();

      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
        // Navigation will be handled by oauth-native-callback route
      }
    } catch (error: any) {
      const provider = strategy === "oauth_google" ? "Google" : "Apple";
      console.error("OAuth error:", error);

      // Only show alert if it's not a user cancellation
      if (error.code !== "user_cancelled" && error.code !== "auth_cancelled") {
        Alert.alert(
          "Authentication Error",
          `Failed to sign in with ${provider}. Please try again.`,
        );
      }
    } finally {
      setLoadingStrategy(null);
    }
  };

  return { loadingStrategy, handleSocialAuth };
}

export default useSocialAuth;
