import useSocialAuth from "@/hooks/useSocialAuth";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useAuth } from "@clerk/clerk-expo";
import { Redirect } from "expo-router";
import { useEffect } from "react";

const AuthScreen = () => {
  const { loadingStrategy, handleSocialAuth } = useSocialAuth();
  const { isSignedIn, isLoaded } = useAuth();

  useEffect(() => {
    console.log("Auth Screen - isLoaded:", isLoaded, "isSignedIn:", isSignedIn);
  }, [isLoaded, isSignedIn]);

  if (!isLoaded) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#1DB954" />
      </View>
    );
  }

  if (isSignedIn) {
    console.log("Auth Screen - User signed in, redirecting to tabs");
    return <Redirect href="/(tabs)" />;
  }

  // Show auth screen if not signed in
  return (
    <View className="px-8 flex-1 justify-center items-center bg-white">
      {/* DEMO IMAGE */}
      <Image
        source={require("../../assets/images/auth.png")}
        className="size-96"
        resizeMode="contain"
      />

      <View className="gap-2 mt-3">
        {/* GOOGLE SIGN IN BTN */}
        <TouchableOpacity
          className="flex-row items-center justify-center bg-white border border-gray-300 rounded-full px-6 py-3"
          onPress={() => handleSocialAuth("oauth_google")}
          disabled={loadingStrategy !== null}
          style={{
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.1,
            elevation: 2, // this is for android
          }}
        >
          {loadingStrategy === "oauth_google" ? (
            <View className="flex-row items-center justify-center">
              <ActivityIndicator size={"large"} color={"#4285f4"} />
              <Text className="ml-3 text-black font-medium text-base">
                Signing in with Google...
              </Text>
            </View>
          ) : (
            <View className="flex-row items-center justify-center">
              <Image
                source={require("../../assets/images/google.png")}
                className="mr-3"
                resizeMode="contain"
                style={{ width: 32, height: 32 }}
              />
              <Text className="text-black font-medium text-base">
                Continue with Google
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* APPLE SIGN IN BTN */}
        <TouchableOpacity
          className="flex-row items-center justify-center bg-white border border-gray-300 rounded-full px-6 py-3"
          onPress={() => handleSocialAuth("oauth_apple")}
          disabled={loadingStrategy !== null}
          style={{
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.1,
            elevation: 2, // this is for android
          }}
        >
          {loadingStrategy === "oauth_apple" ? (
            <View className="flex-row items-center justify-center">
              <ActivityIndicator size={"large"} color={"#000"} />
              <Text className="ml-3 text-black font-medium text-base">
                Signing in with Apple...
              </Text>
            </View>
          ) : (
            <View className="flex-row items-center justify-center">
              <Image
                source={require("../../assets/images/apple.png")}
                className="mr-3"
                resizeMode="contain"
                style={{ width: 60, height: 32 }}
              />
              <Text className="text-black font-medium text-base">
                Continue with Apple
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <Text className="text-center text-gray-500 text-xs leading-4 mt-6 px-2">
        By signing up, you agree to our{" "}
        <Text className="text-blue-500">Terms</Text>
        {", "}
        <Text className="text-blue-500">Privacy Policy</Text>
        {", and "}
        <Text className="text-blue-500">Cookie Use</Text>
      </Text>
    </View>
  );
};

export default AuthScreen;
