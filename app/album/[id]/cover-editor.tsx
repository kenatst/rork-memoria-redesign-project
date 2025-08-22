import React, { useMemo, useRef, useState, useCallback } from 'react';
import { View, StyleSheet, Text, Pressable, PanResponder, Animated, Dimensions, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Check, ZoomIn, ZoomOut, RotateCw, Move, Crop } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useAppState } from '@/providers/AppStateProvider';
import * as Haptics from 'expo-haptics';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function CoverEditorScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { albums, setAlbumCoverTransform } = useAppState();
  const album = useMemo(() => albums.find(a => a.id === id), [albums, id]);

  const scale = useRef(new Animated.Value(album?.coverTransform?.scale ?? 1)).current;
  const offsetX = useRef(new Animated.Value(album?.coverTransform?.offsetX ?? 0)).current;
  const offsetY = useRef(new Animated.Value(album?.coverTransform?.offsetY ?? 0)).current;
  const rotation = useRef(new Animated.Value(album?.coverTransform?.rotation ?? 0)).current;

  const [currentScale, setCurrentScale] = useState<number>(album?.coverTransform?.scale ?? 1);
  const [currentOffset, setCurrentOffset] = useState<{ x: number; y: number }>({ x: album?.coverTransform?.offsetX ?? 0, y: album?.coverTransform?.offsetY ?? 0 });
  const [currentRotation, setCurrentRotation] = useState<number>(album?.coverTransform?.rotation ?? 0);
  const [editMode, setEditMode] = useState<'move' | 'crop' | 'rotate'>('move');
  const [showGrid, setShowGrid] = useState<boolean>(true);

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => editMode === 'move',
    onMoveShouldSetPanResponder: () => editMode === 'move',
    onPanResponderGrant: () => {
      if (Platform.OS !== 'web') {
        Haptics.selectionAsync();
      }
    },
    onPanResponderMove: (evt, gestureState) => {
      if (editMode === 'move') {
        offsetX.setValue(gestureState.dx);
        offsetY.setValue(gestureState.dy);
      }
    },
    onPanResponderRelease: () => {
      offsetX.stopAnimation((x: number) => setCurrentOffset(prev => ({ ...prev, x })));
      offsetY.stopAnimation((y: number) => setCurrentOffset(prev => ({ ...prev, y })));
    }
  }), [offsetX, offsetY, editMode]);

  const handleZoom = useCallback((direction: 'in' | 'out') => {
    const increment = 0.1;
    const newScale = direction === 'in' 
      ? Math.min(3.0, currentScale + increment)
      : Math.max(0.3, currentScale - increment);
    
    setCurrentScale(newScale);
    Animated.spring(scale, {
      toValue: newScale,
      tension: 100,
      friction: 8,
      useNativeDriver: true
    }).start();
    
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
  }, [currentScale, scale]);

  const handleRotate = useCallback(() => {
    const newRotation = (currentRotation + 90) % 360;
    setCurrentRotation(newRotation);
    
    Animated.spring(rotation, {
      toValue: newRotation,
      tension: 100,
      friction: 8,
      useNativeDriver: true
    }).start();
    
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }, [currentRotation, rotation]);

  const resetTransform = useCallback(() => {
    setCurrentScale(1);
    setCurrentOffset({ x: 0, y: 0 });
    setCurrentRotation(0);
    
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
      Animated.spring(offsetX, { toValue: 0, useNativeDriver: true }),
      Animated.spring(offsetY, { toValue: 0, useNativeDriver: true }),
      Animated.spring(rotation, { toValue: 0, useNativeDriver: true })
    ]).start();
    
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
  }, [scale, offsetX, offsetY, rotation]);

  const apply = () => {
    if (!album) return;
    const t = { 
      scale: currentScale, 
      offsetX: currentOffset.x, 
      offsetY: currentOffset.y,
      rotation: currentRotation
    };
    setAlbumCoverTransform(album.id, t);
    
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    
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
          {showGrid && (
            <View style={styles.grid}>
              <View style={[styles.gridLine, styles.gridVertical1]} />
              <View style={[styles.gridLine, styles.gridVertical2]} />
              <View style={[styles.gridLine, styles.gridHorizontal1]} />
              <View style={[styles.gridLine, styles.gridHorizontal2]} />
            </View>
          )}
          
          <Animated.View 
            style={{
              transform: [
                { translateX: offsetX }, 
                { translateY: offsetY }, 
                { scale: scale },
                { rotate: rotation.interpolate({
                  inputRange: [0, 360],
                  outputRange: ['0deg', '360deg']
                })}
              ]
            }} 
            {...panResponder.panHandlers}
          >
            <Image source={{ uri: album.coverImage ?? '' }} style={styles.cover} contentFit="cover" />
          </Animated.View>
          
          {editMode === 'crop' && (
            <View style={styles.cropOverlay}>
              <View style={styles.cropFrame} />
            </View>
          )}
        </View>

        {/* Edit Mode Selector */}
        <View style={styles.modeSelector}>
          <Pressable 
            style={[styles.modeBtn, editMode === 'move' && styles.activeModeBtn]} 
            onPress={() => setEditMode('move')}
          >
            <Move color={editMode === 'move' ? '#000' : '#fff'} size={18} />
            <Text style={[styles.modeText, editMode === 'move' && styles.activeModeText]}>Déplacer</Text>
          </Pressable>
          <Pressable 
            style={[styles.modeBtn, editMode === 'crop' && styles.activeModeBtn]} 
            onPress={() => setEditMode('crop')}
          >
            <Crop color={editMode === 'crop' ? '#000' : '#fff'} size={18} />
            <Text style={[styles.modeText, editMode === 'crop' && styles.activeModeText]}>Recadrer</Text>
          </Pressable>
          <Pressable 
            style={[styles.modeBtn, editMode === 'rotate' && styles.activeModeBtn]} 
            onPress={() => setEditMode('rotate')}
          >
            <RotateCw color={editMode === 'rotate' ? '#000' : '#fff'} size={18} />
            <Text style={[styles.modeText, editMode === 'rotate' && styles.activeModeText]}>Rotation</Text>
          </Pressable>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          {editMode === 'move' && (
            <>
              <Pressable style={styles.ctrl} onPress={() => handleZoom('out')}>
                <ZoomOut color="#fff" size={18} />
              </Pressable>
              <Text style={styles.value}>{currentScale.toFixed(2)}x</Text>
              <Pressable style={styles.ctrl} onPress={() => handleZoom('in')}>
                <ZoomIn color="#fff" size={18} />
              </Pressable>
            </>
          )}
          
          {editMode === 'rotate' && (
            <>
              <Pressable style={styles.ctrl} onPress={handleRotate}>
                <RotateCw color="#fff" size={18} />
              </Pressable>
              <Text style={styles.value}>{currentRotation}°</Text>
              <Pressable style={styles.ctrl} onPress={resetTransform}>
                <Text style={styles.resetText}>Reset</Text>
              </Pressable>
            </>
          )}
          
          {editMode === 'crop' && (
            <>
              <Pressable style={styles.ctrl} onPress={() => setShowGrid(!showGrid)}>
                <Text style={styles.gridText}>{showGrid ? 'Masquer' : 'Afficher'} grille</Text>
              </Pressable>
            </>
          )}
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
  stage: { flex: 1, margin: 16, borderRadius: 12, overflow: 'hidden', backgroundColor: '#111', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  cover: { width: screenWidth - 32, height: screenHeight * 0.5, borderRadius: 12 },
  grid: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1 },
  gridLine: { position: 'absolute', backgroundColor: 'rgba(255,255,255,0.3)' },
  gridVertical1: { left: '33.33%', top: 0, bottom: 0, width: 1 },
  gridVertical2: { left: '66.66%', top: 0, bottom: 0, width: 1 },
  gridHorizontal1: { top: '33.33%', left: 0, right: 0, height: 1 },
  gridHorizontal2: { top: '66.66%', left: 0, right: 0, height: 1 },
  cropOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 2 },
  cropFrame: { flex: 1, borderWidth: 2, borderColor: '#FFD700', borderStyle: 'dashed', margin: 20 },
  modeSelector: { flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  modeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)' },
  activeModeBtn: { backgroundColor: '#FFD700' },
  modeText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  activeModeText: { color: '#000' },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, paddingBottom: 16 },
  ctrl: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  value: { color: '#fff', fontWeight: '700' },
  resetText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  gridText: { color: '#fff', fontSize: 12, fontWeight: '600' },
});
