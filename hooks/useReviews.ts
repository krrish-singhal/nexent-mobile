import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/lib/api";

interface CreateReviewData {
  productId: string;
  orderId: string;
  rating: number;
}

export const useReviews = () => {
  const api = useApi();
  const queryClient = useQueryClient();

  const createReview = useMutation({
    mutationFn: async (data: CreateReviewData) => {
      const response = await api.post("/review", data);
      return response.data;
    },
    onSuccess: async () => {
      // Invalidate and refetch immediately
      await queryClient.invalidateQueries({ queryKey: ["products"] });
      await queryClient.invalidateQueries({ queryKey: ["orders"] });
      await queryClient.refetchQueries({ queryKey: ["orders"] });
    },
  });

  return {
    isCreatingReview: createReview.isPending,
    createReviewAsync: createReview.mutateAsync,
  };
};
