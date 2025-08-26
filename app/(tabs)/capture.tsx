import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, StyleSheet, Text, Pressable, Alert, Platform, Animated, Modal, KeyboardAvoidingView, ScrollView } from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import * as MediaLibrary from 'expo-media-library';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import {
  Camera,
  RotateCcw,
  Zap,
  ZapOff,
  Grid3X3,
  Circle,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useAppState } from '@/providers/AppStateProvider';

type FlashMode = 'off' | 'on' | 'auto';

export default function CaptureScreen() {
  const { albums, addPhotoToAlbum } = useAppState();
  const insets = useSafeAreaInsets();

  const [permission, requestPermission] = useCameraPermissions();
  const [mediaPermission] = MediaLibrary.usePermissions();
  const cameraRef = useRef<CameraView>(null);

  const [facing, setFacing] = useState<CameraType>('back');
  const [flash, setFlash] = useState<FlashMode>('off');
  const [grid, setGrid] = useState<boolean>(false);
  const [zoom, setZoom] = useState<number>(0);

  const [showAlbumSelector, setShowAlbumSelector] = useState<boolean>(false);
  const [recentPhotos, setRecentPhotos] = useState<string[]>([]);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [focusPoint, setFocusPoint] = useState<{ x: number; y: number } | null>(null);

  const [captureAnim] = useState(() => new Animated.Value(1));
  const [flashAnim] = useState(() => new Animated.Value(0));
  const [rotateAnim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!focusPoint) return;
    const t = setTimeout(() => setFocusPoint(null), 1200);
    return () => clearTimeout(t);
  }, [focusPoint]);

  const handleHaptic = useCallback((style: 'light' | 'medium' | 'heavy' = 'medium') => {
    if (Platform.OS !== 'web') {
      const map = {
        light: Haptics.ImpactFeedbackStyle.Light,
        medium: Haptics.ImpactFeedbackStyle.Medium,
        heavy: Haptics.ImpactFeedbackStyle.Heavy,
      } as const;
      Haptics.impactAsync(map[style]);
    }
  }, []);

  const playFlash = useCallback(() => {
    Animated.sequence([
      Animated.timing(flashAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
      Animated.timing(flashAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();
  }, [flashAnim]);

  const toggleFacing = useCallback(() => {
    handleHaptic('light');
    Animated.timing(rotateAnim, { 
      toValue: (rotateAnim as any)._value + 1, 
      duration: 400, 
      useNativeDriver: true 
    }).start();
    setFacing((c) => (c === 'back' ? 'front' : 'back'));
  }, [handleHaptic, rotateAnim]);

  const rotateInterpolate = rotateAnim.interpolate({ 
    inputRange: [0, 1], 
    outputRange: ['0deg', '180deg'] 
  });

  const handleCameraPress = useCallback((event: any) => {
    const { locationX, locationY } = event.nativeEvent;
    setFocusPoint({ x: locationX, y: locationY });
    handleHaptic('light');
  }, [handleHaptic]);

  const takePicture = useCallback(async () => {
    if (!cameraRef.current) return;
    try {
      handleHaptic('heavy');
      playFlash();

      Animated.sequence([
        Animated.timing(captureAnim, { toValue: 0.9, duration: 100, useNativeDriver: true }),
        Animated.timing(captureAnim, { toValue: 1.05, duration: 100, useNativeDriver: true }),
        Animated.timing(captureAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
      ]).start();

      const photo = await cameraRef.current.takePictureAsync({ 
        quality: 0.95, 
        base64: false, 
        exif: true 
      });
      
      if (!photo?.uri) {
        Alert.alert('Erreur', 'Impossible de capturer la photo');
        return;
      }

      if (mediaPermission?.granted) {
        await MediaLibrary.saveToLibraryAsync(photo.uri);
      }
      
      setRecentPhotos((p) => [photo.uri, ...p.slice(0, 9)]);
      setCapturedPhoto(photo.uri);
      setShowAlbumSelector(true);
    } catch (e) {
      console.error('Capture error:', e);
      Alert.alert('Erreur', "Impossible de prendre la photo");
    }
  }, [handleHaptic, playFlash, captureAnim, mediaPermission]);

  const lastPhoto = recentPhotos[0] ?? null;

  const handleAddToAlbum = (albumId: string) => {
    if (!capturedPhoto) return;
    try {
      addPhotoToAlbum(albumId, capturedPhoto);
      Alert.alert('Succès', "Photo ajoutée à l'album");
      handleHaptic('medium');
    } catch {
      Alert.alert('Hors ligne', 'Impossible de synchroniser maintenant.');
    }
    setShowAlbumSelector(false);
    setCapturedPhoto(null);
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#000', '#0b0b0d']} style={StyleSheet.absoluteFillObject} />
        <View style={styles.loadingContainer}>
          <Camera color={Colors.palette.accentGold} size={48} />
          <Text style={styles.loadingText}>Chargement de la caméra…</Text>
        </View>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#000', '#0b0b0d']} style={StyleSheet.absoluteFillObject} />
        <View style={styles.permissionContainer}>
          <View style={styles.permissionIcon}>
            <Camera color={Colors.palette.accentGold} size={64} />
          </View>
          <Text style={styles.permissionTitle}>Accès Caméra Requis</Text>
          <Text style={styles.permissionText}>
            Memoria a besoin d'accéder à votre caméra pour prendre des photos
          </Text>
          <Pressable style={styles.permissionButton} onPress={requestPermission} testID="grant-permission">
            <LinearGradient colors={['#FFD700', '#FFA500']} style={styles.permissionButtonGradient}>
              <Text style={styles.permissionButtonText}>Autoriser l'accès</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.cameraContainer}>
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFillObject}
          facing={facing}
          flash={facing === 'front' ? 'off' : flash}
          zoom={zoom}
          mode="picture"
        >
          <Animated.View style={[styles.flashOverlay, { opacity: flashAnim }]} pointerEvents="none" />

          {grid && (
            <View style={styles.gridOverlay} pointerEvents="none">
              <View style={[styles.gridLine, styles.gridVertical1]} />
              <View style={[styles.gridLine, styles.gridVertical2]} />
              <View style={[styles.gridLine, styles.gridHorizontal1]} />
              <View style={[styles.gridLine, styles.gridHorizontal2]} />
            </View>
          )}

          {focusPoint && (
            <View 
              style={[
                styles.focusRing, 
                { left: focusPoint.x - 40, top: focusPoint.y - 40 }
              ]} 
              pointerEvents="none" 
            />
          )}

          <View style={[styles.topControls, { paddingTop: Math.max(insets.top, 12) + 16 }]}>
            {Platform.OS !== 'web' ? (
              <BlurView intensity={40} style={styles.topControlsBlur}>
                <View style={styles.topControlsContent}>
                  <Pressable 
                    style={[styles.topControlButton, flash !== 'off' && styles.activeControl]} 
                    onPress={() => facing === 'front' ? undefined : setFlash(c => c === 'off' ? 'on' : c === 'on' ? 'auto' : 'off')} 
                    testID="flash-btn"
                    disabled={facing === 'front'}
                  >
                    {flash === 'off' ? (
                      <ZapOff color={facing === 'front' ? '#7A7A7A' : '#FFFFFF'} size={20} />
                    ) : flash === 'on' ? (
                      <Zap color={facing === 'front' ? '#7A7A7A' : '#FFD700'} size={20} />
                    ) : (
                      <Zap color={facing === 'front' ? '#7A7A7A' : '#FFA500'} size={20} />
                    )}
                  </Pressable>

                  <Pressable 
                    style={[styles.topControlButton, grid && styles.activeControl]} 
                    onPress={() => setGrid(v => !v)} 
                    testID="grid-btn"
                  >
                    <Grid3X3 color={grid ? '#FFD700' : '#FFFFFF'} size={20} />
                  </Pressable>
                </View>
              </BlurView>
            ) : (
              <View style={[styles.topControlsBlur, styles.webBlur]}>
                <View style={styles.topControlsContent}>
                  <Pressable 
                    style={[styles.topControlButton, flash !== 'off' && styles.activeControl]} 
                    onPress={() => facing === 'front' ? undefined : setFlash(c => c === 'off' ? 'on' : c === 'on' ? 'auto' : 'off')} 
                    testID="flash-btn"
                    disabled={facing === 'front'}
                  >
                    {flash === 'off' ? (
                      <ZapOff color={facing === 'front' ? '#7A7A7A' : '#FFFFFF'} size={20} />
                    ) : flash === 'on' ? (
                      <Zap color={facing === 'front' ? '#7A7A7A' : '#FFD700'} size={20} />
                    ) : (
                      <Zap color={facing === 'front' ? '#7A7A7A' : '#FFA500'} size={20} />
                    )}
                  </Pressable>

                  <Pressable 
                    style={[styles.topControlButton, grid && styles.activeControl]} 
                    onPress={() => setGrid(v => !v)} 
                    testID="grid-btn"
                  >
                    <Grid3X3 color={grid ? '#FFD700' : '#FFFFFF'} size={20} />
                  </Pressable>
                </View>
              </View>
            )}
          </View>

          {zoom > 0 && (
            <View style={styles.zoomIndicator}>
              <Text style={styles.zoomIndicatorText}>{(1 + zoom * 9).toFixed(1)}x</Text>
            </View>
          )}

          <Pressable style={StyleSheet.absoluteFill} onPress={handleCameraPress} />

          <View style={[styles.bottomControls, { bottom: Math.max(insets.bottom, 24) + 40 }]}>
            {lastPhoto && (
              <Pressable
                style={styles.lastPhotoButton}
                onPress={() => {
                  setCapturedPhoto(lastPhoto);
                  setShowAlbumSelector(true);
                }}
                testID="last-photo-thumb"
              >
                <Image source={{ uri: lastPhoto }} style={styles.lastPhotoImage} contentFit="cover" />
              </Pressable>
            )}

            <Animated.View style={{ transform: [{ scale: captureAnim }] }}>
              <Pressable
                style={styles.captureButton}
                onPress={takePicture}
                testID="capture-btn"
              >
                <View style={styles.captureButtonOuter}>
                  <View style={styles.captureButtonInner}>
                    <Circle color="#FFFFFF" size={32} fill="#FFFFFF" />
                  </View>
                </View>
              </Pressable>
            </Animated.View>

            <Animated.View style={{ transform: [{ rotate: rotateInterpolate }] }}>
              <Pressable
                style={styles.flipButton}
                onPress={toggleFacing}
                testID="flip-btn"
              >
                <RotateCcw color="#FFFFFF" size={24} />
              </Pressable>
            </Animated.View>
          </View>

          <View style={[styles.zoomControls, { bottom: Math.max(insets.bottom, 24) + 140 }]}>
            <Pressable 
              style={styles.zoomButton} 
              onPress={() => setZoom(0)}
              testID="zoom-1x"
            >
              <Text style={styles.zoomButtonText}>1x</Text>
            </Pressable>
            <Pressable 
              style={styles.zoomButton} 
              onPress={() => setZoom(0.5)}
              testID="zoom-2x"
            >
              <Text style={styles.zoomButtonText}>2x</Text>
            </Pressable>
            <Pressable 
              style={styles.zoomButton} 
              onPress={() => setZoom(1)}
              testID="zoom-5x"
            >
              <Text style={styles.zoomButtonText}>5x</Text>
            </Pressable>
          </View>
        </CameraView>
      </View>

      <Modal visible={showAlbumSelector} transparent animationType="slide" onRequestClose={() => setShowAlbumSelector(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Ajouter à un album</Text>
            <Text style={styles.modalSubtitle}>Sélectionnez un album pour votre photo</Text>
            {capturedPhoto && (
              <View style={styles.previewContainer}>
                <Image source={{ uri: capturedPhoto }} style={styles.previewImage} contentFit="cover" />
              </View>
            )}
            <ScrollView style={styles.albumsList} showsVerticalScrollIndicator={false}>
              {albums.map((album) => (
                <Pressable 
                  key={album.id} 
                  style={styles.albumItem} 
                  onPress={() => handleAddToAlbum(album.id)} 
                  testID={`select-album-${album.id}`}
                >
                  <View style={styles.albumItemContent}>
                    <Text style={styles.albumItemName}>{album.name}</Text>
                    <Text style={styles.albumItemCount}>{album.photos.length} éléments</Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
            <View style={styles.modalActions}>
              <Pressable 
                style={styles.skipButton} 
                onPress={() => { 
                  setShowAlbumSelector(false); 
                  setCapturedPhoto(null); 
                }} 
                testID="skip-album"
              >
                <Text style={styles.skipButtonText}>Passer</Text>
              </Pressable>
              <Pressable 
                style={styles.deleteButton} 
                onPress={() => { 
                  if (!capturedPhoto) return; 
                  setRecentPhotos(p => p.filter(u => u !== capturedPhoto)); 
                  setCapturedPhoto(null); 
                  setShowAlbumSelector(false); 
                }} 
                testID="delete-captured"
              >
                <Text style={styles.deleteButtonText}>Supprimer</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 24,
  },
  permissionIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  permissionTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
  },
  permissionText: {
    color: Colors.palette.taupe,
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  permissionButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 16,
  },
  permissionButtonGradient: {
    paddingHorizontal: 32,
    paddingVertical: 16,
  },
  permissionButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  flashOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    zIndex: 100,
  },
  gridOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
  },
  gridLine: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  gridVertical1: {
    left: '33.33%',
    top: 0,
    bottom: 0,
    width: 1,
  },
  gridVertical2: {
    left: '66.66%',
    top: 0,
    bottom: 0,
    width: 1,
  },
  gridHorizontal1: {
    top: '33.33%',
    left: 0,
    right: 0,
    height: 1,
  },
  gridHorizontal2: {
    top: '66.66%',
    left: 0,
    right: 0,
    height: 1,
  },
  focusRing: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: '#FFD700',
    zIndex: 15,
  },
  topControls: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    zIndex: 20,
  },
  topControlsBlur: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  webBlur: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    backdropFilter: 'blur(20px)',
  },
  topControlsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 20,
  },
  topControlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  activeControl: {
    backgroundColor: 'rgba(255, 215, 0, 0.3)',
  },
  zoomIndicator: {
    position: 'absolute',
    top: '50%',
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    zIndex: 15,
  },
  zoomIndicatorText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  bottomControls: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 40,
    zIndex: 20,
  },
  lastPhotoButton: {
    width: 50,
    height: 50,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  lastPhotoImage: {
    width: '100%',
    height: '100%',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonOuter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  flipButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomControls: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    zIndex: 20,
  },
  zoomButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  zoomButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#0B0B0D',
    padding: 24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    color: '#A9AFBC',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  previewContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  previewImage: {
    width: 120,
    height: 120,
    borderRadius: 16,
  },
  albumsList: {
    maxHeight: 300,
    marginBottom: 20,
  },
  albumItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
  },
  albumItemContent: {
    padding: 20,
  },
  albumItemName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  albumItemCount: {
    color: '#A9AFBC',
    fontSize: 14,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  skipButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  skipButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  deleteButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 59, 48, 0.2)',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '700',
  },
});