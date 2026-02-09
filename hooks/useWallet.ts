import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/lib/api";

export interface WalletTransaction {
  type: "earned" | "redeemed" | "expired";
  amount: number;
  description: string;
  orderId?: string;
  couponId?: string;
  createdAt: string;
}

export interface Wallet {
  _id: string;
  user: string;
  clerkId: string;
  coins: number;
  lifetimeCoins: number;
  transactions: WalletTransaction[];
  createdAt: string;
  updatedAt: string;
}

export interface Coupon {
  _id: string;
  user: string;
  clerkId: string;
  code: string;
  type: "bronze" | "silver" | "gold";
  discount: number;
  coinsRequired: number;
  isUsed: boolean;
  usedAt?: string;
  orderId?: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

const useWallet = () => {
  const api = useApi();
  const queryClient = useQueryClient();

  // Get wallet
  const {
    data: wallet,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["wallet"],
    queryFn: async () => {
      const { data } = await api.get<{ wallet: Wallet }>("/wallet");
      return data.wallet;
    },
  });

  // Get coupons
  const { data: coupons, isLoading: isCouponsLoading } = useQuery({
    queryKey: ["coupons"],
    queryFn: async () => {
      const { data } = await api.get<{ coupons: Coupon[] }>("/wallet/coupons");
      return data.coupons;
    },
  });

  // Get transactions
  const { data: transactions, isLoading: isTransactionsLoading } = useQuery({
    queryKey: ["wallet-transactions"],
    queryFn: async () => {
      const { data } = await api.get<{ transactions: WalletTransaction[] }>(
        "/wallet/transactions",
      );
      return data.transactions;
    },
  });

  // Redeem coupon
  const redeemCouponMutation = useMutation({
    mutationFn: async (type: "bronze" | "silver" | "gold") => {
      const { data } = await api.post<{
        message: string;
        coupon: Coupon;
        wallet: Wallet;
        expiryInfo: {
          expiresAt: string;
          expiryDate: string;
          daysValid: number;
          singleUse: boolean;
        };
      }>("/wallet/redeem", { type });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      queryClient.invalidateQueries({ queryKey: ["coupons"] });
      queryClient.invalidateQueries({ queryKey: ["wallet-transactions"] });
    },
  });

  // Validate coupon
  const validateCouponMutation = useMutation({
    mutationFn: async ({
      code,
      orderValue,
    }: {
      code: string;
      orderValue: number;
    }) => {
      const { data } = await api.post<{
        valid: boolean;
        coupon: Coupon;
        discount: number;
        finalPrice: number;
      }>("/wallet/validate-coupon", { code, orderValue });
      return data;
    },
  });

  return {
    wallet,
    isLoading,
    isError,
    coupons,
    isCouponsLoading,
    transactions,
    isTransactionsLoading,
    redeemCoupon: redeemCouponMutation.mutate,
    redeemCouponAsync: redeemCouponMutation.mutateAsync,
    isRedeeming: redeemCouponMutation.isPending,
    redeemError: redeemCouponMutation.error,
    redeemSuccess: redeemCouponMutation.isSuccess,
    redeemData: redeemCouponMutation.data,
    validateCoupon: validateCouponMutation.mutateAsync,
    isValidating: validateCouponMutation.isPending,
  };
};

export default useWallet;
