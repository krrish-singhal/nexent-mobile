module.exports = {
  expo: {
    name: "Nexent",
    slug: "nexent",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "nexent",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    extra: {
      router: {},
      eas: {
        projectId: "092cd63a-e7db-44f4-bb3a-826e1d3d2823",
      },
      // Ensure environment variables are available in production
      EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY:
        process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ||
        "pk_test_am9pbnQtc25ha2UtMTMuY2xlcmsuYWNjb3VudHMuZGV2JA",
      EXPO_PUBLIC_API_URL:
        process.env.EXPO_PUBLIC_API_URL ||
        "https://nexent-backend.onrender.com",
      EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY:
        process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
        "pk_test_51RHR0o2c4ku0H0C6WdiOOYvYB8p6hWRw3HymzsCiPQX2fRtXFxNH9nBOKUoJzsahDd4BTuDMIrDRD7lsFu2CXR5a00YQZg1Ukb",
      EXPO_PUBLIC_SENTRY_DSN:
        process.env.EXPO_PUBLIC_SENTRY_DSN ||
        "https://d7ae43d5a1fea3b47357e4d5f2291d33@o4510771015188480.ingest.us.sentry.io/4510840231297024",
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.krrishsinghal2.nexent",
    },
    android: {
      adaptiveIcon: {
        backgroundColor: "#121212",
        foregroundImage: "./assets/images/icon.png",
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      package: "com.krrishsinghal2.nexent",
      permissions: [
        "INTERNET",
        "ACCESS_NETWORK_STATE",
        "ACCESS_COARSE_LOCATION",
        "ACCESS_FINE_LOCATION",
      ],
      usesCleartextTraffic: false,
    },
    web: {
      output: "static",
      favicon: "./assets/images/favicon.png",
    },
    plugins: [
      "expo-router",
      [
        "@stripe/stripe-react-native",
        {
          merchantIdentifier: "merchant.com.nexent",
          enableGooglePay: false,
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    owner: "krrish-singhal-2",
  },
};
