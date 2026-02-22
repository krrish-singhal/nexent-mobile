import { useAuth } from "@clerk/clerk-expo";
import axios, { AxiosInstance } from "axios";
import { useEffect } from "react";

/**
 * ENV VALIDATION (FAIL FAST)
 */
const API_URL = process.env.EXPO_PUBLIC_API_URL;

if (!API_URL) {
  throw new Error(
    "❌ EXPO_PUBLIC_API_URL is missing. App cannot run in production.",
  );
}

if (__DEV__) {
  console.log("✅ API BASE URL:", API_URL);
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
 * RESPONSE LOGGER (DEBUG SAFE)
 */
api.interceptors.response.use(
  (response) => {
    if (__DEV__) {
      console.log(
        `✅ API ${response.config.method?.toUpperCase()} ${response.config.url} → ${response.status}`,
      );
    }
    return response;
  },
  (error) => {
    if (__DEV__) {
      console.error("❌ API ERROR", {
        url: error.config?.url,
        baseURL: error.config?.baseURL,
        status: error.response?.status,
        message: error.message,
        data: error.response?.data,
      });
    }
    return Promise.reject(error);
  },
);

/**
 * MODULE-LEVEL INTERCEPTOR TRACKING
 * Prevents duplicate interceptors when multiple components call useApi()
 * simultaneously, which would cause every request to fire N times.
 */
let authInterceptorId: number | null = null;
let hookConsumerCount = 0;

/**
 * AUTH-AWARE API HOOK
 */
export const useApi = (): AxiosInstance => {
  const { getToken, isLoaded } = useAuth();

  useEffect(() => {
    if (!isLoaded) return;

    hookConsumerCount++;

    // Only attach one interceptor regardless of how many components call useApi()
    if (authInterceptorId === null) {
      if (__DEV__) {
        console.log("🔐 Attaching auth interceptor");
      }

      authInterceptorId = api.interceptors.request.use(
        async (config) => {
          try {
            const token = await getToken();

            // Attach token ONLY if user is authenticated
            if (token) {
              config.headers.Authorization = `Bearer ${token}`;
            }

            if (__DEV__) {
              console.log(
                `🌐 REQUEST → ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`,
              );
            }
          } catch (err) {
            if (__DEV__) {
              console.error("❌ Token fetch failed", err);
            }
          }

          return config;
        },
        (error) => Promise.reject(error),
      );
    }

    return () => {
      hookConsumerCount--;
      // Only eject when the last consumer unmounts
      if (hookConsumerCount === 0 && authInterceptorId !== null) {
        api.interceptors.request.eject(authInterceptorId);
        authInterceptorId = null;
      }
    };
  }, [isLoaded]); // getToken is stable; isLoaded is what gates attachment

  return api;
};

export default api;
