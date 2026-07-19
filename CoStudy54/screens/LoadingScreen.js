import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated, Easing, Image } from "react-native";

export default function LoadingScreen() {
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scaleAnim, {
            toValue: 1.1,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(scaleAnim, {
            toValue: 0.8,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0.5,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ])
    ).start();
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={{ transform: [{ scale: scaleAnim }], opacity: opacityAnim }}>
        <Image source={require("../assets/splash-icon.png")} style={styles.logo} />
      </Animated.View>
      
      <Text style={styles.title}>CoStudy</Text>
      <Text style={styles.tagline}>Study together. Achieve more.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0b3a4a",
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 24,
    resizeMode: "contain",
  },
  title: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "700",
    letterSpacing: 1,
  },
  tagline: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
    marginTop: 8,
    fontStyle: "italic",
  },
});