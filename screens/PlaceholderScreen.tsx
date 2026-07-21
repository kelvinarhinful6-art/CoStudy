import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SkyBackground from './SkyBackground';
import { colors } from '../theme';
import type { IconName } from '../types';

// Reusable "coming soon" screen so the tabs work before we build each one.
export default function PlaceholderScreen({ title, icon }: { title: string; icon: IconName }) {
  const insets = useSafeAreaInsets();
  return (
    <SkyBackground>
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <Ionicons name={icon} size={48} color="rgba(255,255,255,0.9)" />
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.sub}>Coming next</Text>
      </View>
    </SkyBackground>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  title: { color: '#fff', fontSize: 22, fontWeight: '600' },
  sub: { color: 'rgba(255,255,255,0.8)', fontSize: 14 },
});
