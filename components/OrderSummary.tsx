import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface OrderSummaryProps {
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  discount?: number;
}

export default function OrderSummary({
  subtotal,
  shipping,
  tax,
  total,
  discount = 0,
}: OrderSummaryProps) {
  return (
    <View className="px-6 mt-6">
      <View className="bg-surface rounded-3xl p-5">
        <Text className="text-text-primary text-xl font-bold mb-4">
          Summary
        </Text>

        <View className="space-y-3">
          <View className="flex-row justify-between items-center">
            <Text className="text-text-secondary text-base">Subtotal</Text>
            <Text className="text-text-primary font-semibold text-base">
              ${subtotal.toFixed(2)}
            </Text>
          </View>

          <View className="flex-row justify-between items-center">
            <Text className="text-text-secondary text-base">Shipping</Text>
            <Text className="text-text-primary font-semibold text-base">
              ${shipping.toFixed(2)}
            </Text>
          </View>

          <View className="flex-row justify-between items-center">
            <Text className="text-text-secondary text-base">Tax</Text>
            <Text className="text-text-primary font-semibold text-base">
              ${tax.toFixed(2)}
            </Text>
          </View>

          {discount > 0 && (
            <View className="flex-row justify-between items-center bg-primary/10 rounded-xl px-3 py-2 -mx-1">
              <View className="flex-row items-center">
                <Ionicons name="pricetag" size={16} color="#1DB954" />
                <Text className="text-primary text-base font-semibold ml-2">
                  Coupon Discount
                </Text>
              </View>
              <Text className="text-primary font-bold text-base">
                -${discount.toFixed(2)}
              </Text>
            </View>
          )}

          {/* Divider */}
          <View className="border-t border-background-lighter pt-3 mt-1" />

          {/* Total */}
          <View className="flex-row justify-between items-center">
            <Text className="text-text-primary font-bold text-lg">Total</Text>
            <Text className="text-primary font-bold text-2xl">
              ${total.toFixed(2)}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}
