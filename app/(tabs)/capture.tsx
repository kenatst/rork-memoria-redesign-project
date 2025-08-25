import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { View, StyleSheet, Text, Pressable, Alert, Platform, Animated, Dimensions, ScrollView, Modal, KeyboardAvoidingView, PanResponder, GestureResponderEvent } from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import * as MediaLibrary from 'expo-media-library';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import {
  Camera,
  RotateCcw,
  Zap,
  ZapOff,
  Grid3X3,
  Wand2,
  Square,
  Video,
  Contrast,
  Aperture,
  Maximize,
  X,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useAppState } from '@/providers/AppStateProvider';
import { CameraFilters } from '@/components/CameraFilters';

const { height: screenHeight } = Dimensions.get('window');

const CAMERA_MODES = [
  { id: 'photo', name: 'PHOTO', icon: Camera },
  { id: 'video', name: 'VIDÉO', icon: Video },
  { id: 'portrait', name: 'PORTRAIT', icon: Contrast },
  { id: 'square', name: 'CARRÉ', icon: Square },
  { id: 'pano', name: 'PANO', icon: Maximize },
  { id: 'time-lapse', name: 'TIME-LAPSE', icon: Aperture },
] as const;

type CameraModeId = typeof CAMERA_MODES[number]['id'];

type FlashMode = 'off' | 'on' | 'auto';

type AspectId = 'full' | '1:1' | '4:3' | '16:9' | '3:2' | '9:16';

const ASPECT_RATIOS: ReadonlyArray<{ id: AspectId; name: string; ratio: number | null }> = [
  { id: 'full', name: 'Full', ratio: null },
  { id: '1:1', name: '1:1', ratio: 1 },
  { id: '4:3', name: '4:3', ratio: 4 / 3 },
  { id: '16:9', name: '16:9', ratio: 16 / 9 },
  { id: '3:2', name: '3:2', ratio: 3 / 2 },
  { id: '9:16', name: '9:16', ratio: 9 / 16 },
] as const;

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
  const [aspectRatio, setAspectRatio] = useState<AspectId>('full');
  const [cameraMode, setCameraMode] = useState<CameraModeId>('photo');
  const [timer, setTimer] = useState<0 | 3 | 10>(0);
  const [isRecording, setIsRecording] = useState<boolean>(false);

  const [showCaptureAnimation, setShowCaptureAnimation] = useState<boolean>(false);
  const [showGallery, setShowGallery] = useState<boolean>(false);
  const [showAlbumSelector, setShowAlbumSelector] = useState<boolean>(false);
  const [showCameraFilters, setShowCameraFilters] = useState<boolean>(false);
  const [recentPhotos, setRecentPhotos] = useState<string[]>([]);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);

  const [focusPoint, setFocusPoint] = useState<{ x: number; y: number } | null>(null);
  const [lastPinchDistance, setLastPinchDistance] = useState<number | null>(null);

  const [captureAnim] = useState(() => new Animated.Value(1));
  const [flashAnim] = useState(() => new Animated.Value(0));
  const [scaleAnim] = useState(() => new Animated.Value(1));
  const [rotateAnim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!focusPoint) return;
    const t = setTimeout(() => setFocusPoint(null), 900);
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
    setShowCaptureAnimation(true);
    Animated.sequence([
      Animated.timing(flashAnim, { toValue: 1, duration: 50, useNativeDriver: true }),
      Animated.timing(flashAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
    ]).start(() => setShowCaptureAnimation(false));
  }, [flashAnim]);

  const toggleFacing = useCallback(() => {
    handleHaptic('light');
    const currentValue = (rotateAnim as any)._value || 0;
    Animated.timing(rotateAnim, { toValue: currentValue + 1, duration: 300, useNativeDriver: true }).start();
    setFacing((c) => (c === 'back' ? 'front' : 'back'));
  }, [handleHaptic, rotateAnim]);

  const cycleTimer = useCallback(() => {
    handleHaptic('light');
    const values: Array<0 | 3 | 10> = [0, 3, 10];
    const idx = values.indexOf(timer);
    setTimer(values[(idx + 1) % values.length]);
  }, [timer, handleHaptic]);

  const currentAspect = ASPECT_RATIOS.find((r) => r.id === aspectRatio) ?? ASPECT_RATIOS[0];
  const cameraContainerStyle = useMemo(() => {
    if (aspectRatio !== 'full' && currentAspect.ratio) {
      return { width: '100%', aspectRatio: currentAspect.ratio } as const;
    }
    return styles.ratioFull;
  }, [aspectRatio, currentAspect]);

  const rotateInterpolate = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });

  const gesture = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (e: GestureResponderEvent) => {
          const touches = (e.nativeEvent as any).touches as ReadonlyArray<{ pageX: number; pageY: number }> | undefined;
          if (touches && touches.length === 2) {
            const dx = touches[0].pageX - touches[1].pageX;
            const dy = touches[0].pageY - touches[1].pageY;
            setLastPinchDistance(Math.sqrt(dx * dx + dy * dy));
          } else {
            const { locationX, locationY } = e.nativeEvent;
            setFocusPoint({ x: locationX, y: locationY });
          }
        },
        onPanResponderMove: (e: GestureResponderEvent) => {
          const touches = (e.nativeEvent as any).touches as ReadonlyArray<{ pageX: number; pageY: number }> | undefined;
          if (touches && touches.length === 2) {
            const dx = touches[0].pageX - touches[1].pageX;
            const dy = touches[0].pageY - touches[1].pageY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (lastPinchDistance != null) {
              const delta = dist - lastPinchDistance;
              const step = delta / 300; // sensitivity
              setZoom((z) => Math.max(0, Math.min(1, +(z + step).toFixed(3))));
            }
            setLastPinchDistance(dist);
          }
        },
        onPanResponderRelease: () => {
          setLastPinchDistance(null);
        },
        onPanResponderTerminationRequest: () => true,
      }),
    [lastPinchDistance]
  );

  const takePicture = useCallback(async () => {
    if (!cameraRef.current) return;
    try {
      handleHaptic('heavy');
      playFlash();

      Animated.sequence([
        Animated.timing(captureAnim, { toValue: 0.88, duration: 90, useNativeDriver: true }),
        Animated.timing(captureAnim, { toValue: 1.06, duration: 90, useNativeDriver: true }),
        Animated.timing(captureAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
      ]).start();

      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 0.96, duration: 100, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
      ]).start();

      const photo = await cameraRef.current.takePictureAsync({ quality: 0.9, base64: false, exif: true, skipProcessing: true });
      if (!photo?.uri) return;

      if (mediaPermission?.granted) {
        await MediaLibrary.saveToLibraryAsync(photo.uri);
      }
      setRecentPhotos((p) => [photo.uri, ...p.slice(0, 9)]);
      setCapturedPhoto(photo.uri);
      setShowAlbumSelector(true);
    } catch (e) {
      console.log('Capture error', e);
      Alert.alert('Erreur', "Impossible de prendre la photo");
    }
  }, [handleHaptic, playFlash, captureAnim, scaleAnim, mediaPermission]);

  const startStopRecording = useCallback(async () => {
    try {
      if (!cameraRef.current) return;
      if (Platform.OS === 'web') {
        Alert.alert('Vidéo non disponible sur web', 'Utilisez l’app mobile pour l’enregistrement.');
        return;
      }
      if (!isRecording) {
        handleHaptic('heavy');
        setIsRecording(true);
        (cameraRef.current as any).startRecording({
          maxDuration: 600,
          onRecordingFinished: (video: { uri: string }) => {
            setIsRecording(false);
            setCapturedPhoto(video?.uri ?? null);
            setShowAlbumSelector(true);
          },
          onRecordingError: () => {
            setIsRecording(false);
            Alert.alert('Erreur', "Impossible d'enregistrer la vidéo");
          },
        });
      } else {
        (cameraRef.current as any).stopRecording();
      }
    } catch (e) {
      console.log('Video toggle error', e);
      setIsRecording(false);
    }
  }, [isRecording, handleHaptic]);

  const lastPhoto = useMemo(() => recentPhotos[0] ?? null, [recentPhotos]);

  const handleAddToAlbum = (albumId: string) => {
    if (!capturedPhoto) return;
    try {
      addPhotoToAlbum(albumId, capturedPhoto);
      Alert.alert('Succès', "Photo ajoutée à l'album");
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
        <Text style={styles.loadingText}>Chargement de la caméra…</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#000', '#0b0b0d']} style={StyleSheet.absoluteFillObject} />
        <View style={styles.permissionContainer}>
          <Camera color={Colors.palette.accentGold} size={64} />
          <Text style={styles.permissionTitle}>Accès Caméra Requis</Text>
          <Text style={styles.permissionText}>Memoria a besoin d'accéder à votre caméra</Text>
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
      <View style={[styles.cameraWrapper, { paddingTop: Math.max(0, insets.top), paddingBottom: Math.max(0, insets.bottom) }]}>
        <Animated.View style={[cameraContainerStyle, { alignSelf: 'center', justifyContent: 'center', transform: [{ scale: scaleAnim }] }]}>
          <CameraView
            ref={cameraRef}
            style={StyleSheet.absoluteFillObject}
            facing={facing}
            flash={flash}
            zoom={zoom}
            mode={cameraMode === 'video' ? 'video' : 'picture'}
          >
            {showCaptureAnimation && <Animated.View style={[styles.flashOverlay, { opacity: flashAnim }]} pointerEvents="none" />}

            <View pointerEvents="none" style={StyleSheet.absoluteFill}>
              {aspectRatio !== 'full' && currentAspect.ratio && <AspectRatioMask aspectRatio={currentAspect.ratio} />}
            </View>

            {grid && (
              <View style={styles.gridOverlay}>
                <View style={[styles.gridV, { left: '33.33%' }]} />
                <View style={[styles.gridV, { left: '66.66%' }]} />
                <View style={[styles.gridH, { top: '33.33%' }]} />
                <View style={[styles.gridH, { top: '66.66%' }]} />
              </View>
            )}

            {focusPoint && (
              <View style={[styles.focusRing, { left: focusPoint.x - 30, top: focusPoint.y - 30 }]} pointerEvents="none" />
            )}



            <View style={[styles.topBar, { top: Math.max(16, insets.top + 6) }]}>
              {Platform.OS !== 'web' ? (
                <BlurView intensity={30} style={styles.topBarBg}>
                  <TopBarContent {...{ flash, setFlash, grid, setGrid, timer, cycleTimer }} />
                </BlurView>
              ) : (
                <View style={[styles.topBarBg, styles.webBlur]}>
                  <TopBarContent {...{ flash, setFlash, grid, setGrid, timer, cycleTimer }} />
                </View>
              )}
            </View>

            <View style={StyleSheet.absoluteFill} {...gesture.panHandlers} />

            <BottomControls
              insetsBottom={insets.bottom}
              cameraMode={cameraMode}
              setCameraMode={setCameraMode}
              onShutter={cameraMode === 'video' ? startStopRecording : takePicture}
              isRecording={isRecording}
              onFlip={toggleFacing}
              rotateInterpolate={rotateInterpolate}
              lastPhoto={lastPhoto}
              onOpenFilters={() => setShowCameraFilters(true)}
              zoom={zoom}
              setZoom={setZoom}
            />
          </CameraView>
        </Animated.View>
      </View>

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {lastPhoto && (
          <Pressable
            style={[styles.lastThumb, { bottom: Math.max(116, insets.bottom + 56) }]}
            onPress={() => {
              setCapturedPhoto(lastPhoto);
              setShowAlbumSelector(true);
            }}
            testID="last-photo-thumb"
          >
            <Image source={{ uri: lastPhoto }} style={styles.lastThumbImage} contentFit="cover" />
          </Pressable>
        )}

        <Pressable
          style={[styles.galleryToggle, { bottom: Math.max(120, insets.bottom + 60) }]}
          onPress={() => setShowGallery((v) => !v)}
          testID="toggle-gallery"
        >
          <Text style={styles.galleryToggleText}>{recentPhotos.length}</Text>
        </Pressable>

        {showGallery && recentPhotos.length > 0 && (
          <View style={[styles.galleryContainer, { bottom: Math.max(200, insets.bottom + 100) }]}>
            {Platform.OS !== 'web' ? (
              <BlurView intensity={30} style={styles.galleryBlur}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.galleryScroll}>
                  {recentPhotos.map((uri, idx) => (
                    <Pressable key={idx} style={styles.galleryItem} onPress={() => {}}>
                      <Image source={{ uri }} style={styles.galleryImage} contentFit="cover" />
                    </Pressable>
                  ))}
                </ScrollView>
              </BlurView>
            ) : (
              <View style={[styles.galleryBlur, styles.webBlur]}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.galleryScroll}>
                  {recentPhotos.map((uri, idx) => (
                    <Pressable key={idx} style={styles.galleryItem} onPress={() => {}}>
                      <Image source={{ uri }} style={styles.galleryImage} contentFit="cover" />
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        )}

        <Modal visible={showAlbumSelector} transparent animationType="slide" onRequestClose={() => setShowAlbumSelector(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Ajouter à un album</Text>
              <Text style={styles.modalSubtitle}>Sélectionnez un album pour votre photo</Text>
              <ScrollView style={styles.albumsList} showsVerticalScrollIndicator={false}>
                {albums.map((album) => (
                  <Pressable key={album.id} style={styles.albumItem} onPress={() => handleAddToAlbum(album.id)} testID={`select-album-${album.id}`}>
                    <View style={styles.albumItemContent}>
                      <Text style={styles.albumItemName}>{album.name}</Text>
                      <Text style={styles.albumItemCount}>{album.photos.length} photos</Text>
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
              <View style={[styles.modalActions, { flexDirection: 'row' }]}>
                <Pressable style={[styles.skipBtn, { flex: 1 }]} onPress={() => { setShowAlbumSelector(false); setCapturedPhoto(null); }} testID="skip-album">
                  <Text style={styles.skipBtnText}>Passer</Text>
                </Pressable>
                <Pressable style={[styles.deleteBtn, { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' }]} onPress={() => { if (!capturedPhoto) return; setRecentPhotos((p) => p.filter((u) => u !== capturedPhoto)); setCapturedPhoto(null); setShowAlbumSelector(false); }} testID="delete-captured">
                  <Text style={styles.actionText}>Supprimer</Text>
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        <Modal visible={showCameraFilters} transparent animationType="slide" onRequestClose={() => setShowCameraFilters(false)}>
          <View style={styles.filtersModalBackdrop}>
            <View style={styles.filtersPanel}>
              <View style={styles.filtersPanelHeader}>
                <Text style={styles.filtersPanelTitle}>Filtres & Effets</Text>
                <Pressable onPress={() => setShowCameraFilters(false)} style={styles.closeFiltersPanelBtn} testID="close-filters">
                  <X color="#FFFFFF" size={24} />
                </Pressable>
              </View>
              <CameraFilters
                isVisible
                onClose={() => setShowCameraFilters(false)}
                onPhotoTaken={(uri) => {
                  if (mediaPermission?.granted) MediaLibrary.saveToLibraryAsync(uri);
                  setRecentPhotos((p) => [uri, ...p.slice(0, 9)]);
                  setCapturedPhoto(uri);
                  setShowAlbumSelector(true);
                }}
              />
            </View>
          </View>
        </Modal>


      </SafeAreaView>
    </View>
  );
}

function TopBarContent({
  flash,
  setFlash,
  grid,
  setGrid,
  timer,
  cycleTimer,
}: {
  flash: FlashMode;
  setFlash: React.Dispatch<React.SetStateAction<FlashMode>>;
  grid: boolean;
  setGrid: React.Dispatch<React.SetStateAction<boolean>>;
  timer: 0 | 3 | 10;
  cycleTimer: () => void;
}) {
  return (
    <View style={styles.topRow}>
      <Pressable style={styles.controlButton} onPress={() => setGrid((v) => !v)} testID="grid-btn">
        <Grid3X3 color={grid ? '#FFD700' : '#FFFFFF'} size={22} />
      </Pressable>
      <Pressable style={styles.controlButton} onPress={() => setFlash((c) => (c === 'off' ? 'on' : c === 'on' ? 'auto' : 'off'))} testID="flash-btn">
        {flash === 'off' ? <ZapOff color="#FFFFFF" size={22} /> : flash === 'on' ? <Zap color="#FFD700" size={22} /> : <Zap color="#FFA500" size={22} />}
      </Pressable>
      <Pressable style={styles.controlButton} onPress={cycleTimer} testID="timer-btn">
        <Text style={[styles.ratioText, { color: timer > 0 ? '#FFD700' : '#FFFFFF' }]}>{timer > 0 ? `${timer}s` : '⏱'}</Text>
      </Pressable>
    </View>
  );
}

function BottomControls({
  insetsBottom,
  cameraMode,
  setCameraMode,
  onShutter,
  isRecording,
  onFlip,
  rotateInterpolate,
  lastPhoto,
  onOpenFilters,
  zoom,
  setZoom,
}: {
  insetsBottom: number;
  cameraMode: CameraModeId;
  setCameraMode: React.Dispatch<React.SetStateAction<CameraModeId>>;
  onShutter: () => void;
  isRecording: boolean;
  onFlip: () => void;
  rotateInterpolate: Animated.AnimatedInterpolation<string>;
  lastPhoto: string | null;
  onOpenFilters: () => void;
  zoom: number;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
}) {
  const [captureAnim] = useState(() => new Animated.Value(1));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(captureAnim, { toValue: 1.06, duration: 1200, useNativeDriver: true }),
        Animated.timing(captureAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [captureAnim]);

  return (
    <View style={[styles.bottomArea, { bottom: Math.max(80, insetsBottom + 64) }]}> 
      <View style={styles.modeCarousel}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.modeScrollContent}>
          {CAMERA_MODES.map((m) => {
            const Icon = m.icon;
            const active = cameraMode === m.id;
            return (
              <Pressable key={m.id} style={[styles.modePill, active && styles.modePillActive]} onPress={() => setCameraMode(m.id)} testID={`mode-${m.id}`}>
                <Icon color={active ? '#000' : '#fff'} size={18} />
                <Text style={[styles.modePillText, active && styles.modePillTextActive]}>{m.name}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.bottomRow}>
        <Pressable style={styles.sideButton} onPress={onOpenFilters} testID="filter-btn">
          <Wand2 color="#FFFFFF" size={24} />
        </Pressable>

        <Animated.View style={{ transform: [{ scale: captureAnim }] }}>
          <Pressable
            style={[styles.captureButton, cameraMode === 'video' && isRecording && styles.recordingButton]}
            onPress={onShutter}
            testID="capture-btn"
          >
            <LinearGradient colors={isRecording ? ['#FF3B30', '#FF1744'] : ['#FFD700', '#FFA500', '#FF6B35']} style={styles.captureGradient}>
              <Camera color={isRecording ? '#FF3B30' : '#000000'} size={28} strokeWidth={3} />
            </LinearGradient>
          </Pressable>
        </Animated.View>

        <Animated.View style={{ transform: [{ rotate: rotateInterpolate }] }}>
          <Pressable style={styles.sideButton} onPress={onFlip} testID="flip-btn">
            <RotateCcw color="#FFFFFF" size={24} />
          </Pressable>
        </Animated.View>
      </View>

      <View style={styles.zoomRow}>
        <Pressable style={styles.zoomBtn} onPress={() => setZoom((z) => Math.max(0, +(z - 0.1).toFixed(2)))} testID="zoom-out">
          <Text style={styles.zoomText}>-</Text>
        </Pressable>
        <View style={styles.zoomValue}>
          <Text style={styles.zoomTextSmall}>{Math.round(1 + zoom * 9)}x</Text>
        </View>
        <Pressable style={styles.zoomBtn} onPress={() => setZoom((z) => Math.min(1, +(z + 0.1).toFixed(2)))} testID="zoom-in">
          <Text style={styles.zoomText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

function AspectRatioMask({ aspectRatio }: { aspectRatio: number }) {
  const { width, height } = Dimensions.get('window');
  const contentHeight = width / aspectRatio;
  const topBottom = Math.max(0, (height - contentHeight) / 2);
  return (
    <View style={{ flex: 1 }}>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: topBottom, backgroundColor: '#000000' }} />
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: topBottom, backgroundColor: '#000000' }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  safeArea: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 30 },
  cameraWrapper: { flex: 1, backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center' },
  ratioFull: { width: '100%', height: '100%' },
  loadingText: { color: '#FFFFFF', fontSize: 18, textAlign: 'center', marginTop: screenHeight / 2 },
  permissionContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40, gap: 24 },
  permissionTitle: { color: '#FFFFFF', fontSize: 24, fontWeight: '800', textAlign: 'center' },
  permissionText: { color: Colors.palette.taupe, fontSize: 16, textAlign: 'center', lineHeight: 24 },
  permissionButton: { borderRadius: 16, overflow: 'hidden', marginTop: 16 },
  permissionButtonGradient: { paddingHorizontal: 32, paddingVertical: 16 },
  permissionButtonText: { color: '#000000', fontSize: 16, fontWeight: '800', textAlign: 'center' },

  flashOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#FFFFFF', zIndex: 100 },

  gridOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  gridV: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(255,255,255,0.25)' },
  gridH: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: 'rgba(255,255,255,0.25)' },
  focusRing: { position: 'absolute', width: 60, height: 60, borderRadius: 30, borderWidth: 2, borderColor: '#FFD700' },

  topBar: { position: 'absolute', left: 16, right: 16, zIndex: 20 },
  topBarBg: { borderRadius: 16, overflow: 'hidden' },
  webBlur: { backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(20px)' as any },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, paddingHorizontal: 14 },
  controlButton: { padding: 10, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.10)' },
  ratioText: { color: '#FFFFFF', fontWeight: '800' },

  bottomArea: { position: 'absolute', left: 16, right: 16, zIndex: 20 },
  modeCarousel: { marginBottom: 10 },
  modeScrollContent: { paddingHorizontal: 6, alignItems: 'center' },
  modePill: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.10)', marginRight: 8 },
  modePillActive: { backgroundColor: '#FFD700' },
  modePillText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  modePillTextActive: { color: '#000000', fontWeight: '800' },

  bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sideButton: { padding: 14, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)' },
  captureButton: { width: 86, height: 86, borderRadius: 43, shadowColor: '#FFD700', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.45, shadowRadius: 10, elevation: 10 },
  recordingButton: { borderWidth: 3, borderColor: '#FF3B30' },
  captureGradient: { flex: 1, borderRadius: 43, justifyContent: 'center', alignItems: 'center' },

  zoomRow: { marginTop: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  zoomBtn: { backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 12 },
  zoomText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },
  zoomTextSmall: { color: '#FFFFFF', fontWeight: '700', fontSize: 12 },
  zoomValue: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.08)' },

  galleryContainer: { position: 'absolute', left: 16, right: 16, height: 84, zIndex: 15 },
  galleryBlur: { borderRadius: 16, overflow: 'hidden', paddingVertical: 8 },
  galleryScroll: { paddingHorizontal: 12 },
  galleryItem: { width: 68, height: 68, borderRadius: 14, marginRight: 8, overflow: 'hidden', borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)' },
  galleryImage: { width: '100%', height: '100%' },
  galleryToggle: { position: 'absolute', left: 20, width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', zIndex: 25 },
  galleryToggleText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },

  lastThumb: { position: 'absolute', right: 20, width: 56, height: 56, borderRadius: 12, overflow: 'hidden', borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)', zIndex: 26 },
  lastThumbImage: { width: '100%', height: '100%' },

  banner: { position: 'absolute', left: 16, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, zIndex: 25 },
  bannerText: { color: '#000000', fontSize: 12, fontWeight: '700' },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#0B0B0D', padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '70%' },
  modalTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  modalSubtitle: { color: '#A9AFBC', fontSize: 14, textAlign: 'center', marginBottom: 20 },
  albumsList: { maxHeight: 300 },
  albumItem: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12, marginBottom: 12, overflow: 'hidden' },
  albumItemContent: { padding: 16 },
  albumItemName: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', marginBottom: 4 },
  albumItemCount: { color: '#A9AFBC', fontSize: 12 },
  modalActions: { marginTop: 16, gap: 12 },
  skipBtn: { backgroundColor: 'rgba(255,255,255,0.1)', paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  skipBtnText: { color: '#FFFFFF', fontWeight: '700' },
  deleteBtn: { backgroundColor: 'rgba(255,0,0,0.2)' },
  actionText: { color: '#FFFFFF', fontWeight: '700' },

  filtersModalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'flex-end' },
  filtersPanel: { backgroundColor: '#0B0B0D', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 12, paddingBottom: 24, maxHeight: '80%' },
  filtersPanelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 6 },
  filtersPanelTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '800' },
  closeFiltersPanelBtn: { padding: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)' },
});
