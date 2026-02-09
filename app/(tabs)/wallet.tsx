import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "@react-navigation/native";
import { useQueryClient } from "@tanstack/react-query";
import useWallet from "@/hooks/useWallet";

const WalletScreen = () => {
  const queryClient = useQueryClient();
  const {
    wallet,
    isLoading,
    coupons,
    isCouponsLoading,
    transactions,
    isTransactionsLoading,
    redeemCouponAsync,
    isRedeeming,
  } = useWallet();

  const [refreshing, setRefreshing] = useState(false);

  // Auto-refresh wallet data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      queryClient.invalidateQueries({ queryKey: ["coupons"] });
      queryClient.invalidateQueries({ queryKey: ["wallet-transactions"] });
    }, [queryClient]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    // Queries will auto-refetch
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleRedeemCoupon = async (type: "bronze" | "silver" | "gold") => {
    const tiers = {
      bronze: { coins: 100, discount: 10 },
      silver: { coins: 300, discount: 35 },
      gold: { coins: 500, discount: 60 },
    };

    const tier = tiers[type];

    Alert.alert(
      `Redeem ${type.charAt(0).toUpperCase() + type.slice(1)} Coupon`,
      `Redeem ${tier.coins} coins for ${tier.discount}% off?\n\nYou have ${wallet?.coins || 0} coins.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Redeem",
          onPress: async () => {
            try {
              const result = await redeemCouponAsync(type);
              // Show success message with expiry information
              Alert.alert("Coupon Redeemed Successfully! 🎉", result.message, [
                { text: "OK" },
              ]);
            } catch (error: any) {
              Alert.alert(
                "Redemption Failed",
                error?.response?.data?.error || "Failed to redeem coupon",
                [{ text: "OK" }],
              );
            }
          },
        },
      ],
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator
          size="large"
          color="#1DB954"
          style={{ marginTop: 50 }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Wallet</Text>
          <Ionicons name="wallet" size={28} color="#1DB954" />
        </View>

        {/* Coins Card */}
        <LinearGradient
          colors={["#1DB954", "#17a34a"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.coinsCard}
        >
          <View style={styles.coinsHeader}>
            <Text style={styles.coinsLabel}>Available Coins</Text>
            <Ionicons name="trophy" size={24} color="#ffd700" />
          </View>
          <Text style={styles.coinsAmount}>🪙 {wallet?.coins || 0}</Text>
          <Text style={styles.coinsSubtext}>
            Lifetime Earned: {wallet?.lifetimeCoins || 0} coins
          </Text>
        </LinearGradient>

        {/* Redeem Coupons Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Redeem Coupons</Text>
          <Text style={styles.sectionSubtitle}>
            Earn 10 coins per product purchased. Min order $100.
          </Text>

          <View style={styles.couponTiersContainer}>
            {/* Bronze */}
            <TouchableOpacity
              style={[
                styles.couponTier,
                { backgroundColor: "#cd7f32" },
                (wallet?.coins || 0) < 100 && styles.couponTierDisabled,
              ]}
              onPress={() => handleRedeemCoupon("bronze")}
              disabled={(wallet?.coins || 0) < 100 || isRedeeming}
            >
              <Ionicons name="medal" size={32} color="#fff" />
              <Text style={styles.couponTierName}>Bronze</Text>
              <Text style={styles.couponTierDiscount}>10% OFF</Text>
              <Text style={styles.couponTierCoins}>100 coins</Text>
            </TouchableOpacity>

            {/* Silver */}
            <TouchableOpacity
              style={[
                styles.couponTier,
                { backgroundColor: "#c0c0c0" },
                (wallet?.coins || 0) < 300 && styles.couponTierDisabled,
              ]}
              onPress={() => handleRedeemCoupon("silver")}
              disabled={(wallet?.coins || 0) < 300 || isRedeeming}
            >
              <Ionicons name="medal" size={32} color="#fff" />
              <Text style={styles.couponTierName}>Silver</Text>
              <Text style={styles.couponTierDiscount}>35% OFF</Text>
              <Text style={styles.couponTierCoins}>300 coins</Text>
            </TouchableOpacity>

            {/* Gold */}
            <TouchableOpacity
              style={[
                styles.couponTier,
                { backgroundColor: "#ffd700" },
                (wallet?.coins || 0) < 500 && styles.couponTierDisabled,
              ]}
              onPress={() => handleRedeemCoupon("gold")}
              disabled={(wallet?.coins || 0) < 500 || isRedeeming}
            >
              <Ionicons name="medal" size={32} color="#fff" />
              <Text style={styles.couponTierName}>Gold</Text>
              <Text style={styles.couponTierDiscount}>60% OFF</Text>
              <Text style={styles.couponTierCoins}>500 coins</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Active Coupons */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Active Coupons</Text>
          {isCouponsLoading ? (
            <ActivityIndicator size="small" color="#667eea" />
          ) : coupons && coupons.length > 0 ? (
            coupons.map((coupon) => (
              <View key={coupon._id} style={styles.couponCard}>
                <View style={styles.couponHeader}>
                  <View
                    style={[
                      styles.couponBadge,
                      {
                        backgroundColor:
                          coupon.type === "bronze"
                            ? "#cd7f32"
                            : coupon.type === "silver"
                              ? "#c0c0c0"
                              : "#ffd700",
                      },
                    ]}
                  >
                    <Text style={styles.couponBadgeText}>
                      {coupon.type.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.couponDiscount}>
                    {coupon.discount}% OFF
                  </Text>
                </View>
                <Text style={styles.couponCode}>{coupon.code}</Text>
                <Text style={styles.couponExpiry}>
                  Expires: {new Date(coupon.expiresAt).toLocaleDateString()}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No active coupons</Text>
          )}
        </View>

        {/* Recent Transactions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          {isTransactionsLoading ? (
            <ActivityIndicator size="small" color="#667eea" />
          ) : transactions && transactions.length > 0 ? (
            transactions.slice(0, 10).map((transaction, index) => (
              <View key={index} style={styles.transactionCard}>
                <View style={styles.transactionLeft}>
                  <Ionicons
                    name={
                      transaction.type === "earned"
                        ? "add-circle"
                        : transaction.type === "redeemed"
                          ? "remove-circle"
                          : "alert-circle"
                    }
                    size={24}
                    color={
                      transaction.type === "earned"
                        ? "#27ae60"
                        : transaction.type === "redeemed"
                          ? "#e74c3c"
                          : "#95a5a6"
                    }
                  />
                  <View style={styles.transactionDetails}>
                    <Text style={styles.transactionDescription}>
                      {transaction.description}
                    </Text>
                    <Text style={styles.transactionDate}>
                      {new Date(transaction.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
                <Text
                  style={[
                    styles.transactionAmount,
                    {
                      color:
                        transaction.type === "earned"
                          ? "#27ae60"
                          : transaction.type === "redeemed"
                            ? "#e74c3c"
                            : "#95a5a6",
                    },
                  ]}
                >
                  {transaction.amount > 0 ? "+" : ""}
                  {transaction.amount}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No transactions yet</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#ffffff",
  },
  coinsCard: {
    padding: 24,
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  coinsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  coinsLabel: {
    fontSize: 16,
    color: "#ffffff",
    opacity: 0.9,
  },
  coinsAmount: {
    fontSize: 48,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 8,
  },
  coinsSubtext: {
    fontSize: 14,
    color: "#ffffff",
    opacity: 0.8,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#999999",
    marginBottom: 16,
  },
  couponTiersContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  couponTier: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  couponTierDisabled: {
    opacity: 0.5,
  },
  couponTierName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#ffffff",
    marginTop: 8,
  },
  couponTierDiscount: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#ffffff",
    marginTop: 4,
  },
  couponTierCoins: {
    fontSize: 12,
    color: "#ffffff",
    marginTop: 4,
  },
  couponCard: {
    backgroundColor: "#1E1E1E",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  couponHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  couponBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  couponBadgeText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#ffffff",
  },
  couponDiscount: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1DB954",
  },
  couponCode: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1DB954",
    marginBottom: 4,
  },
  couponExpiry: {
    fontSize: 12,
    color: "#999999",
  },
  transactionCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#1E1E1E",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  transactionLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  transactionDetails: {
    marginLeft: 12,
    flex: 1,
  },
  transactionDescription: {
    fontSize: 14,
    color: "#ffffff",
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 12,
    color: "#999999",
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: "bold",
  },
  emptyText: {
    fontSize: 14,
    color: "#999999",
    textAlign: "center",
    marginTop: 20,
  },
});

export default WalletScreen;
