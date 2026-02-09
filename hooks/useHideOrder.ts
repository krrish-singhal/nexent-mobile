import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/lib/api";

export const useHideOrder = () => {
  const api = useApi();
  const queryClient = useQueryClient();

  const hideOrder = useMutation({
    mutationFn: async (orderId: string) => {
      // ...existing code...
      const response = await api.delete(`/orders/${orderId}`);
      return response.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["orders"] });
      await queryClient.refetchQueries({ queryKey: ["orders"] });
    },
    onError: (error: any) => {
      console.error("Hide order error:", error.response?.data || error.message);
    },
  });

  return {
    hideOrder: hideOrder.mutateAsync,
    isHiding: hideOrder.isPending,
  };
};
