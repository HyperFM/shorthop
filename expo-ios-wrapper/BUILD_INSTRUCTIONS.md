# ShortHop iOS & Android Build Instructions

## Prerequisites
1. Install Node.js (v18+) on your computer
2. Install EAS CLI: `npm install -g eas-cli`
3. Create a free Expo account at https://expo.dev

## Steps to Build

### 1. Copy this folder to your computer
Download or copy the entire project folder to your Mac or PC.

### 2. Install dependencies
```bash
npm install
```

### 3. Log into Expo
```bash
eas login
```

### 4. Configure your project
```bash
eas build:configure
```

### 5. Build iOS (App Store)
Update `eas.json` with your Apple credentials, then:
```bash
eas build --platform ios --profile production
```

### 6. Build Android APK (Amazon / Galaxy Store)
```bash
eas build --platform android --profile production
```
This generates a signed APK file you can upload to Amazon Appstore or Samsung Galaxy Store.

### 7. Submit to Stores

**iOS App Store:**
```bash
eas submit --platform ios
```
Or download the IPA from Expo's dashboard and upload via Apple Transporter.

**Amazon Appstore:**
Download the APK from Expo's dashboard and upload at https://developer.amazon.com

**Samsung Galaxy Store:**
Download the APK from Expo's dashboard and upload at https://seller.samsungapps.com

## Important Notes
- The app opens directly to the sign-in/sign-up screen (`/auth`)
- Bundle ID: `com.hyperquency.shorthopapp` (same for iOS and Android)
- EAS Build runs Xcode/Android SDK in the cloud — no Mac or Android Studio required!
- The app wraps your live ShortHop web app in a native shell
- If the web content fails to load, a friendly error screen is shown instead of crashing
