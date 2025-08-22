import React, { useMemo, useRef, useState } from 'react';
import { View, StyleSheet, Text, Pressable, PanResponder, Animated, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Check, ZoomIn, ZoomOut } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useAppState } from '@/providers/AppStateProvider';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function CoverEditorScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { albums, setAlbumCoverTransform } = useAppState();
  const album = useMemo(() => albums.find(a => a.id === id), [albums, id]);

  const scale = useRef(new Animated.Value(album?.coverTransform?.scale ?? 1)).current;
  const offsetX = useRef(new Animated.Value(album?.coverTransform?.offsetX ?? 0)).current;
  const offsetY = useRef(new Animated.Value(album?.coverTransform?.offsetY ?? 0)).current;

  const [currentScale, setCurrentScale] = useState<number>(album?.coverTransform?.scale ?? 1);
  const [currentOffset, setCurrentOffset] = useState<{ x: number; y: number }>({ x: album?.coverTransform?.offsetX ?? 0, y: album?.coverTransform?.offsetY ?? 0 });

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderMove: Animated.event([
      null,
      { dx: offsetX, dy: offsetY }
    ], { useNativeDriver: false }),
    onPanResponderRelease: () => {
      offsetX.stopAnimation((x: number) => setCurrentOffset(prev => ({ ...prev, x })));
      offsetY.stopAnimation((y: number) => setCurrentOffset(prev => ({ ...prev, y })));
    }
  }), [offsetX, offsetY]);

  const apply = () => {
    if (!album) return;
    const t = { scale: currentScale, offsetX: currentOffset.x, offsetY: currentOffset.y };
    setAlbumCoverTransform(album.id, t);
    router.back();
  };

  if (!album) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#000000', '#0B0B0D', '#131417']} style={StyleSheet.absoluteFillObject} />
        <SafeAreaView style={styles.safe}>
          <Text style={styles.title}>Album introuvable</Text>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#000000', '#0B0B0D', '#131417']} style={StyleSheet.absoluteFillObject} />
      <SafeAreaView style={styles.safe} edges={['top','bottom']}>
        <View style={styles.header}>
          <Pressable style={styles.round} onPress={() => router.back()}>
            <ArrowLeft color="#fff" size={20} />
          </Pressable>
          <Text style={styles.title}>Éditeur de couverture</Text>
          <Pressable style={[styles.round, styles.apply]} onPress={apply} testID="apply-cover-transform">
            <Check color="#000" size={20} />
          </Pressable>
        </View>

        <View style={styles.stage}>
          <Animated.View style={{ transform: [{ translateX: offsetX }, { translateY: offsetY }, { scale: scale }] }} {...panResponder.panHandlers}>
            <Image source={{ uri: album.coverImage ?? '' }} style={styles.cover} contentFit="cover" />
          </Animated.View>
        </View>

        <View style={styles.controls}>
          <Pressable style={styles.ctrl} onPress={() => { const ns = Math.max(0.5, currentScale - 0.1); setCurrentScale(ns); Animated.timing(scale, { toValue: ns, duration: 120, useNativeDriver: true }).start(); }}>
            <ZoomOut color="#fff" size={18} />
          </Pressable>
          <Text style={styles.value}>{currentScale.toFixed(2)}x</Text>
          <Pressable style={styles.ctrl} onPress={() => { const ns = Math.min(2.5, currentScale + 0.1); setCurrentScale(ns); Animated.timing(scale, { toValue: ns, duration: 120, useNativeDriver: true }).start(); }}>
            <ZoomIn color="#fff" size={18} />
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 },
  round: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  apply: { backgroundColor: '#FFD700' },
  title: { color: '#fff', fontSize: 16, fontWeight: '800' },
  stage: { flex: 1, margin: 16, borderRadius: 12, overflow: 'hidden', backgroundColor: '#111', alignItems: 'center', justifyContent: 'center' },
  cover: { width: screenWidth - 32, height: screenHeight * 0.5, borderRadius: 12 },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, paddingBottom: 16 },
  ctrl: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  value: { color: '#fff', fontWeight: '700' },
});
