import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/lib/api";
import { Order } from "@/types";

export const useOrders = () => {
  const api = useApi();
  const queryClient = useQueryClient();

  const ordersQuery = useQuery<Order[]>({
    queryKey: ["orders"],
    queryFn: async () => {
      try {
        const { data } = await api.get("/orders");
        // ...existing code...
        return data.orders;
      } catch (error: any) {
        console.error(
          "Failed to fetch orders:",
          error.response?.data || error.message,
        );
        throw error;
      }
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const { data } = await api.post(`/orders/reorder/${orderId}`);
      return data;
    },
  });

  return {
    ...ordersQuery,
    reorder: reorderMutation.mutateAsync,
    isReordering: reorderMutation.isPending,
    reorderError: reorderMutation.error,
  };
};
