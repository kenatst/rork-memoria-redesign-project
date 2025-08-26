import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { View, StyleSheet, Text, Pressable, Alert, Platform, Animated, Dimensions, ScrollView, Modal, KeyboardAvoidingView, PanResponder, GestureResponderEvent } from 'react-native';
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
  Square,
  Video,
  Contrast,
  Circle,
  Timer,
  Sparkles,
  StopCircle,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useAppState } from '@/providers/AppStateProvider';
import { CameraFilters } from '@/components/CameraFilters';

const { width: screenWidth } = Dimensions.get('window');

const CAMERA_MODES = [
  { id: 'photo', name: 'PHOTO', icon: Camera, color: '#FFD700' },
  { id: 'video', name: 'VIDÉO', icon: Video, color: '#FF3B30' },
  { id: 'portrait', name: 'PORTRAIT', icon: Contrast, color: '#007AFF' },
  { id: 'square', name: 'CARRÉ', icon: Square, color: '#34C759' },
] as const;

type CameraModeId = typeof CAMERA_MODES[number]['id'];
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
  const [cameraMode, setCameraMode] = useState<CameraModeId>('photo');
  const [timer, setTimer] = useState<0 | 3 | 10>(0);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingTime, setRecordingTime] = useState<number>(0);

  const [showAlbumSelector, setShowAlbumSelector] = useState<boolean>(false);
  const [recentPhotos, setRecentPhotos] = useState<string[]>([]);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [focusPoint, setFocusPoint] = useState<{ x: number; y: number } | null>(null);
  const [lastPinchDistance, setLastPinchDistance] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(0);

  const [captureAnim] = useState(() => new Animated.Value(1));
  const [flashAnim] = useState(() => new Animated.Value(0));
  const [scaleAnim] = useState(() => new Animated.Value(1));
  const [rotateAnim] = useState(() => new Animated.Value(0));
  const [pulseAnim] = useState(() => new Animated.Value(1));

  const recordingInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isRecording) {
      recordingInterval.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      if (recordingInterval.current) {
        clearInterval(recordingInterval.current);
        recordingInterval.current = null;
      }
      setRecordingTime(0);
    }

    return () => {
      if (recordingInterval.current) {
        clearInterval(recordingInterval.current);
      }
    };
  }, [isRecording]);

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

  const cycleTimer = useCallback(() => {
    handleHaptic('light');
    const values: Array<0 | 3 | 10> = [0, 3, 10];
    const idx = values.indexOf(timer);
    setTimer(values[(idx + 1) % values.length]);
  }, [timer, handleHaptic]);

  const rotateInterpolate = rotateAnim.interpolate({ 
    inputRange: [0, 1], 
    outputRange: ['0deg', '180deg'] 
  });

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
            handleHaptic('light');
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
              const step = delta / 400;
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
    [lastPinchDistance, handleHaptic]
  );

  const takePicture = useCallback(async () => {
    if (!cameraRef.current) return;
    try {
      if (timer > 0) {
        setCountdown(timer);
        let t = timer;
        await new Promise<void>((resolve) => {
          const interval = setInterval(() => {
            t = t - 1;
            setCountdown(t);
            if (t === 0) {
              clearInterval(interval);
              resolve();
            }
          }, 1000);
        });
      }

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
      
      if (!photo?.uri) return;

      if (mediaPermission?.granted) {
        await MediaLibrary.saveToLibraryAsync(photo.uri);
      }
      
      setRecentPhotos((p) => [photo.uri, ...p.slice(0, 9)]);
      setCapturedPhoto(photo.uri);
      setShowAlbumSelector(true);
      setCountdown(0);
    } catch (e) {
      console.log('Capture error', e);
      Alert.alert('Erreur', "Impossible de prendre la photo");
    }
  }, [handleHaptic, playFlash, captureAnim, mediaPermission, timer]);

  const startStopRecording = useCallback(async () => {
    try {
      if (!cameraRef.current) return;
      if (Platform.OS === 'web') {
        Alert.alert('Vidéo non disponible sur web', "Utilisez l'app mobile pour l'enregistrement.");
        return;
      }
      
      if (!isRecording) {
        handleHaptic('heavy');
        setIsRecording(true);
        (cameraRef.current as any).startRecording({
          maxDuration: 300,
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
      handleHaptic('medium');
    } catch {
      Alert.alert('Hors ligne', 'Impossible de synchroniser maintenant.');
    }
    setShowAlbumSelector(false);
    setCapturedPhoto(null);
  };

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
            Memoria a besoin d'accéder à votre caméra pour prendre des photos et vidéos
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
          mode={cameraMode === 'video' ? 'video' : 'picture'}
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
            <Animated.View 
              style={[
                styles.focusRing, 
                { left: focusPoint.x - 40, top: focusPoint.y - 40, transform: [{ scale: scaleAnim }] }
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
                    style={[styles.topControlButton, timer > 0 && styles.activeControl]} 
                    onPress={cycleTimer} 
                    testID="timer-btn"
                    disabled={cameraMode !== 'photo'}
                  >
                    <Timer color={timer > 0 ? '#FFD700' : '#FFFFFF'} size={20} />
                    {timer > 0 && (
                      <Text style={styles.timerText}>{timer}</Text>
                    )}
                  </Pressable>

                  <Pressable 
                    style={[styles.topControlButton, grid && styles.activeControl]} 
                    onPress={() => setGrid(v => !v)} 
                    testID="grid-btn"
                  >
                    <Grid3X3 color={grid ? '#FFD700' : '#FFFFFF'} size={20} />
                  </Pressable>

                  <Pressable 
                    style={[styles.topControlButton]} 
                    onPress={() => setShowFilters(true)} 
                    testID="filters-open"
                  >
                    <Sparkles color="#FFD700" size={20} />
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
                    style={[styles.topControlButton, timer > 0 && styles.activeControl]} 
                    onPress={cycleTimer} 
                    testID="timer-btn"
                    disabled={cameraMode !== 'photo'}
                  >
                    <Timer color={timer > 0 ? '#FFD700' : '#FFFFFF'} size={20} />
                    {timer > 0 && (
                      <Text style={styles.timerText}>{timer}</Text>
                    )}
                  </Pressable>

                  <Pressable 
                    style={[styles.topControlButton, grid && styles.activeControl]} 
                    onPress={() => setGrid(v => !v)} 
                    testID="grid-btn"
                  >
                    <Grid3X3 color={grid ? '#FFD700' : '#FFFFFF'} size={20} />
                  </Pressable>

                  <Pressable 
                    style={[styles.topControlButton]} 
                    onPress={() => setShowFilters(true)} 
                    testID="filters-open"
                  >
                    <Sparkles color="#FFD700" size={20} />
                  </Pressable>
                </View>
              </View>
            )}
          </View>

          {isRecording && (
            <View style={[styles.recordingIndicator, { top: Math.max(insets.top, 12) + 80 }]}>
              <View style={styles.recordingDot} />
              <Text style={styles.recordingText}>REC {formatRecordingTime(recordingTime)}</Text>
            </View>
          )}

          {countdown > 0 && (
            <View style={[styles.countdownOverlay, { top: Math.max(insets.top, 12) + 120 }]}>
              <Text style={styles.countdownText}>{countdown}</Text>
            </View>
          )}

          {zoom > 0 && (
            <View style={styles.zoomIndicator}>
              <Text style={styles.zoomIndicatorText}>{(1 + zoom * 9).toFixed(1)}x</Text>
            </View>
          )}

          <View style={StyleSheet.absoluteFill} {...gesture.panHandlers} />

          <View style={[styles.modeSelector, { bottom: Math.max(insets.bottom, 24) + 170 }]}>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              contentContainerStyle={styles.modeSelectorContent}
            >
              {CAMERA_MODES.map((mode) => {
                const Icon = mode.icon;
                const isActive = cameraMode === mode.id;
                return (
                  <Pressable 
                    key={mode.id} 
                    style={[styles.modeButton, isActive && styles.activeModeButton]} 
                    onPress={() => {
                      setCameraMode(mode.id);
                      handleHaptic('light');
                    }}
                    testID={`mode-${mode.id}`}
                  >
                    <Icon 
                      color={isActive ? '#000000' : '#FFFFFF'} 
                      size={20} 
                    />
                    <Text style={[styles.modeText, isActive && styles.activeModeText]}>
                      {mode.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          <View style={[styles.bottomControls, { bottom: Math.max(insets.bottom, 24) + 90 }]}>
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

            <Animated.View style={{ transform: [{ scale: isRecording ? pulseAnim : captureAnim }] }}>
              <Pressable
                style={[
                  styles.captureButton,
                  cameraMode === 'video' && isRecording && styles.recordingCaptureButton
                ]}
                onPress={cameraMode === 'video' ? startStopRecording : takePicture}
                testID="capture-btn"
              >
                <View style={styles.captureButtonOuter}>
                  <View style={[
                    styles.captureButtonInner,
                    cameraMode === 'video' && isRecording && styles.recordingInner
                  ]}>
                    {cameraMode === 'video' && isRecording ? (
                      <StopCircle color="#FFFFFF" size={32} />
                    ) : (
                      <Circle color="#FFFFFF" size={32} fill="#FFFFFF" />
                    )}
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

          <View style={[styles.zoomControls, { bottom: Math.max(insets.bottom, 24) + 250 }]}>
            <Pressable 
              style={styles.zoomButton} 
              onPress={() => setZoom(z => Math.max(0, +(z - 0.2).toFixed(2)))}
              testID="zoom-out"
            >
              <Text style={styles.zoomButtonText}>1x</Text>
            </Pressable>
            <Pressable 
              style={styles.zoomButton} 
              onPress={() => setZoom(z => Math.min(1, +(z + 0.2).toFixed(2)))}
              testID="zoom-in"
            >
              <Text style={styles.zoomButtonText}>3x</Text>
            </Pressable>
            <Pressable 
              style={styles.zoomButton} 
              onPress={() => setZoom(1)}
              testID="zoom-max"
            >
              <Text style={styles.zoomButtonText}>10x</Text>
            </Pressable>
          </View>
        </CameraView>
      </View>

      <Modal visible={showAlbumSelector} transparent animationType="slide" onRequestClose={() => setShowAlbumSelector(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Ajouter à un album</Text>
            <Text style={styles.modalSubtitle}>Sélectionnez un album pour votre {cameraMode === 'video' ? 'vidéo' : 'photo'}</Text>
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

      <CameraFilters
        isVisible={showFilters}
        onClose={() => setShowFilters(false)}
        onPhotoTaken={(uri) => {
          setRecentPhotos((p) => [uri, ...p.slice(0, 9)]);
          setCapturedPhoto(uri);
          setShowAlbumSelector(true);
        }}
      />
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
  timerText: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#FFD700',
    color: '#000000',
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 6,
    minWidth: 16,
    textAlign: 'center',
  },
  recordingIndicator: {
    position: 'absolute',
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 8,
    zIndex: 25,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  recordingText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
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
  countdownOverlay: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    zIndex: 30,
  },
  countdownText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
  },
  modeSelector: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 20,
  },
  modeSelectorContent: {
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 12,
  },
  modeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    minWidth: 100,
    justifyContent: 'center',
  },
  activeModeButton: {
    backgroundColor: '#FFD700',
  },
  modeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  activeModeText: {
    color: '#000000',
    fontWeight: '800',
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
  recordingCaptureButton: {
    borderWidth: 4,
    borderColor: '#FF3B30',
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
  recordingInner: {
    backgroundColor: '#FF3B30',
    borderRadius: 8,
    width: 32,
    height: 32,
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