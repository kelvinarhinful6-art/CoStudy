import React from 'react';
import { StyleSheet, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';

// Wrap any screen in this to get the ocean sky + faint floating study items.
export default function SkyBackground({ children }: { children: React.ReactNode }) {
  return (
    <LinearGradient colors={colors.sky} style={styles.fill}>
      <StatusBar barStyle="light-content" />
      <Ionicons name="book" size={42} color="rgba(255,255,255,0.12)" style={styles.a} />
      <Ionicons name="pencil" size={48} color="rgba(255,255,255,0.12)" style={styles.b} />
      <Ionicons name="library" size={38} color="rgba(255,255,255,0.10)" style={styles.c} />
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  a: { position: 'absolute', top: 110, left: 24 },
  b: { position: 'absolute', top: 260, right: 26, transform: [{ rotate: '18deg' }] },
  c: { position: 'absolute', bottom: 160, left: 36 },
});
