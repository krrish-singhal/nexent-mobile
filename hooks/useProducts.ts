import { useQuery } from "@tanstack/react-query";
import { useApi } from "@/lib/api";
import { Product } from "@/types";

export const useProducts = () => {
  const api = useApi();

  const result = useQuery<Product[]>({
    queryKey: ["products"],
    queryFn: async () => {
      try {
        const { data } = await api.get("/products");
        return data;
      } catch (error: any) {
        throw error;
      }
    },
  });

  return result;
};
