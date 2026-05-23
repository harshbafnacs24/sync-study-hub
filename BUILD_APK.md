# 📱 Build Sync & Study Hub APK

Follow these steps exactly to get a shareable APK on your PC.

---

## Prerequisites — install these first

| Tool | Download |
|------|----------|
| **Android Studio** | developer.android.com/studio |
| **Java JDK 17** | adoptium.net (Temurin 17 LTS) |
| **Node.js 20+** | nodejs.org |
| **Bun** | bun.sh |

After installing Android Studio, open it once and let it download the Android SDK.

---

## Part A — Google Cloud Setup (for Google Sign-In)

### 1. Create OAuth credentials

1. Go to **console.cloud.google.com**
2. Create a new project called `sync-study-hub`
3. Go to **APIs & Services → OAuth consent screen**
   - Choose **External** → fill in App name: "Sync & Study Hub"
   - Add your email as test user
4. Go to **APIs & Services → Credentials → Create Credentials → OAuth Client ID**

### 2. Create a Web Client ID (for the backend)
- Application type: **Web application**
- Name: `Sync Study Web`
- Authorized redirect URIs: add your Vercel/Railway URLs
- **Copy the Client ID** — looks like `123456.apps.googleusercontent.com`

### 3. Create an Android Client ID
- Application type: **Android**
- Package name: `com.syncstudy.hub`
- SHA-1 fingerprint: run this in PowerShell to get it:
  ```powershell
  keytool -list -v -keystore "%USERPROFILE%\.android\debug.keystore" -alias androiddebugkey -storepass android -keypass android
  ```
  Copy the SHA1 line.
- **Copy the Android Client ID**

### 4. Download google-services.json
- In Google Cloud Console → **Project Settings → General → Your Apps → Add App → Android**
- Package name: `com.syncstudy.hub`
- Download the `google-services.json` file

---

## Part B — Configure the project

### 5. Set environment variables

Create a `.env.local` file in the root of the project:
```
VITE_API_BASE_URL=https://your-railway-backend.up.railway.app
VITE_GOOGLE_CLIENT_ID=YOUR_WEB_CLIENT_ID.apps.googleusercontent.com
```

Update `capacitor.config.ts` — replace `REPLACE_WITH_WEB_CLIENT_ID` with your actual Web Client ID.

Update Railway backend env vars:
```
CORS_ORIGIN=https://your-vercel-app.vercel.app,capacitor://localhost,http://localhost
GOOGLE_CLIENT_ID=YOUR_WEB_CLIENT_ID.apps.googleusercontent.com
```

---

## Part C — Build the APK

### 6. Install dependencies
```powershell
cd "C:\Users\HARSH BAFNA\Desktop\sync-study-hub"
bun install
cd server && npm install && cd ..
```

### 7. Build the web app
```powershell
bun run build
```
This creates the `.output/public` folder.

### 8. Add the Android platform (first time only)
```powershell
npx cap add android
```

### 9. Copy google-services.json into the Android project
```powershell
Copy-Item "android-assets\google-services.json" "android\app\google-services.json" -Force
```

### 10. Copy Android icons into the project
```powershell
# Copy all mipmap icon folders
Copy-Item "android-assets\icons\mipmap-*" "android\app\src\main\res\" -Recurse -Force
```

### 11. Sync web build to Android
```powershell
npx cap sync android
```

### 12. Open in Android Studio
```powershell
npx cap open android
```
Android Studio will open automatically.

### 13. Build the debug APK in Android Studio
1. Wait for Gradle to sync (bottom progress bar)
2. Go to **Build → Build Bundle(s) / APK(s) → Build APK(s)**
3. Wait for the build (2-3 minutes)
4. Click **locate** in the popup — it opens the folder with the APK

### 14. Find your APK
```
android\app\build\outputs\apk\debug\app-debug.apk
```

---

## Part D — Share with friends

### Send the APK
- WhatsApp, Google Drive, AirDrop, email — any method works
- File size will be ~8-15 MB

### Friends install it (30 seconds)
Tell your friends:
1. Open the APK file on their Android phone
2. If prompted: **Settings → Install unknown apps → Allow**
3. Tap **Install**
4. App opens — sign up or log in

---

## Part E — Build a Release APK (for wider sharing)

A debug APK works fine for friends. For a proper signed release APK:

```powershell
# Generate a keystore (do this once, save it safely)
keytool -genkey -v -keystore sync-study-release.jks -keyalg RSA -keysize 2048 -validity 10000 -alias sync-study

# In Android Studio: Build → Generate Signed Bundle/APK → APK → use your .jks file
```

---

## Troubleshooting

**"SDK not found"** — Open Android Studio → SDK Manager → install Android 14 (API 34)

**"Gradle sync failed"** — File → Sync Project with Gradle Files

**Google Sign-In not working on APK** — Check that your SHA-1 fingerprint in Google Cloud matches your debug keystore

**App crashes on launch** — Check that `VITE_API_BASE_URL` points to your live Railway backend, not localhost

**"Install blocked"** on friend's phone — They need to enable "Install from unknown sources" in Settings → Security

