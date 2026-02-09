import RatingModal from "@/components/RatingModal";
import SafeScreen from "@/components/SafeScreen";
import { useOrders } from "../../hooks/useOrders";
import { useReviews } from "../../hooks/useReviews";
import { useHideOrder } from "../../hooks/useHideOrder";
import {
  capitalizeFirstLetter,
  formatDate,
  getStatusColor,
  isOrderReviewed,
} from "@/lib/utils";
import { Order } from "@/types";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useState, useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useQueryClient } from "@tanstack/react-query";

function OrdersScreen() {
  const queryClient = useQueryClient();
  const {
    data: orders,
    isLoading,
    isError,
    reorder,
    isReordering,
  } = useOrders();
  const { createReviewAsync, isCreatingReview } = useReviews();
  const { hideOrder, isHiding } = useHideOrder();

  // Refresh coupons when screen loads to remove used ones
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ["coupons"] });
  }, [queryClient]);

  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [productRatings, setProductRatings] = useState<{
    [key: string]: number;
  }>({});

  const handleDeleteOrder = (order: Order) => {
    Alert.alert(
      "Hide Order",
      "This will hide the order from your view. The order data will be kept for records.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Hide",
          style: "destructive",
          onPress: async () => {
            try {
              await hideOrder(order._id);
            } catch (error: any) {
              const errorMessage =
                error?.response?.data?.message ||
                error?.message ||
                "Failed to hide order";
              Alert.alert("Error", errorMessage);
            }
          },
        },
      ],
    );
  };

  const handleReorder = async (order: Order) => {
    Alert.alert("Reorder", "Add all items from this order to your cart?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Reorder",
        onPress: async () => {
          try {
            const result = await reorder(order._id);

            if (result.unavailableItems && result.unavailableItems.length > 0) {
              const unavailableList = result.unavailableItems
                .map((item: any) => `• ${item.name}: ${item.reason}`)
                .join("\n");
              Alert.alert(
                "Some Items Unavailable",
                `The following items couldn't be added:\n\n${unavailableList}\n\nWould you like to proceed to checkout with available items?`,
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Proceed",
                    onPress: () => router.push("/(tabs)/cart"),
                  },
                ],
              );
            } else {
              Alert.alert("Success", "Items added to cart!", [
                { text: "Continue Shopping", style: "cancel" },
                {
                  text: "View Cart",
                  onPress: () => router.push("/(tabs)/cart"),
                },
              ]);
            }
          } catch (error: any) {
            const errorMessage =
              error?.response?.data?.error ||
              error?.message ||
              "Failed to reorder";
            Alert.alert("Error", errorMessage);
          }
        },
      },
    ]);
  };

  const handleOpenRating = (order: Order) => {
    setShowRatingModal(true);
    setSelectedOrder(order);

    const initialRatings: { [key: string]: number } = {};
    order.orderItems.forEach((item) => {
      const productId = item.product._id;
      initialRatings[productId] = order.productRatings?.[productId] || 0;
    });
    setProductRatings(initialRatings);
  };

  const handleSubmitRating = async () => {
    if (!selectedOrder) return;

    const ratedProducts = Object.entries(productRatings).filter(
      ([_, rating]) => rating > 0,
    );

    if (ratedProducts.length === 0) {
      Alert.alert("No Ratings", "Please rate at least one product");
      return;
    }

    try {
      await Promise.all(
        ratedProducts.map(([productId, rating]) => {
          return createReviewAsync({
            productId,
            orderId: selectedOrder._id,
            rating,
          });
        }),
      );

      const ratedCount = ratedProducts.length;
      const totalCount = selectedOrder.orderItems.length;
      const message =
        ratedCount === totalCount
          ? "Thank you for rating all products! Your invoice has been sent to your email."
          : `Thank you! You rated ${ratedCount} of ${totalCount} products. Your invoice has been sent to your email.`;

      setShowRatingModal(false);
      setSelectedOrder(null);
      setProductRatings({});

      // Refresh queries to update UI
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["coupons"] });

      setTimeout(() => {
        Alert.alert("Success", message);
      }, 300);
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        error?.message ||
        "Failed to submit rating";
      Alert.alert("Error", errorMessage);
    }
  };

  return (
    <SafeScreen>
      <View className="px-6 pb-5 border-b border-surface flex-row items-center">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <Ionicons name="arrow-back" size={28} color="#FFFFFF" />
        </TouchableOpacity>
        <Text className="text-text-primary text-2xl font-bold">My Orders</Text>
      </View>

      {isLoading ? (
        <LoadingUI />
      ) : isError ? (
        <ErrorUI />
      ) : !orders || orders.length === 0 ? (
        <EmptyUI />
      ) : (
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          <View className="px-6 py-4">
            {orders.map((order) => {
              const totalItems = (order.orderItems || []).reduce(
                (sum, item) => sum + (item.quantity || 0),
                0,
              );
              const firstImage = order.orderItems?.[0]?.images || "";

              return (
                <View
                  key={order._id}
                  className="bg-surface rounded-3xl p-5 mb-4"
                >
                  <TouchableOpacity
                    className="absolute top-4 right-4 z-10 bg-background-lighter rounded-full p-2"
                    onPress={() => handleDeleteOrder(order)}
                    disabled={isHiding}
                  >
                    <Ionicons name="close" size={20} color="#FF6B6B" />
                  </TouchableOpacity>

                  <View className="flex-row mb-4">
                    <View className="relative">
                      <Image
                        source={firstImage}
                        style={{ height: 80, width: 80, borderRadius: 8 }}
                        contentFit="cover"
                      />
                      {order.orderItems.length > 1 && (
                        <View className="absolute -bottom-1 -right-1 bg-primary rounded-full size-7 items-center justify-center">
                          <Text className="text-background text-xs font-bold">
                            +{order.orderItems.length - 1}
                          </Text>
                        </View>
                      )}
                    </View>

                    <View className="flex-1 ml-4">
                      <Text className="text-text-primary font-bold text-base mb-1">
                        Order #{order._id.slice(-8).toUpperCase()}
                      </Text>
                      <Text className="text-text-secondary text-sm mb-2">
                        {formatDate(order.createdAt)}
                      </Text>
                      <View
                        className="self-start px-3 py-1.5 rounded-full"
                        style={{
                          backgroundColor: getStatusColor(order.status) + "20",
                        }}
                      >
                        <Text
                          className="text-xs font-bold"
                          style={{ color: getStatusColor(order.status) }}
                        >
                          {capitalizeFirstLetter(order.status)}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {(order.orderItems || []).map((item, index) => (
                    <Text
                      key={item._id || index}
                      className="text-text-secondary text-sm flex-1"
                      numberOfLines={1}
                    >
                      {`${item.name || "Unknown"} × ${item.quantity || 0}`}
                    </Text>
                  ))}

                  {(order.orderItems[0]?.product?.returnPolicy?.returnable ||
                    order.orderItems[0]?.product?.returnPolicy?.refundable !==
                      undefined ||
                    (order.coinsEarned && order.coinsEarned > 0)) && (
                    <View className="flex-row gap-2 my-3">
                      {order.orderItems[0]?.product?.returnPolicy
                        ?.returnable && (
                        <View className="bg-green-500/20 px-3 py-1.5 rounded-full flex-row items-center">
                          <Ionicons
                            name="shield-checkmark"
                            size={14}
                            color="#10b981"
                          />
                          <Text className="text-green-500 text-xs font-semibold ml-1">
                            {`${order.orderItems[0].product.returnPolicy.returnDays}-Day Return`}
                          </Text>
                        </View>
                      )}
                      {order.orderItems[0]?.product?.returnPolicy
                        ?.refundable ? (
                        <View className="bg-blue-500/20 px-3 py-1.5 rounded-full flex-row items-center">
                          <Ionicons name="cash" size={14} color="#3b82f6" />
                          <Text className="text-blue-500 text-xs font-semibold ml-1">
                            Refundable
                          </Text>
                        </View>
                      ) : (
                        order.orderItems[0]?.product?.returnPolicy
                          ?.refundable === false && (
                          <View className="bg-red-500/20 px-3 py-1.5 rounded-full flex-row items-center">
                            <Ionicons
                              name="close-circle"
                              size={14}
                              color="#ef4444"
                            />
                            <Text className="text-red-500 text-xs font-semibold ml-1">
                              Non-Refundable
                            </Text>
                          </View>
                        )
                      )}
                      {order.coinsEarned && order.coinsEarned > 0 && (
                        <View className="bg-yellow-500/20 px-3 py-1.5 rounded-full flex-row items-center">
                          <Text className="text-yellow-500 text-xs font-semibold">
                            {`🪙 +${order.coinsEarned || 0} coins`}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}

                  <View className="border-t border-background-lighter pt-3 flex-row justify-between items-center">
                    <View>
                      <Text className="text-text-secondary text-xs mb-1">
                        {`${totalItems || 0} items`}
                      </Text>
                      <Text className="text-primary font-bold text-xl">
                        {`$${(order.totalPrice || 0).toFixed(2)}`}
                      </Text>
                      {order.discount > 0 && (
                        <Text className="text-green-500 text-xs mt-1">
                          {`Saved $${(order.discount || 0).toFixed(2)}`}
                        </Text>
                      )}
                    </View>

                    <View className="flex-row gap-2">
                      <TouchableOpacity
                        className="bg-primary/20 px-4 py-3 rounded-full flex-row items-center"
                        activeOpacity={0.7}
                        onPress={() => handleReorder(order)}
                        disabled={isReordering}
                      >
                        <Ionicons name="repeat" size={18} color="#1DB954" />
                        <Text className="text-primary font-bold text-sm ml-2">
                          Reorder
                        </Text>
                      </TouchableOpacity>

                      {order.status !== "failed" &&
                        order.paymentResult &&
                        order.paymentResult.status === "succeeded" &&
                        (isOrderReviewed(order.productRatings) ? (
                          <View className="bg-primary/20 px-4 py-3 rounded-full flex-row items-center">
                            <Ionicons
                              name="checkmark-circle"
                              size={18}
                              color="#1DB954"
                            />
                            <Text className="text-primary font-bold text-sm ml-2">
                              Reviewed
                            </Text>
                          </View>
                        ) : (
                          <TouchableOpacity
                            className="bg-primary px-4 py-3 rounded-full flex-row items-center"
                            activeOpacity={0.7}
                            onPress={() => handleOpenRating(order)}
                          >
                            <Ionicons name="star" size={18} color="#121212" />
                            <Text className="text-background font-bold text-sm ml-2">
                              Rate
                            </Text>
                          </TouchableOpacity>
                        ))}
                    </View>
                  </View>

                  {order.status !== "failed" &&
                    order.paymentResult &&
                    order.paymentResult.status === "succeeded" &&
                    !isOrderReviewed(order.productRatings) && (
                      <View className="mt-3 pt-3 border-t border-background-lighter">
                        <View className="flex-row items-center justify-center bg-blue-500/10 py-3 px-4 rounded-xl">
                          <Ionicons
                            name="mail-outline"
                            size={18}
                            color="#3b82f6"
                          />
                          <Text className="text-blue-500 text-xs font-semibold ml-2 text-center">
                            Review products to receive your invoice via email
                          </Text>
                        </View>
                      </View>
                    )}
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}

      <RatingModal
        visible={showRatingModal}
        onClose={() => setShowRatingModal(false)}
        order={selectedOrder}
        productRatings={productRatings}
        onSubmit={handleSubmitRating}
        isSubmitting={isCreatingReview}
        onRatingChange={(productId, rating) =>
          setProductRatings((prev) => ({ ...prev, [productId]: rating }))
        }
      />
    </SafeScreen>
  );
}

export default OrdersScreen;

function LoadingUI() {
  return (
    <View className="flex-1 items-center justify-center">
      <ActivityIndicator size="large" color="#00D9FF" />
      <Text className="text-text-secondary mt-4">Loading orders...</Text>
    </View>
  );
}

function ErrorUI() {
  return (
    <View className="flex-1 items-center justify-center px-6">
      <Ionicons name="alert-circle-outline" size={64} color="#FF6B6B" />
      <Text className="text-text-primary font-semibold text-xl mt-4">
        Failed to load orders
      </Text>
      <Text className="text-text-secondary text-center mt-2">
        Please check your connection and try again
      </Text>
    </View>
  );
}

function EmptyUI() {
  return (
    <View className="flex-1 items-center justify-center px-6">
      <Ionicons name="receipt-outline" size={80} color="#666" />
      <Text className="text-text-primary font-semibold text-xl mt-4">
        No orders yet
      </Text>
      <Text className="text-text-secondary text-center mt-2">
        Your order history will appear here
      </Text>
    </View>
  );
}
