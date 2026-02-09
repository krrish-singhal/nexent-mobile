import SafeScreen from "@/components/SafeScreen";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useApi } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

interface UserProfile {
  email: string;
  name: string;
  phone?: string;
  profileImage?: string;
}

const EditProfileScreen = () => {
  const { user } = useUser();
  const { isLoaded, getToken } = useAuth();
  const api = useApi();
  const queryClient = useQueryClient();

  // Fetch user profile from backend
  const { data: profile, isLoading: isFetching } = useQuery<UserProfile>({
    queryKey: ["userProfile"],
    queryFn: async () => {
      const { data } = await api.get("/users/profile");
      return data;
    },
  });

  const [name, setName] = useState("");
  const [countryCode, setCountryCode] = useState("+1");
  const [phone, setPhone] = useState("");
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<any>(null);

  // Initialize form with data
  useEffect(() => {
    if (profile) {
      setName(profile.name || "");
      // Parse country code and phone number
      if (profile.phone) {
        const phoneMatch = profile.phone.match(/^(\+\d{1,4})\s*(.*)$/);
        if (phoneMatch) {
          setCountryCode(phoneMatch[1]);
          setPhone(phoneMatch[2]);
        } else {
          setPhone(profile.phone);
        }
      }
      setProfileImage(profile.profileImage || user?.imageUrl || null);
    } else if (user) {
      setName(`${user.firstName || ""} ${user.lastName || ""}`.trim());
      setProfileImage(user.imageUrl || null);
    }
  }, [profile, user]);

  const updateProfileMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const { data } = await api.put("/users/profile", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        transformRequest: (data) => data, // Prevent axios from transforming FormData
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userProfile"] });
      Alert.alert("Success", "Profile updated successfully!");
      router.back();
    },
    onError: (error: any) => {
      console.error("Profile update error:", error);
      console.error("Error response:", error.response?.data);
      Alert.alert(
        "Error",
        error.response?.data?.message ||
          error.response?.data?.error ||
          "Failed to update profile",
      );
    },
  });

  const pickImage = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert("Permission", "You need to allow access to your photos");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images" as any,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setProfileImage(result.assets[0].uri);
      setImageFile(result.assets[0]);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Error", "Name is required");
      return;
    }

    // Ensure auth token is available before making request
    if (!isLoaded) {
      Alert.alert("Error", "Authentication not ready. Please try again.");
      return;
    }

    try {
      const token = await getToken();
      if (!token) {
        Alert.alert("Error", "Not authenticated. Please sign in again.");
        return;
      }
    } catch (error) {
      console.error("Token error:", error);
      Alert.alert("Error", "Authentication failed. Please try again.");
      return;
    }

    const formData = new FormData();
    formData.append("name", name.trim());
    if (phone.trim()) {
      formData.append("phone", `${countryCode} ${phone.trim()}`);
    }

    if (imageFile) {
      formData.append("profileImage", {
        uri: imageFile.uri,
        type: imageFile.mimeType || "image/jpeg",
        name: imageFile.fileName || "profile.jpg",
      } as any);
    }

    updateProfileMutation.mutate(formData);
  };

  if (isFetching || !isLoaded) {
    return (
      <SafeScreen>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#1DB954" />
        </View>
      </SafeScreen>
    );
  }

  return (
    <SafeScreen>
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Header */}
        <View className="px-6 pb-5 border-b border-surface flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <Ionicons name="arrow-back" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <Text className="text-text-primary text-2xl font-bold">
            Edit Profile
          </Text>
        </View>

        {/* Profile Image */}
        <View className="items-center py-8">
          <TouchableOpacity
            onPress={pickImage}
            className="relative"
            activeOpacity={0.8}
          >
            <Image
              source={profileImage || user?.imageUrl}
              style={{ width: 120, height: 120, borderRadius: 60 }}
              transition={200}
            />
            <View className="absolute bottom-0 right-0 bg-primary rounded-full size-10 items-center justify-center border-4 border-background">
              <Ionicons name="camera" size={20} color="#121212" />
            </View>
          </TouchableOpacity>
          <Text className="text-text-secondary text-sm mt-3">
            Tap to change photo
          </Text>
        </View>

        {/* Form */}
        <View className="px-6">
          {/* Email (Read-only) */}
          <View className="mb-6">
            <Text className="text-text-secondary text-sm mb-2 ml-1">
              Email Address
            </Text>
            <View className="bg-surface rounded-2xl px-5 py-4 opacity-50">
              <Text className="text-text-primary text-base">
                {user?.emailAddresses?.[0]?.emailAddress ||
                  profile?.email ||
                  "No email"}
              </Text>
            </View>
            <Text className="text-text-secondary text-xs mt-1 ml-1">
              Email cannot be changed
            </Text>
          </View>

          {/* Name */}
          <View className="mb-6">
            <Text className="text-text-secondary text-sm mb-2 ml-1">
              Full Name *
            </Text>
            <View className="bg-surface rounded-2xl px-5 py-4">
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Enter your full name"
                placeholderTextColor="#666"
                className="text-text-primary text-base"
              />
            </View>
          </View>

          {/* Phone */}
          <View className="mb-6">
            <Text className="text-text-secondary text-sm mb-2 ml-1">
              Phone Number
            </Text>
            <View className="bg-surface rounded-2xl px-5 py-4 flex-row items-center">
              <TextInput
                value={countryCode}
                onChangeText={setCountryCode}
                placeholder="+1"
                placeholderTextColor="#666"
                keyboardType="phone-pad"
                className="text-text-primary text-base w-16 mr-3"
                maxLength={5}
              />
              <View className="h-8 w-[1px] bg-text-secondary/30 mr-3" />
              <TextInput
                value={phone}
                onChangeText={setPhone}
                placeholder="Enter phone number"
                placeholderTextColor="#666"
                keyboardType="phone-pad"
                className="text-text-primary text-base flex-1"
              />
            </View>
          </View>

          {/* Save Button */}
          <TouchableOpacity
            onPress={handleSave}
            disabled={updateProfileMutation.isPending}
            className="bg-primary rounded-2xl py-4 items-center mt-4"
            activeOpacity={0.8}
          >
            {updateProfileMutation.isPending ? (
              <ActivityIndicator color="#121212" />
            ) : (
              <Text className="text-background font-bold text-base">
                Save Changes
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeScreen>
  );
};

export default EditProfileScreen;
