import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, Image, Easing } from 'react-native';

export default function SplashScreen({ visible, onDone }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(1)).current;
  const stretchAnim = useRef(new Animated.Value(0.6)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );

    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1.25, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 1, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );

    const stretch = Animated.loop(
      Animated.sequence([
        Animated.timing(stretchAnim, { toValue: 1.8, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(stretchAnim, { toValue: 0.6, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );

    pulse.start();
    glow.start();
    stretch.start();

    return () => {
      pulse.stop();
      glow.stop();
      stretch.stop();
    };
  }, []);

  useEffect(() => {
    if (!visible) {
      Animated.timing(opacityAnim, { toValue: 0, duration: 500, useNativeDriver: true }).start(() => {
        if (onDone) onDone();
      });
    }
  }, [visible]);

  const innerGlow = glowAnim.interpolate({
    inputRange: [1, 1.25],
    outputRange: [0.5, 0.9],
  });

  const outerGlow = stretchAnim.interpolate({
    inputRange: [0.6, 1.8],
    outputRange: [0, 0.4],
  });

  return (
    <Animated.View style={[styles.container, { opacity: opacityAnim }]} pointerEvents={visible ? 'auto' : 'none'}>
      <View style={styles.ring}>
        {/* Outer stretch glow */}
        <Animated.View
          style={[
            styles.outerGlow,
            {
              transform: [{ scale: stretchAnim }],
              opacity: outerGlow,
            },
          ]}
        />
        {/* Inner pulse glow */}
        <Animated.View
          style={[
            styles.innerGlow,
            {
              transform: [{ scale: glowAnim }],
              opacity: innerGlow,
            },
          ]}
        />
        {/* Icon */}
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <Image source={require('./assets/splash.png')} style={styles.icon} />
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99999,
    elevation: 99999,
  },
  ring: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    width: 120,
    height: 120,
    borderRadius: 14,
  },
  innerGlow: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(249,115,22,0.4)',
  },
  outerGlow: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(249,115,22,0.2)',
  },
});
