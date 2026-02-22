import { useQuery } from "@tanstack/react-query";
import { useApi } from "@/lib/api";
import { Product } from "@/types";

export interface Recommendation {
  product: Product;
  reason: string;
  type: "category_match" | "top_rated" | "new_arrival";
}

const useRecommendations = () => {
  const api = useApi();

  return useQuery<Recommendation[]>({
    queryKey: ["recommendations"],
    queryFn: async () => {
      try {
        const { data } = await api.get(
          "/products/recommendations/personalized",
        );
        return data.recommendations;
      } catch (error: any) {
        throw error;
      }
    },
  });
};

export default useRecommendations;
