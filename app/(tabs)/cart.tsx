import SafeScreen from "@/components/SafeScreen";
import { useAddresses } from "../../hooks/useAdresses";
import useCart from "@/hooks/useCart";
import { useApi } from "@/lib/api";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useStripe } from "@stripe/stripe-react-native";
import { useState } from "react";
import { Address } from "@/types";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import OrderSummary from "../../components/OrderSummary";
import AddressSelectionModal from "@/components/AddressSelectionModal";
import useWallet, { Coupon } from "@/hooks/useWallet";
import { useQueryClient } from "@tanstack/react-query";

import * as Sentry from "@sentry/react-native";

const CartScreen = () => {
  const api = useApi();
  const queryClient = useQueryClient();
  const {
    cart,
    cartItemCount,
    cartTotal,
    clearCart,
    isError,
    isLoading,
    isRemoving,
    isUpdating,
    removeFromCart,
    updateQuantity,
  } = useCart();
  const { addresses } = useAddresses();
  const { coupons, validateCoupon, isValidating } = useWallet();

  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const [paymentLoading, setPaymentLoading] = useState(false);
  const [addressModalVisible, setAddressModalVisible] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponDiscount, setCouponDiscount] = useState(0);

  const cartItems = cart?.items || [];
  const subtotal = cartTotal;
  const shipping = 10.0; // $10 shipping fee
  const tax = subtotal * 0.08; // 8% tax
  const total = subtotal + shipping + tax - couponDiscount;

  const handleQuantityChange = (
    productId: string,
    currentQuantity: number,
    change: number,
  ) => {
    const newQuantity = currentQuantity + change;
    if (newQuantity < 1) return;
    updateQuantity({ productId, quantity: newQuantity });
  };

  const handleRemoveItem = (productId: string, productName: string) => {
    Alert.alert("Remove Item", `Remove ${productName} from cart?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => removeFromCart(productId),
      },
    ]);
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      Alert.alert("Error", "Please enter a coupon code");
      return;
    }

    try {
      const orderValue = subtotal + shipping + tax;
      const result = await validateCoupon({ code: couponCode, orderValue });

      if (result.valid) {
        setAppliedCoupon(result.coupon);
        setCouponDiscount(result.discount);
        Alert.alert(
          "Success",
          `Coupon applied! You save $${result.discount.toFixed(2)}`,
        );
      } else {
        Alert.alert("Invalid Coupon", "This coupon is invalid or has expired");
      }
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error ||
        error.response?.data?.message ||
        "Failed to apply coupon";
      Alert.alert("Error", errorMessage);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponDiscount(0);
    setCouponCode("");
  };

  const handleCheckout = () => {
    if (cartItems.length === 0) return;

    // check if user has addresses
    if (!addresses || addresses.length === 0) {
      Alert.alert(
        "No Address",
        "Please add a shipping address in your profile before checking out.",
        [{ text: "OK" }],
      );
      return;
    }

    // show address selection modal
    setAddressModalVisible(true);
  };

  const handleProceedWithPayment = async (selectedAddress: Address) => {
    setAddressModalVisible(false);

    // log chechkout initiated
    Sentry.logger.info("Checkout initiated", {
      itemCount: cartItemCount,
      total: total.toFixed(2),
      city: selectedAddress.city,
    });

    try {
      setPaymentLoading(true);

      // create payment intent with cart items and shipping address
      const { data } = await api.post("/payment/create-intent", {
        cartItems,
        shippingAddress: {
          fullName: selectedAddress.fullName,
          streetAddress: selectedAddress.streetAddress,
          city: selectedAddress.city,
          state: selectedAddress.state,
          zipCode: selectedAddress.zipCode,
          phoneNumber: selectedAddress.phoneNumber,
        },
        couponCode: appliedCoupon?.code,
      });

      const orderId = data.orderId; // Get the order ID from response

      const { error: initError } = await initPaymentSheet({
        paymentIntentClientSecret: data.clientSecret,
        merchantDisplayName: "Your Store Name",
      });

      if (initError) {
        Sentry.logger.error("Payment sheet init failed", {
          errorCode: initError.code,
          errorMessage: initError.message,
          cartTotal: total,
          itemCount: cartItems.length,
        });

        Alert.alert("Error", initError.message);
        setPaymentLoading(false);
        return;
      }

      // present payment sheet
      const { error: presentError } = await presentPaymentSheet();

      if (presentError) {
        Sentry.logger.error("Payment cancelled", {
          errorCode: presentError.code,
          errorMessage: presentError.message,
          cartTotal: total,
          itemCount: cartItems.length,
        });

        Alert.alert("Payment cancelled", presentError.message);
      } else {
        Sentry.logger.info("Payment successful", {
          total: total.toFixed(2),
          itemCount: cartItems.length,
        });

        // Confirm the order after successful payment (for development)
        try {
          await api.post("/payment/confirm-order", { orderId });
          // ...existing code...
        } catch (confirmError) {
          console.error("Failed to confirm order:", confirmError);
          // Don't show error to user - webhook should handle this in production
        }

        Alert.alert(
          "Success",
          "Your payment was successful! Your order is being processed.",
          [{ text: "OK", onPress: () => {} }],
        );
        clearCart();
        // Clear coupon state and refresh coupons list
        setAppliedCoupon(null);
        setCouponDiscount(0);
        setCouponCode("");
        // Invalidate coupons query to remove used coupon from UI
        queryClient.invalidateQueries({ queryKey: ["coupons"] });
        queryClient.invalidateQueries({ queryKey: ["wallet"] });
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";

      Sentry.logger.error("Payment failed", {
        error: errorMessage,
        cartTotal: total,
        itemCount: cartItems.length,
      });

      // Show more detailed error message to help user understand what went wrong
      Alert.alert(
        "Payment Failed",
        `Unable to process payment: ${errorMessage}\n\nPlease check your connection and try again.`,
        [{ text: "OK" }],
      );
    } finally {
      setPaymentLoading(false);
    }
  };

  if (isLoading) return <LoadingUI />;
  if (isError) return <ErrorUI />;
  if (cartItems.length === 0) return <EmptyUI />;

  return (
    <SafeScreen>
      <Text className="px-6 pb-5 text-text-primary text-3xl font-bold tracking-tight">
        Cart
      </Text>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 240 }}
      >
        <View className="px-6 gap-2">
          {cartItems.map((item, index) => (
            <View
              key={item._id}
              className="bg-surface rounded-3xl overflow-hidden "
            >
              <View className="p-4 flex-row">
                {/* product image */}
                <View className="relative">
                  <Image
                    source={item.product.images[0]}
                    className="bg-background-lighter"
                    contentFit="cover"
                    style={{ width: 112, height: 112, borderRadius: 16 }}
                  />
                  <View className="absolute top-2 right-2 bg-primary rounded-full px-2 py-0.5">
                    <Text className="text-background text-xs font-bold">
                      ×{item.quantity}
                    </Text>
                  </View>
                </View>

                <View className="flex-1 ml-4 justify-between">
                  <View>
                    <Text
                      className="text-text-primary font-bold text-lg leading-tight"
                      numberOfLines={2}
                    >
                      {item.product.name}
                    </Text>
                    <View className="flex-row items-center mt-2">
                      <Text className="text-primary font-bold text-2xl">
                        ${(item.product.price * item.quantity).toFixed(2)}
                      </Text>
                      <Text className="text-text-secondary text-sm ml-2">
                        ${item.product.price.toFixed(2)} each
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row items-center mt-3">
                    <TouchableOpacity
                      className="bg-background-lighter rounded-full w-9 h-9 items-center justify-center"
                      activeOpacity={0.7}
                      onPress={() =>
                        handleQuantityChange(
                          item.product._id,
                          item.quantity,
                          -1,
                        )
                      }
                      disabled={isUpdating}
                    >
                      {isUpdating ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Ionicons name="remove" size={18} color="#FFFFFF" />
                      )}
                    </TouchableOpacity>

                    <View className="mx-4 min-w-[32px] items-center">
                      <Text className="text-text-primary font-bold text-lg">
                        {item.quantity}
                      </Text>
                    </View>

                    <TouchableOpacity
                      className="bg-primary rounded-full w-9 h-9 items-center justify-center"
                      activeOpacity={0.7}
                      onPress={() =>
                        handleQuantityChange(item.product._id, item.quantity, 1)
                      }
                      disabled={isUpdating}
                    >
                      {isUpdating ? (
                        <ActivityIndicator size="small" color="#121212" />
                      ) : (
                        <Ionicons name="add" size={18} color="#121212" />
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      className="ml-auto bg-red-500/10 rounded-full w-9 h-9 items-center justify-center"
                      activeOpacity={0.7}
                      onPress={() =>
                        handleRemoveItem(item.product._id, item.product.name)
                      }
                      disabled={isRemoving}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={18}
                        color="#EF4444"
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Coupon Section */}
        <View className="px-6 mt-4">
          <Text className="text-text-primary font-bold text-lg mb-3">
            Have a Coupon?
          </Text>

          {appliedCoupon ? (
            <View className="bg-primary/10 rounded-2xl p-4 border border-primary">
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <View className="flex-row items-center mb-2">
                    <Ionicons name="pricetag" size={20} color="#1DB954" />
                    <Text className="text-primary font-bold text-base ml-2">
                      {appliedCoupon.code}
                    </Text>
                  </View>
                  <Text className="text-text-secondary text-sm">
                    {appliedCoupon.type.toUpperCase()} •{" "}
                    {appliedCoupon.discount}% OFF
                  </Text>
                  <Text className="text-primary font-bold text-lg mt-1">
                    -${couponDiscount.toFixed(2)}
                  </Text>
                </View>
                <TouchableOpacity
                  className="bg-red-500/10 rounded-full p-3"
                  activeOpacity={0.7}
                  onPress={handleRemoveCoupon}
                >
                  <Ionicons name="close" size={20} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View className="flex-row items-center">
              <View className="flex-1 bg-surface rounded-2xl px-4 py-3 mr-3">
                <TextInput
                  className="text-text-primary text-base"
                  placeholder="Enter coupon code"
                  placeholderTextColor="#666"
                  value={couponCode}
                  onChangeText={setCouponCode}
                  autoCapitalize="characters"
                  editable={!isValidating}
                />
              </View>
              <TouchableOpacity
                className="bg-primary rounded-2xl px-6 py-3"
                activeOpacity={0.7}
                onPress={handleApplyCoupon}
                disabled={isValidating || !couponCode.trim()}
              >
                {isValidating ? (
                  <ActivityIndicator size="small" color="#121212" />
                ) : (
                  <Text className="text-background font-bold text-base">
                    Apply
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Show available coupons */}
          {!appliedCoupon &&
            coupons &&
            coupons.filter((c) => !c.isUsed).length > 0 && (
              <View className="mt-3">
                <Text className="text-text-secondary text-xs mb-2">
                  Your available coupons:
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {coupons
                    .filter((c) => !c.isUsed)
                    .slice(0, 3)
                    .map((coupon) => (
                      <TouchableOpacity
                        key={coupon._id}
                        className="bg-surface rounded-xl px-3 py-2 border border-primary/30"
                        activeOpacity={0.7}
                        onPress={() => setCouponCode(coupon.code)}
                      >
                        <Text className="text-primary text-xs font-bold">
                          {coupon.code}
                        </Text>
                        <Text className="text-text-secondary text-xs">
                          {coupon.discount}% OFF
                        </Text>
                      </TouchableOpacity>
                    ))}
                </View>
              </View>
            )}
        </View>

        <OrderSummary
          subtotal={subtotal}
          shipping={shipping}
          tax={tax}
          total={total}
          discount={couponDiscount}
        />
      </ScrollView>

      <View
        className="absolute bottom-0 left-0 right-0 bg-background/95 backdrop-blur-xl border-t
       border-surface pt-4 pb-32 px-6"
      >
        {/* Quick Stats */}
        <View className="flex-row items-center justify-between mb-4">
          <View className="flex-row items-center">
            <Ionicons name="cart" size={20} color="#1DB954" />
            <Text className="text-text-secondary ml-2">
              {cartItemCount} {cartItemCount === 1 ? "item" : "items"}
            </Text>
          </View>
          <View className="flex-row items-center">
            <Text className="text-text-primary font-bold text-xl">
              ${total.toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Checkout Button */}
        <TouchableOpacity
          className="bg-primary rounded-2xl overflow-hidden mb-6"
          activeOpacity={0.9}
          onPress={handleCheckout}
          disabled={paymentLoading}
        >
          <View className="py-5 flex-row items-center justify-center ">
            {paymentLoading ? (
              <ActivityIndicator size="small" color="#121212" />
            ) : (
              <>
                <Text className="text-background font-bold text-lg mr-2">
                  Checkout
                </Text>
                <Ionicons name="arrow-forward" size={20} color="#121212" />
              </>
            )}
          </View>
        </TouchableOpacity>
      </View>

      <AddressSelectionModal
        visible={addressModalVisible}
        onClose={() => setAddressModalVisible(false)}
        onProceed={handleProceedWithPayment}
        isProcessing={paymentLoading}
      />
    </SafeScreen>
  );
};

export default CartScreen;

function LoadingUI() {
  return (
    <View className="flex-1 bg-background items-center justify-center">
      <ActivityIndicator size="large" color="#00D9FF" />
      <Text className="text-text-secondary mt-4">Loading cart...</Text>
    </View>
  );
}

function ErrorUI() {
  return (
    <View className="flex-1 bg-background items-center justify-center px-6">
      <Ionicons name="alert-circle-outline" size={64} color="#FF6B6B" />
      <Text className="text-text-primary font-semibold text-xl mt-4">
        Failed to load cart
      </Text>
      <Text className="text-text-secondary text-center mt-2">
        Please check your connection and try again
      </Text>
    </View>
  );
}

function EmptyUI() {
  return (
    <View className="flex-1 bg-background">
      <View className="px-6 pt-16 pb-5">
        <Text className="text-text-primary text-3xl font-bold tracking-tight">
          Cart
        </Text>
      </View>
      <View className="flex-1 items-center justify-center px-6">
        <Ionicons name="cart-outline" size={80} color="#666" />
        <Text className="text-text-primary font-semibold text-xl mt-4">
          Your cart is empty
        </Text>
        <Text className="text-text-secondary text-center mt-2">
          Add some products to get started
        </Text>
      </View>
    </View>
  );
}
