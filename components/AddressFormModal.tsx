import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Switch,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import SafeScreen from "./SafeScreen";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import * as Location from "expo-location";

interface AddressFormData {
  label: string;
  fullName: string;
  streetAddress: string;
  city: string;
  state: string;
  zipCode: string;
  phoneNumber: string;
  isDefault: boolean;
}

interface AddressFormModalProps {
  visible: boolean;
  isEditing: boolean;
  addressForm: AddressFormData;
  isAddingAddress: boolean;
  isUpdatingAddress: boolean;
  onClose: () => void;
  onSave: () => void;
  onFormChange: (form: AddressFormData) => void;
}

const AddressFormModal = ({
  addressForm,
  isAddingAddress,
  isEditing,
  isUpdatingAddress,
  onClose,
  onFormChange,
  onSave,
  visible,
}: AddressFormModalProps) => {
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  const getCurrentLocation = async () => {
    try {
      setIsLoadingLocation(true);

      // Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "Location permission is required to autofill your address. You can still enter it manually.",
        );
        setIsLoadingLocation(false);
        return;
      }

      // Get current location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      // Reverse geocode to get address
      const [address] = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (address) {
        // Autofill the form with location data
        onFormChange({
          ...addressForm,
          streetAddress:
            `${address.street || ""} ${address.streetNumber || ""}`.trim(),
          city: address.city || "",
          state: address.region || "",
          zipCode: address.postalCode || "",
        });

        Alert.alert(
          "Location Found",
          "Your address has been autofilled. Please review and edit if needed.",
        );
      }
    } catch (error) {
      Alert.alert(
        "Error",
        "Unable to get your location. Please enter the address manually.",
      );
    } finally {
      setIsLoadingLocation(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <SafeScreen>
          {/* HEADER */}
          <View className="px-6 py-5 border-b border-surface flex-row items-center justify-between">
            <Text className="text-text-primary text-2xl font-bold">
              {isEditing ? "Edit Address" : "Add New Address"}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={28} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* LOCATION AUTOFILL BUTTON */}
          {!isEditing && (
            <View className="px-6 pt-4">
              <TouchableOpacity
                onPress={getCurrentLocation}
                disabled={isLoadingLocation}
                className="bg-primary/20 rounded-2xl p-4 flex-row items-center justify-center border-2 border-primary/30"
                activeOpacity={0.7}
              >
                {isLoadingLocation ? (
                  <ActivityIndicator size="small" color="#1DB954" />
                ) : (
                  <>
                    <Ionicons name="location" size={24} color="#1DB954" />
                    <Text className="text-primary font-bold text-base ml-2">
                      Use Current Location
                    </Text>
                  </>
                )}
              </TouchableOpacity>
              <Text className="text-text-secondary text-xs text-center mt-2">
                We'll autofill your address. You can edit it after.
              </Text>
            </View>
          )}

          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingBottom: 50 }}
            showsVerticalScrollIndicator={false}
          >
            <View className="p-6">
              {/* LABEL INPUT */}
              <View className="mb-5">
                <Text className="text-text-primary font-semibold mb-2">
                  Label
                </Text>
                <TextInput
                  className="bg-surface text-text-primary p-4 rounded-2xl text-base"
                  placeholder="e.g., Home, Work, Office"
                  placeholderTextColor="#666"
                  value={addressForm.label}
                  onChangeText={(text) =>
                    onFormChange({ ...addressForm, label: text })
                  }
                />
              </View>

              {/* NAME INPUT */}
              <View className="mb-5">
                <Text className="text-text-primary font-semibold mb-2">
                  Full Name
                </Text>
                <TextInput
                  className="bg-surface text-text-primary px-4 py-4 rounded-2xl text-base"
                  placeholder="Enter your full name"
                  placeholderTextColor="#666"
                  value={addressForm.fullName}
                  onChangeText={(text) =>
                    onFormChange({ ...addressForm, fullName: text })
                  }
                />
              </View>

              {/* Address Input */}
              <View className="mb-5">
                <Text className="text-text-primary font-semibold mb-2">
                  Street Address
                </Text>
                <TextInput
                  className="bg-surface text-text-primary px-4 py-4 rounded-2xl text-base"
                  placeholder="Street address, apt/suite number"
                  placeholderTextColor="#666"
                  value={addressForm.streetAddress}
                  onChangeText={(text) =>
                    onFormChange({ ...addressForm, streetAddress: text })
                  }
                  multiline
                />
              </View>

              {/* City Input */}
              <View className="mb-5">
                <Text className="text-text-primary font-semibold mb-2">
                  City
                </Text>
                <TextInput
                  className="bg-surface text-text-primary px-4 py-4 rounded-2xl text-base"
                  placeholder="e.g., New York"
                  placeholderTextColor="#666"
                  value={addressForm.city}
                  onChangeText={(text) =>
                    onFormChange({ ...addressForm, city: text })
                  }
                />
              </View>

              {/* State Input */}
              <View className="mb-5">
                <Text className="text-text-primary font-semibold mb-2">
                  State
                </Text>
                <TextInput
                  className="bg-surface text-text-primary px-4 py-4 rounded-2xl text-base"
                  placeholder="e.g., NY"
                  placeholderTextColor="#666"
                  value={addressForm.state}
                  onChangeText={(text) =>
                    onFormChange({ ...addressForm, state: text })
                  }
                />
              </View>

              {/* ZIP Code Input */}
              <View className="mb-5">
                <Text className="text-text-primary font-semibold mb-2">
                  ZIP Code
                </Text>
                <TextInput
                  className="bg-surface text-text-primary px-4 py-4 rounded-2xl text-base"
                  placeholder="e.g., 10001"
                  placeholderTextColor="#666"
                  value={addressForm.zipCode}
                  onChangeText={(text) =>
                    onFormChange({ ...addressForm, zipCode: text })
                  }
                  keyboardType="numeric"
                />
              </View>

              {/* Phone Input */}
              <View className="mb-5">
                <Text className="text-text-primary font-semibold mb-2">
                  Phone Number
                </Text>
                <TextInput
                  className="bg-surface text-text-primary px-4 py-4 rounded-2xl text-base"
                  placeholder="+1 (555) 123-4567"
                  placeholderTextColor="#666"
                  value={addressForm.phoneNumber}
                  onChangeText={(text) =>
                    onFormChange({ ...addressForm, phoneNumber: text })
                  }
                  keyboardType="phone-pad"
                />
              </View>

              {/* Default Address Toggle */}
              <View className="bg-surface rounded-2xl p-4 flex-row items-center justify-between mb-6">
                <Text className="text-text-primary font-semibold">
                  Set as default address
                </Text>
                <Switch
                  value={addressForm.isDefault}
                  onValueChange={(value) =>
                    onFormChange({ ...addressForm, isDefault: value })
                  }
                  thumbColor="white"
                />
              </View>

              {/* Save Button */}
              <TouchableOpacity
                className="bg-primary rounded-2xl py-5 items-center"
                activeOpacity={0.8}
                onPress={onSave}
                disabled={isAddingAddress || isUpdatingAddress}
              >
                {isAddingAddress || isUpdatingAddress ? (
                  <ActivityIndicator size="small" color="#121212" />
                ) : (
                  <Text className="text-background font-bold text-lg">
                    {isEditing ? "Save Changes" : "Add Address"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeScreen>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default AddressFormModal;
