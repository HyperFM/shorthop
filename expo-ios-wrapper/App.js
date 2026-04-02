import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, StyleSheet, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import * as SplashScreen from 'expo-splash-screen';
import { useCallback, useRef, useState } from 'react';

SplashScreen.preventAutoHideAsync();

const APP_URL = 'https://shorthop.replit.app';

export default function App() {
  const webViewRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const onLoadEnd = useCallback(() => {
    if (!isLoaded) {
      setIsLoaded(true);
      SplashScreen.hideAsync();
    }
  }, [isLoaded]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <WebView
        ref={webViewRef}
        source={{ uri: APP_URL }}
        style={styles.webview}
        onLoadEnd={onLoadEnd}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        allowsBackForwardNavigationGestures={true}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        sharedCookiesEnabled={true}
        thirdPartyCookiesEnabled={true}
        cacheEnabled={true}
        pullToRefreshEnabled={true}
        allowsFullscreenVideo={true}
        geolocationEnabled={true}
        userAgent={`ShortHop-iOS/1.0.0 ${Platform.OS}`}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  webview: {
    flex: 1,
  },
});
