import { useAuth } from "@clerk/clerk-expo";
import axios, { AxiosInstance } from "axios";
import { useEffect, useRef } from "react";

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
 * AUTH-AWARE API HOOK
 */
export const useApi = (): AxiosInstance => {
  const { getToken, isLoaded } = useAuth();
  const interceptorId = useRef<number | null>(null);

  useEffect(() => {
    if (!isLoaded) {
      if (__DEV__) {
        console.log("⏳ Clerk not loaded yet, skipping interceptor");
      }
      return;
    }

    if (__DEV__) {
      console.log("🔐 Attaching auth interceptor");
    }

    if (interceptorId.current !== null) {
      api.interceptors.request.eject(interceptorId.current);
    }

    interceptorId.current = api.interceptors.request.use(
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

    return () => {
      if (interceptorId.current !== null) {
        api.interceptors.request.eject(interceptorId.current);
        interceptorId.current = null;
      }
    };
  }, [getToken, isLoaded]);

  return api;
};

export default api;
