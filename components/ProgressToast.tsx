import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface ProgressToastProps {
  visible: boolean;
  label: string;
  progress?: number; // 0..1
}

export default function ProgressToast({ visible, label, progress }: ProgressToastProps) {
  if (!visible) return null;
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.label}>{label}</Text>
        {typeof progress === 'number' && (
          <View style={styles.bar}><View style={[styles.fill, { width: `${Math.max(0, Math.min(1, progress)) * 100}%` }]} /></View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'absolute', bottom: 30, left: 0, right: 0, alignItems: 'center', zIndex: 999 },
  card: { backgroundColor: 'rgba(0,0,0,0.8)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  label: { color: '#fff', fontWeight: '700' },
  bar: { height: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2, overflow: 'hidden', marginTop: 8 },
  fill: { height: '100%', backgroundColor: '#FFD700' },
});
