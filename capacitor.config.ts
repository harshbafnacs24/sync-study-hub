import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.syncstudy.hub",
  appName: "Sync & Study",
  webDir: ".output/public",
  bundledWebRuntime: false,

  server: {
    // Point to your live Railway backend when running as APK
    // The app itself is served from the bundled web assets
    androidScheme: "https",
    allowNavigation: ["*.railway.app", "*.mongodb.net"],
  },

  android: {
    buildOptions: {
      releaseType: "APK",
    },
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false, // set true only for dev
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 1800,
      launchAutoHide: true,
      backgroundColor: "#0C0C0C",
      androidSplashResourceName: "splash",
      showSpinner: false,
    },

    StatusBar: {
      style: "Dark",
      backgroundColor: "#0C0C0C",
      overlaysWebView: false,
    },

    Keyboard: {
      resize: "body",
      style: "dark",
      resizeOnFullScreen: true,
    },

    GoogleAuth: {
      // Replace with your actual Web Client ID from Google Cloud Console
      // (the Web client, NOT Android client)
      clientId: "REPLACE_WITH_WEB_CLIENT_ID.apps.googleusercontent.com",
      scopes: ["profile", "email"],
      serverClientId: "REPLACE_WITH_WEB_CLIENT_ID.apps.googleusercontent.com",
      forceCodeForRefreshToken: true,
    },
  },
};

export default config;
