import { useAuth } from "@clerk/clerk-expo";
import axios, { AxiosInstance } from "axios";
import { useEffect } from "react";

/**
 * ENV VALIDATION
 */
const API_URL = process.env.EXPO_PUBLIC_API_URL;

if (!API_URL) {
  throw new Error(
    "EXPO_PUBLIC_API_URL is missing. App cannot run in production.",
  );
}

/**
 * AXIOS INSTANCE
 */
const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

/**
 * AUTH-AWARE API HOOK
 */
export const useApi = (): AxiosInstance => {
  const { getToken, isLoaded } = useAuth();

  useEffect(() => {
    if (!isLoaded) return;

    const interceptor = api.interceptors.request.use(
      async (config) => {
        try {
          const token = await getToken();
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        } catch {
          // ignore token errors
        }
        return config;
      },
      (error) => Promise.reject(error),
    );

    return () => {
      api.interceptors.request.eject(interceptor);
    };
  }, [isLoaded]);

  return api;
};

export default api;
