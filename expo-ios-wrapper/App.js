import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, StyleSheet, Platform, Text, View, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import * as SplashScreen from 'expo-splash-screen';
import { useCallback, useMemo, useRef, useState } from 'react';

SplashScreen.preventAutoHideAsync();

const APP_URL = 'https://49591681-5167-4dba-9528-350383bb09f8-00-zhm23k33wr5b.kirk.replit.dev';

export default function App() {
  const webViewRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const source = useMemo(() => ({ uri: `${APP_URL}/auth` }), []);

  const onLoadEnd = useCallback(() => {
    if (!isLoaded) {
      setIsLoaded(true);
      SplashScreen.hideAsync();
    }
  }, [isLoaded]);

  const onError = useCallback(() => {
    setHasError(true);
    SplashScreen.hideAsync();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      {hasError ? (
        <View style={styles.errorWrap}>
          <ActivityIndicator color="#fff" />
          <Text style={styles.errorTitle}>ShortHop is loading</Text>
          <Text style={styles.errorText}>Please check your connection and try again.</Text>
        </View>
      ) : (
        <WebView
          ref={webViewRef}
          source={source}
          style={styles.webview}
          onLoadEnd={onLoadEnd}
          onError={onError}
          onHttpError={onError}
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
          originWhitelist={['https://*', 'http://*']}
          userAgent={`ShortHop-iOS/1.0.0 ${Platform.OS}`}
        />
      )}
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
  errorWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#1a1a2e',
    padding: 24,
  },
  errorTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  errorText: {
    color: '#cbd5e1',
    textAlign: 'center',
  },
});
