import { Order } from "@/types";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import {
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";

interface RatingModalProps {
  visible: boolean;
  onClose: () => void;
  order: Order | null;
  productRatings: { [key: string]: number };
  onRatingChange: (productId: string, rating: number) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

const RatingModal = ({
  visible,
  onClose,
  order,
  productRatings,
  onRatingChange,
  onSubmit,
  isSubmitting,
}: RatingModalProps) => {
  if (!order) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      statusBarTranslucent
    >
      {/* Backdrop ONLY */}
      <Pressable
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.7)" }}
        onPress={onClose}
      />

      {/* Content layer */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: 16,
        }}
        pointerEvents="box-none"
      >
        <View
          style={{
            backgroundColor: "#121212",
            borderRadius: 24,
            padding: 16,
            width: "100%",
            maxWidth: 420,
            maxHeight: "80%",
          }}
          pointerEvents="auto"
        >
          {/* Header */}
          <View style={{ alignItems: "center", marginBottom: 12 }}>
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: "rgba(29,185,84,0.2)",
                justifyContent: "center",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <Ionicons name="star" size={32} color="#1DB954" />
            </View>

            <Text style={{ fontSize: 22, fontWeight: "700", color: "#fff" }}>
              Rate Your Products
            </Text>
            <Text style={{ fontSize: 13, color: "#aaa", textAlign: "center" }}>
              Rate each product from your order
            </Text>
          </View>

          {/* SCROLL VIEW (FIXED) */}
          <ScrollView
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="always"
            contentContainerStyle={{ paddingBottom: 20 }}
            onStartShouldSetResponderCapture={() => true}
          >
            {order.orderItems.map((item, index) => {
              const productId = item.product._id;
              const currentRating = productRatings[productId] || 0;

              return (
                <View
                  key={item._id}
                  style={{
                    backgroundColor: "#1e1e1e",
                    borderRadius: 16,
                    padding: 12,
                    marginBottom: index < order.orderItems.length - 1 ? 12 : 0,
                  }}
                >
                  {/* Product info */}
                  <View style={{ flexDirection: "row", marginBottom: 10 }}>
                    <Image
                      source={item.images}
                      style={{ width: 64, height: 64, borderRadius: 8 }}
                    />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text
                        numberOfLines={2}
                        style={{ color: "#fff", fontWeight: "600" }}
                      >
                        {item.name}
                      </Text>
                      <Text
                        style={{ color: "#aaa", fontSize: 12, marginTop: 4 }}
                      >
                        Qty: {item.quantity} • ${item.price.toFixed(2)}
                      </Text>
                    </View>
                  </View>

                  {/* Stars */}
                  <View
                    style={{ flexDirection: "row", justifyContent: "center" }}
                  >
                    {[1, 2, 3, 4, 5].map((star) => (
                      <TouchableOpacity
                        key={star}
                        onPress={() => onRatingChange(productId, star)}
                        activeOpacity={0.7}
                        style={{ marginHorizontal: 6 }}
                      >
                        <Ionicons
                          name={star <= currentRating ? "star" : "star-outline"}
                          size={32}
                          color={star <= currentRating ? "#1DB954" : "#666"}
                        />
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              );
            })}
          </ScrollView>

          {/* Actions */}
          <View style={{ marginTop: 12 }}>
            <TouchableOpacity
              onPress={onSubmit}
              disabled={isSubmitting}
              activeOpacity={0.8}
              style={{
                backgroundColor: "#1DB954",
                paddingVertical: 14,
                borderRadius: 16,
                alignItems: "center",
                marginBottom: 10,
              }}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#121212" />
              ) : (
                <Text style={{ fontWeight: "700", color: "#121212" }}>
                  Submit All Ratings
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onClose}
              disabled={isSubmitting}
              activeOpacity={0.7}
              style={{
                paddingVertical: 14,
                borderRadius: 16,
                alignItems: "center",
                borderWidth: 1,
                borderColor: "#333",
              }}
            >
              <Text style={{ fontWeight: "700", color: "#aaa" }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default RatingModal;
