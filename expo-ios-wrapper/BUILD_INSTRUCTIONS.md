# ShortHop iOS Build Instructions

## Prerequisites
1. Install Node.js (v18+) on your computer
2. Install EAS CLI: `npm install -g eas-cli`
3. Create a free Expo account at https://expo.dev

## Steps to Build

### 1. Copy this folder to your computer
Download or copy the entire `expo-ios-wrapper` folder to your Mac or PC.

### 2. Install dependencies
```bash
cd expo-ios-wrapper
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

### 5. Update eas.json with your Apple credentials
Edit `eas.json` and fill in:
- `appleId`: Your Apple ID email
- `ascAppId`: Your App Store Connect app ID
- `appleTeamId`: Your Apple Developer Team ID

### 6. Build the iOS app
```bash
eas build --platform ios --profile production
```

EAS will:
- Compile the app on Apple's servers using Xcode
- Include your icon (properly compiled into Assets.car)
- Generate a real signed IPA
- Give you a download link when done

### 7. Submit to App Store
```bash
eas submit --platform ios
```

Or download the IPA from Expo's dashboard and upload via Apple Transporter.

## Important Notes
- The app loads your ShortHop web app (https://shorthop.replit.app) inside a native WebView
- Your app icon is in `assets/icon.png`
- Bundle ID: `com.hyperquency.shorthopapp`
- EAS Build runs Xcode in the cloud — no Mac required!
