import { StyleSheet, Platform, Text, View, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import useIconRotation from './useIconRotation';
import SplashScreen from './SplashScreen';

const APP_URL = 'https://shorthop.site';

export default function App() {
  useIconRotation();

  const webViewRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const source = useMemo(() => ({ uri: `${APP_URL}/auth` }), []);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 6000);
    return () => clearTimeout(timer);
  }, []);

  const onLoadEnd = useCallback(() => {
    if (!isLoaded) {
      setIsLoaded(true);
    }
  }, [isLoaded]);

  const onError = useCallback(() => {
    setHasError(true);
  }, []);

  return (
    <View style={styles.container}>
      <SplashScreen visible={showSplash} onDone={() => setShowSplash(false)} />
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
          automaticallyAdjustContentInsets={false}
          contentInsetAdjustmentBehavior="never"
          textZoom={100}
          userAgent={`ShortHop-iOS/1.0.0 ${Platform.OS}`}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FD7700',
    paddingTop: 0,
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
