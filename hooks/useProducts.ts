import { useQuery } from "@tanstack/react-query";
import { useApi } from "@/lib/api";
import { Product } from "@/types";

export const useProducts = () => {
  const api = useApi();

  const result = useQuery<Product[]>({
    queryKey: ["products"],
    queryFn: async () => {
      try {
        if (__DEV__) {
          console.log("Fetching products from API...");
        }
        const { data } = await api.get("/products");
        if (__DEV__) {
          console.log("Products fetched successfully:", data?.length || 0, "items");
        }
        return data;
      } catch (error: any) {
        if (__DEV__) {
          console.error("Failed to fetch products:", error.message);
          console.error("Error details:", error.response?.data || error);
        }
        throw error;
      }
    },
  });

  return result;
};
