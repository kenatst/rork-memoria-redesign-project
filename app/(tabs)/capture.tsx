import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { View, StyleSheet, Text, Pressable, Alert, Platform, Animated, Dimensions, ScrollView, Modal, KeyboardAvoidingView } from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import * as MediaLibrary from 'expo-media-library';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Sharing from 'expo-sharing';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { 
  Camera, 
  RotateCcw, 
  Zap, 
  ZapOff, 
  Grid3X3, 
  Palette,
  Wand2
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useAppState } from '@/providers/AppStateProvider';
import { CameraFilters } from '@/components/CameraFilters';
import ImageCompression from '@/components/ImageCompression';
import { useImageCompression } from '@/providers/ImageCompressionProvider';
import { useOfflineQueue } from '@/providers/OfflineQueueProvider';
import { useAI } from '@/providers/AIProvider';
import { CloudinaryUploadResult } from '@/lib/cloudinary';

const { height: screenHeight } = Dimensions.get('window');

export default function CaptureScreen() {
  const { albums, addPhotoToAlbum } = useAppState();
  const { compressImage, isCompressing, compressAndUpload } = useImageCompression();
  const { addToQueue, pendingCount } = useOfflineQueue();
  const { analyzePhotos, isAnalyzing } = useAI();
  const insets = useSafeAreaInsets();
  const [facing, setFacing] = useState<CameraType>('back');
  const [flash, setFlash] = useState<'off' | 'on' | 'auto'>('off');
  const [grid, setGrid] = useState<boolean>(false);

  const [zoom, setZoom] = useState<number>(0);
  const [ratio, setRatio] = useState<'full' | '3:4' | '16:9'>('full'); // UI crop only, camera stays full screen

  const [filterMode, setFilterMode] = useState<string>('none');
  const [exposure, setExposure] = useState<number>(0);
  const [brightness, setBrightness] = useState<number>(0);
  const [contrast, setContrast] = useState<number>(1);
  const [saturation, setSaturation] = useState<number>(1);
  const [showAdvancedControls, setShowAdvancedControls] = useState<boolean>(false);
  const [cameraMode, setCameraMode] = useState<'photo' | 'video' | 'portrait' | 'square'>('photo');
  const [timer, setTimer] = useState<0 | 3 | 10>(0);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [showCaptureAnimation, setShowCaptureAnimation] = useState<boolean>(false);
  const [recentPhotos, setRecentPhotos] = useState<string[]>([]);
  const [showGallery, setShowGallery] = useState<boolean>(false);
  const [showAlbumSelector, setShowAlbumSelector] = useState<boolean>(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [showCameraFilters, setShowCameraFilters] = useState<boolean>(false);
  const [showImageCompression, setShowImageCompression] = useState<boolean>(false);
  const [imageToCompress, setImageToCompress] = useState<string | null>(null);
  const [isUploadingToCloud, setIsUploadingToCloud] = useState<boolean>(false);
  const [cloudUploadResults, setCloudUploadResults] = useState<CloudinaryUploadResult[]>([]);
  const [permission, requestPermission] = useCameraPermissions();
  const [mediaPermission] = MediaLibrary.usePermissions();
  const cameraRef = useRef<CameraView>(null);
  
  const [captureAnim] = useState(() => new Animated.Value(1));
  const [glowAnim] = useState(() => new Animated.Value(0));
  const [pulseAnim] = useState(() => new Animated.Value(1));
  const [floatAnim] = useState(() => new Animated.Value(0));
  const [flashAnim] = useState(() => new Animated.Value(0));
  const [scaleAnim] = useState(() => new Animated.Value(1));
  const [rotateAnim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.1, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: 1, duration: 3000, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 3000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const handleHapticFeedback = useCallback((style: 'light' | 'medium' | 'heavy' = 'medium') => {
    if (Platform.OS !== 'web') {
      const hapticStyle = style === 'light' ? Haptics.ImpactFeedbackStyle.Light :
                         style === 'heavy' ? Haptics.ImpactFeedbackStyle.Heavy :
                         Haptics.ImpactFeedbackStyle.Medium;
      Haptics.impactAsync(hapticStyle);
    } else {
      console.log('Haptics not available on web');
    }
  }, []);

  const applyFilter = useCallback(async (uri: string, filter: string) => {
    if (filter === 'none' && exposure === 0 && brightness === 0 && contrast === 1 && saturation === 1) {
      return uri;
    }
    
    try {
      let manipulations: ImageManipulator.Action[] = [];
      
      // Apply exposure, brightness, contrast, saturation
      if (exposure !== 0 || brightness !== 0 || contrast !== 1 || saturation !== 1) {
        // Note: ImageManipulator doesn't support these directly, but we can simulate some effects
        // For a real app, you'd want to use a more advanced image processing library
      }
      
      // Apply preset filters
      switch (filter) {
        case 'vintage':
          // Simulate vintage effect with resize and format change
          break;
        case 'noir':
          // Simulate black and white
          break;
        case 'vivid':
          // Simulate vivid colors
          break;
        case 'warm':
          // Simulate warm tone
          break;
        case 'cool':
          // Simulate cool tone
          break;
      }
      
      const result = await ImageManipulator.manipulateAsync(
        uri,
        manipulations,
        { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
      );
      return result.uri;
    } catch (error) {
      console.log('Erreur filtre:', error);
      return uri;
    }
  }, [exposure, brightness, contrast, saturation]);

  const playFlashAnimation = useCallback(() => {
    setShowCaptureAnimation(true);
    Animated.sequence([
      Animated.timing(flashAnim, { toValue: 1, duration: 50, useNativeDriver: true }),
      Animated.timing(flashAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
    ]).start(() => {
      setShowCaptureAnimation(false);
    });
  }, [flashAnim]);

  const startStopRecording = useCallback(async () => {
    try {
      if (!cameraRef.current) return;
      if (Platform.OS === 'web') {
        Alert.alert('Vidéo non disponible sur web', 'Utilisez l’app mobile pour l’enregistrement.');
        return;
      }
      if (!isRecording) {
        handleHapticFeedback('heavy');
        setIsRecording(true);
        setShowCaptureAnimation(false);
        (cameraRef.current as any).startRecording({
          maxDuration: 600,
          onRecordingFinished: (video: { uri: string }) => {
            console.log('Recording finished', video);
            setIsRecording(false);
            setCapturedPhoto(video?.uri ?? null);
            setShowAlbumSelector(true);
          },
          onRecordingError: (e: unknown) => {
            console.log('Recording error', e);
            setIsRecording(false);
            Alert.alert('Erreur', "Impossible d'enregistrer la vidéo");
          }
        });
      } else {
        (cameraRef.current as any).stopRecording();
      }
    } catch (e) {
      console.log('Video toggle error', e);
      setIsRecording(false);
    }
  }, [isRecording, handleHapticFeedback]);

  const takePicture = useCallback(async () => {
    if (!cameraRef.current) return;
    
    // Enhanced haptic feedback
    handleHapticFeedback('heavy');
    
    // Play capture animation
    playFlashAnimation();
    
    // Button animation
    Animated.sequence([
      Animated.timing(captureAnim, { toValue: 0.8, duration: 100, useNativeDriver: true }),
      Animated.timing(captureAnim, { toValue: 1.1, duration: 100, useNativeDriver: true }),
      Animated.timing(captureAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();

    // Scale animation for the whole camera view
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.95, duration: 100, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();

    try {
      const photo = await cameraRef.current.takePictureAsync({ 
        quality: 0.9, 
        base64: false, 
        exif: true,
        skipProcessing: false
      });
      
      if (photo) {
        const filteredUri = await applyFilter(photo.uri, filterMode);
        
        // Auto-compress and upload to Cloudinary
        try {
          setIsUploadingToCloud(true);
          
          // Compress and upload to Cloudinary in one step
          const cloudResult = await compressAndUpload(filteredUri, {
            folder: 'memoria/captures',
            tags: ['capture', 'memoria-app', 'auto-upload'],
            context: {
              source: 'camera-capture',
              timestamp: Date.now().toString(),
              filter: filterMode,
              camera_mode: cameraMode
            }
          });
          
          console.log('☁️ [Capture] Photo uploaded to Cloudinary:', cloudResult.secure_url);
          
          // Store cloud result
          setCloudUploadResults(prev => [cloudResult, ...prev.slice(0, 9)]);
          
          // Save locally if permission granted
          if (mediaPermission?.granted) {
            await MediaLibrary.saveToLibraryAsync(filteredUri);
          } else {
            // Add to offline queue if no permission
            addToQueue('photo_upload', { 
              uri: filteredUri, 
              cloudUrl: cloudResult.secure_url,
              timestamp: Date.now() 
            });
          }
          
          setRecentPhotos(prev => [filteredUri, ...prev.slice(0, 9)]);
          
          // Analyze photo with AI in background
          analyzePhotos([filteredUri]).catch(console.error);
          
          // Show success message
          Alert.alert(
            '✅ Photo capturée',
            `Photo compressée et uploadée vers le cloud avec succès!\n\nURL: ${cloudResult.secure_url.substring(0, 50)}...`,
            [{ text: 'OK' }]
          );
          
          setImageToCompress(filteredUri);
          setShowImageCompression(true);
        } catch (error) {
          console.error('❌ [Capture] Cloud upload failed, using local compression:', error);
          
          // Fallback to local compression only
          try {
            const compressedResult = await compressImage(filteredUri);
            const finalUri = compressedResult.uri;
            
            if (mediaPermission?.granted) {
              await MediaLibrary.saveToLibraryAsync(finalUri);
            } else {
              addToQueue('photo_upload', { uri: finalUri, timestamp: Date.now() });
            }
            
            setRecentPhotos(prev => [finalUri, ...prev.slice(0, 9)]);
            analyzePhotos([finalUri]).catch(console.error);
            
            Alert.alert(
              '⚠️ Upload cloud échoué',
              'Photo compressée et sauvegardée localement. L\'upload sera retenté plus tard.',
              [{ text: 'OK' }]
            );
            
            setImageToCompress(finalUri);
            setShowImageCompression(true);
          } catch (compressionError) {
            console.error('Compression also failed, using original:', compressionError);
            if (mediaPermission?.granted) {
              await MediaLibrary.saveToLibraryAsync(filteredUri);
            }
            setRecentPhotos(prev => [filteredUri, ...prev.slice(0, 9)]);
            setImageToCompress(filteredUri);
            setShowImageCompression(true);
          }
        } finally {
          setIsUploadingToCloud(false);
        }
      }
    } catch (error) {
      console.log('Erreur capture:', error);
      Alert.alert('Erreur', "Impossible de prendre la photo");
    }
  }, [applyFilter, filterMode, mediaPermission, handleHapticFeedback, playFlashAnimation, captureAnim, scaleAnim]);

  const handleAddToAlbum = (albumId: string) => {
    if (capturedPhoto) {
      try {
        addPhotoToAlbum(albumId, capturedPhoto);
        Alert.alert('Succès', "Photo ajoutée à l'album!");
      } catch (error) {
        // Add to offline queue if failed
        addToQueue('photo_upload', { 
          albumId, 
          photoUri: capturedPhoto, 
          timestamp: Date.now() 
        });
        Alert.alert('Ajouté à la file', "Photo sera synchronisée quand la connexion sera rétablie");
      }
      setShowAlbumSelector(false);
      setCapturedPhoto(null);
    }
  };

  const handleDeleteCaptured = () => {
    if (!capturedPhoto) return;
    setRecentPhotos(prev => prev.filter(u => u !== capturedPhoto));
    setCapturedPhoto(null);
    setShowAlbumSelector(false);
  };

  const handleSkipAlbum = () => {
    Alert.alert('Photo sauvegardée', 'Votre photo a été sauvegardée dans votre galerie.');
    setShowAlbumSelector(false);
    setCapturedPhoto(null);
  };

  const toggleCameraFacing = useCallback(() => {
    handleHapticFeedback('light');
    
    // Rotation animation for flip button
    const currentValue = (rotateAnim as any)._value || 0;
    Animated.timing(rotateAnim, {
      toValue: currentValue + 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
    
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  }, [handleHapticFeedback, rotateAnim]);

  const toggleFlash = useCallback(() => {
    handleHapticFeedback('light');
    setFlash(current => (current === 'off' ? 'on' : current === 'on' ? 'auto' : 'off'));
  }, [handleHapticFeedback]);

  const toggleGrid = useCallback(() => {
    handleHapticFeedback('light');
    setGrid(v => !v);
  }, [handleHapticFeedback]);

  const cycleFilter = useCallback(() => {
    handleHapticFeedback('light');
    setShowCameraFilters(true);
  }, [handleHapticFeedback]);
  
  const cycleCameraMode = useCallback(() => {
    handleHapticFeedback('light');
    const modes: Array<'photo' | 'video' | 'portrait' | 'square'> = ['photo', 'video', 'portrait', 'square'];
    const currentIndex = modes.indexOf(cameraMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setCameraMode(modes[nextIndex]);
  }, [cameraMode, handleHapticFeedback]);
  
  const cycleTimer = useCallback(() => {
    handleHapticFeedback('light');
    const timers: Array<0 | 3 | 10> = [0, 3, 10];
    const currentIndex = timers.indexOf(timer);
    const nextIndex = (currentIndex + 1) % timers.length;
    setTimer(timers[nextIndex]);
  }, [timer, handleHapticFeedback]);
  
  const resetAdvancedSettings = useCallback(() => {
    setExposure(0);
    setBrightness(0);
    setContrast(1);
    setSaturation(1);
  }, []);
  
  const toggleAdvancedControls = useCallback(() => {
    handleHapticFeedback('light');
    setShowAdvancedControls(prev => !prev);
  }, [handleHapticFeedback]);

  const lastPhoto = useMemo(() => recentPhotos[0] ?? null, [recentPhotos]);

  const handleShareLast = useCallback(async () => {
    if (!lastPhoto) return;
    try {
      if (Platform.OS === 'web') {
        if (navigator.share) {
          await navigator.share({ title: 'Photo', url: lastPhoto });
        } else if (navigator.clipboard) {
          await navigator.clipboard.writeText(lastPhoto);
          Alert.alert('Lien copié', 'URL de la photo copiée dans le presse-papiers');
        } else {
          Alert.alert('Partage non disponible', 'Utilisez le bouton Voir pour ouvrir l’image');
        }
      } else if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(lastPhoto);
      } else {
        Alert.alert('Partage non disponible');
      }
    } catch (e) {
      console.log('Share error', e);
      Alert.alert('Erreur', 'Impossible de partager');
    }
  }, [lastPhoto]);

  const handleDeleteLast = useCallback(() => {
    if (!lastPhoto) return;
    setRecentPhotos(prev => prev.filter(u => u !== lastPhoto));
  }, [lastPhoto]);

  if (!permission) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#000000', '#1a1a1a']} style={StyleSheet.absoluteFillObject} />
        <Text style={styles.loadingText}>Chargement de la caméra...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#000000', '#1a1a1a']} style={StyleSheet.absoluteFillObject} />
        <View style={styles.permissionContainer}>
          <Camera color={Colors.palette.accentGold} size={64} />
          <Text style={styles.permissionTitle}>Accès Caméra Requis</Text>
          <Text style={styles.permissionText}>Memoria a besoin d'accéder à votre caméra</Text>
          <Pressable style={styles.permissionButton} onPress={requestPermission}>
            <LinearGradient colors={['#FFD700', '#FFA500']} style={styles.permissionButtonGradient}>
              <Text style={styles.permissionButtonText}>Autoriser l'Accès</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    );
  }

  const ratioBoxStyle = ratio === '3:4' ? styles.ratio34 : ratio === '16:9' ? styles.ratio169 : styles.ratioFull;

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <View style={styles.container}>
      <View style={[styles.cameraWrapper, { paddingTop: Math.max(0, insets.top), paddingBottom: Math.max(0, insets.bottom) }]}>
        <Animated.View style={[styles.ratioFull, { transform: [{ scale: scaleAnim }] }]}> 
          <CameraView
            ref={cameraRef}
            style={StyleSheet.absoluteFillObject}
            facing={facing}
            flash={flash}
            zoom={zoom}
            mode={cameraMode === 'video' ? 'video' : 'picture'}
          >
            {/* Flash Animation Overlay */}
            {showCaptureAnimation && (
              <Animated.View 
                style={[styles.flashOverlay, { opacity: flashAnim }]}
                pointerEvents="none"
              />
            )}

            {/* Letterboxing mask for stable preview when ratio != full */}
            <View pointerEvents="none" style={StyleSheet.absoluteFill}>
              {ratio !== 'full' && (
                <RatioMask ratio={ratio} />
              )}
            </View>

            {grid && (
              <View style={styles.gridOverlay}>
                <View style={styles.gridLine} />
                <View style={[styles.gridLine, styles.gridLineVertical]} />
                <View style={[styles.gridLine, styles.gridLineHorizontal1]} />
                <View style={[styles.gridLine, styles.gridLineHorizontal2]} />
                <View style={[styles.gridLine, styles.gridLineVertical1]} />
                <View style={[styles.gridLine, styles.gridLineVertical2]} />
              </View>
            )}

            {filterMode !== 'none' && (
              <Animated.View style={[styles.filterIndicator, { opacity: floatAnim }]}
                testID="filter-indicator">
                <Palette color="#FFD700" size={16} />
                <Text style={styles.filterText}>{filterMode.toUpperCase()}</Text>
              </Animated.View>
            )}

            {/* Offline Queue Indicator */}
            {pendingCount > 0 && (
              <View style={[styles.offlineIndicator, { top: Math.max(12, insets.top + 8) }]}>
                <Text style={styles.offlineText}>📤 {pendingCount} en attente</Text>
              </View>
            )}
            
            {/* AI Analysis Indicator */}
            {isAnalyzing && (
              <View style={[styles.aiIndicator, { top: Math.max(40, insets.top + 36) }]}>
                <Text style={styles.aiText}>🧠 Analyse IA...</Text>
              </View>
            )}
            
            {/* Compression Indicator */}
            {isCompressing && (
              <View style={[styles.compressionIndicator, { top: Math.max(68, insets.top + 64) }]}>
                <Text style={styles.compressionText}>🗜️ Compression...</Text>
              </View>
            )}
            
            {/* Cloud Upload Indicator */}
            {isUploadingToCloud && (
              <View style={[styles.cloudUploadIndicator, { top: Math.max(96, insets.top + 92) }]}>
                <Text style={styles.cloudUploadText}>☁️ Upload cloud...</Text>
              </View>
            )}
            
            {/* Cloud Success Indicator */}
            {cloudUploadResults.length > 0 && (
              <View style={[styles.cloudSuccessIndicator, { top: Math.max(124, insets.top + 120) }]}>
                <Text style={styles.cloudSuccessText}>✅ {cloudUploadResults.length} dans le cloud</Text>
              </View>
            )}

            <View style={[styles.topControls, { top: Math.max(96, insets.top + 92) }]}>
              {Platform.OS !== 'web' ? (
                <BlurView intensity={20} style={styles.controlsBlur}>
                  <View style={styles.controlsContent}>
                    <Pressable style={styles.controlButton} onPress={toggleFlash} testID="flash-btn">
                      {flash === 'off' ? (
                        <ZapOff color="#FFFFFF" size={24} />
                      ) : flash === 'on' ? (
                        <Zap color="#FFD700" size={24} />
                      ) : (
                        <Zap color="#FFA500" size={24} />
                      )}
                    </Pressable>
                    <Pressable style={styles.controlButton} onPress={toggleGrid} testID="grid-btn">
                      <Grid3X3 color={grid ? '#FFD700' : '#FFFFFF'} size={24} />
                    </Pressable>
                    <Pressable style={styles.controlButton} onPress={cycleTimer} testID="timer-btn">
                      <Text style={[styles.ratioText, { color: timer > 0 ? '#FFD700' : '#FFFFFF' }]}>
                        {timer > 0 ? `${timer}s` : '⏱'}
                      </Text>
                    </Pressable>
                    <Pressable style={styles.controlButton} onPress={() => setRatio(prev => prev === 'full' ? '3:4' : prev === '3:4' ? '16:9' : 'full')} testID="ratio-btn">
                      <Text style={styles.ratioText}>{ratio}</Text>
                    </Pressable>
                  </View>
                </BlurView>
              ) : (
                <View style={[styles.controlsBlur, styles.webBlur]}>
                  <View style={styles.controlsContent}>
                    <Pressable style={styles.controlButton} onPress={toggleFlash}>
                      {flash === 'off' ? (
                        <ZapOff color="#FFFFFF" size={24} />
                      ) : flash === 'on' ? (
                        <Zap color="#FFD700" size={24} />
                      ) : (
                        <Zap color="#FFA500" size={24} />
                      )}
                    </Pressable>
                    <Pressable style={styles.controlButton} onPress={toggleGrid}>
                      <Grid3X3 color={grid ? '#FFD700' : '#FFFFFF'} size={24} />
                    </Pressable>
                    <Pressable style={styles.controlButton} onPress={cycleTimer}>
                      <Text style={[styles.ratioText, { color: timer > 0 ? '#FFD700' : '#FFFFFF' }]}>
                        {timer > 0 ? `${timer}s` : '⏱'}
                      </Text>
                    </Pressable>
                    <Pressable style={styles.controlButton} onPress={() => setRatio(prev => prev === 'full' ? '3:4' : prev === '3:4' ? '16:9' : 'full')}>
                      <Text style={styles.ratioText}>{ratio}</Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </View>
            
            {/* Camera Mode Indicator */}
            <View style={[styles.modeIndicator, { top: Math.max(60, insets.top + 50) }]}>
              <Text style={styles.modeText}>{cameraMode.toUpperCase()}</Text>
            </View>

            <View style={[styles.bottomControls, { bottom: Math.max(100, insets.bottom + 80) }]}>
              {Platform.OS !== 'web' ? (
                <BlurView intensity={30} style={styles.bottomBlur}>
                  <View style={styles.bottomContent}>
                    <Pressable style={styles.sideButton} onPress={cycleFilter} testID="filter-btn">
                      <Wand2 color={filterMode !== 'none' ? '#FFD700' : '#FFFFFF'} size={28} />
                    </Pressable>

                    <View style={styles.captureSection}>
                      <Pressable style={styles.modeButton} onPress={cycleCameraMode} testID="mode-btn">
                        <Text style={styles.modeButtonText}>{cameraMode}</Text>
                      </Pressable>
                      
                      <Animated.View style={{ transform: [{ scale: captureAnim }] }}>
                        <Pressable 
                          style={[
                            styles.captureButton,
                            cameraMode === 'video' && isRecording && styles.recordingButton
                          ]} 
                          onPress={cameraMode === 'video' ? startStopRecording : takePicture} 
                          testID="capture-btn"
                        >
                          <LinearGradient 
                            colors={isRecording ? ['#FF3B30', '#FF1744'] : ['#FFD700', '#FFA500', '#FF6B35']} 
                            style={styles.captureGradient}
                          >
                            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                              <Camera color={isRecording ? '#FF3B30' : '#000000'} size={32} strokeWidth={3} />
                            </Animated.View>
                          </LinearGradient>
                        </Pressable>
                      </Animated.View>
                    </View>

                    <Animated.View style={{ transform: [{ rotate: rotateInterpolate }] }}>
                      <Pressable style={styles.sideButton} onPress={toggleCameraFacing} testID="flip-btn">
                        <RotateCcw color="#FFFFFF" size={28} />
                      </Pressable>
                    </Animated.View>
                  </View>
                  <View style={styles.zoomRow}>
                    <Pressable style={styles.zoomBtn} onPress={() => setZoom(z => Math.max(0, +(z - 0.1).toFixed(2)))} testID="zoom-out">
                      <Text style={styles.zoomText}>-</Text>
                    </Pressable>
                    <View style={styles.zoomValue}><Text style={styles.zoomTextSmall}>{Math.round(1 + zoom * 9)}x</Text></View>
                    <Pressable style={styles.zoomBtn} onPress={() => setZoom(z => Math.min(1, +(z + 0.1).toFixed(2)))} testID="zoom-in">
                      <Text style={styles.zoomText}>+</Text>
                    </Pressable>
                  </View>
                </BlurView>
              ) : (
                <View style={[styles.bottomBlur, styles.webBlur]}>
                  <View style={styles.bottomContent}>
                    <Pressable style={styles.sideButton} onPress={cycleFilter}>
                      <Wand2 color={filterMode !== 'none' ? '#FFD700' : '#FFFFFF'} size={28} />
                    </Pressable>
                    
                    <View style={styles.captureSection}>
                      <Pressable style={styles.modeButton} onPress={cycleCameraMode}>
                        <Text style={styles.modeButtonText}>{cameraMode}</Text>
                      </Pressable>
                      
                      <Animated.View style={{ transform: [{ scale: captureAnim }] }}>
                        <Pressable 
                          style={[
                            styles.captureButton,
                            cameraMode === 'video' && isRecording && styles.recordingButton
                          ]} 
                          onPress={takePicture}
                        >
                          <LinearGradient 
                            colors={isRecording ? ['#FF3B30', '#FF1744'] : ['#FFD700', '#FFA500', '#FF6B35']} 
                            style={styles.captureGradient}
                          >
                            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                              <Camera color={isRecording ? '#FF3B30' : '#000000'} size={32} strokeWidth={3} />
                            </Animated.View>
                          </LinearGradient>
                        </Pressable>
                      </Animated.View>
                    </View>
                    
                    <Animated.View style={{ transform: [{ rotate: rotateInterpolate }] }}>
                      <Pressable style={styles.sideButton} onPress={toggleCameraFacing}>
                        <RotateCcw color="#FFFFFF" size={28} />
                      </Pressable>
                    </Animated.View>
                  </View>
                  <View style={styles.zoomRow}>
                    <Pressable style={styles.zoomBtn} onPress={() => setZoom(z => Math.max(0, +(z - 0.1).toFixed(2)))}>
                      <Text style={styles.zoomText}>-</Text>
                    </Pressable>
                    <View style={styles.zoomValue}><Text style={styles.zoomTextSmall}>{Math.round(1 + zoom * 9)}x</Text></View>
                    <Pressable style={styles.zoomBtn} onPress={() => setZoom(z => Math.min(1, +(z + 0.1).toFixed(2)))}>
                      <Text style={styles.zoomText}>+</Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </View>

            {lastPhoto && (
              <Pressable
                style={[styles.lastThumb, { bottom: Math.max(116, insets.bottom + 56) }]}
                onPress={() => { setCapturedPhoto(lastPhoto); setShowAlbumSelector(true); }}
                testID="last-photo-thumb"
              >
                <Image source={{ uri: lastPhoto }} style={styles.lastThumbImage} contentFit="cover" />
              </Pressable>
            )}
            {/* Portrait mode overlay */}
            {cameraMode === 'portrait' && (
              <View pointerEvents="none" style={StyleSheet.absoluteFill}>
                <LinearGradient colors={["rgba(0,0,0,0.6)", 'transparent', 'transparent', "rgba(0,0,0,0.6)"]} locations={[0,0.25,0.75,1]} style={StyleSheet.absoluteFillObject} />
              </View>
            )}
          </CameraView>
        </Animated.View>
      </View>
      
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {showGallery && recentPhotos.length > 0 && (
          <View style={[styles.galleryContainer, { bottom: Math.max(200, insets.bottom + 100) }]}>
            {Platform.OS !== 'web' ? (
              <BlurView intensity={30} style={styles.galleryBlur}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.galleryScroll}>
                  {recentPhotos.map((uri, index) => (
                    <Pressable key={index} style={styles.galleryItem} onPress={() => {}}>
                      <Image source={{ uri }} style={styles.galleryImage} contentFit="cover" />
                    </Pressable>
                  ))}
                </ScrollView>
              </BlurView>
            ) : (
              <View style={[styles.galleryBlur, styles.webBlur]}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.galleryScroll}>
                  {recentPhotos.map((uri, index) => (
                    <Pressable key={index} style={styles.galleryItem} onPress={() => {}}>
                      <Image source={{ uri }} style={styles.galleryImage} contentFit="cover" />
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        )}

        <Pressable 
          style={[styles.galleryToggle, { bottom: Math.max(120, insets.bottom + 60) }]} 
          onPress={() => { setShowGallery(!showGallery); }}
          testID="toggle-gallery"
        >
          <Text style={styles.galleryToggleText}>{recentPhotos.length}</Text>
        </Pressable>

        <Modal visible={showAlbumSelector} transparent animationType="slide" onRequestClose={() => setShowAlbumSelector(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Ajouter à un album</Text>
              <Text style={styles.modalSubtitle}>Sélectionnez un album pour votre photo</Text>
              <ScrollView style={styles.albumsList} showsVerticalScrollIndicator={false}>
                {albums.map(album => (
                  <Pressable key={album.id} style={styles.albumItem} onPress={() => handleAddToAlbum(album.id)} testID={`select-album-${album.id}`}>
                    <View style={styles.albumItemContent}>
                      <Text style={styles.albumItemName}>{album.name}</Text>
                      <Text style={styles.albumItemCount}>{album.photos.length} photos</Text>
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
              <View style={[styles.modalActions, { flexDirection: 'row', gap: 12 }]}>
                <Pressable style={[styles.skipBtn, { flex: 1 }]} onPress={handleSkipAlbum} testID="skip-album">
                  <Text style={styles.skipText}>Passer</Text>
                </Pressable>
                <Pressable style={[styles.deleteBtn, { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' }]} onPress={handleDeleteCaptured} testID="delete-captured">
                  <Text style={styles.actionText}>Supprimer</Text>
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>



        {/* Camera Filters Modal */}
        <CameraFilters 
          isVisible={showCameraFilters}
          onClose={() => setShowCameraFilters(false)}
          onPhotoTaken={(uri, filter) => {
            if (mediaPermission?.granted) {
              MediaLibrary.saveToLibraryAsync(uri);
            }
            setRecentPhotos(prev => [uri, ...prev.slice(0, 9)]);
            setImageToCompress(uri);
            setShowImageCompression(true);
            if (filter) {
              setFilterMode(filter.id);
            }
          }}
        />

        {/* Image Compression Modal */}
        <ImageCompression
          visible={showImageCompression}
          imageUri={imageToCompress || ''}
          onClose={() => {
            setShowImageCompression(false);
            setImageToCompress(null);
          }}
          onCompress={(compressedUri) => {
            setCapturedPhoto(compressedUri);
            setShowAlbumSelector(true);
            setShowImageCompression(false);
            setImageToCompress(null);
          }}
        />
      </SafeAreaView>
    </View>
  );
}

// Stable letterbox mask component
function RatioMask({ ratio }: { ratio: '3:4' | '16:9' }) {
  const { width, height } = Dimensions.get('window');
  const contentHeight = ratio === '3:4' ? (width * 4) / 3 : (width * 9) / 16;
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
  cameraWrapper: { 
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center'
  },
  ratioFull: { 
    width: '100%',
    height: '100%'
  },
  ratio34: { 
    width: '100%',
    aspectRatio: 3/4,
    maxHeight: '100%'
  },
  ratio169: { 
    width: '100%',
    aspectRatio: 16/9,
    maxHeight: '100%'
  },
  loadingText: { color: '#FFFFFF', fontSize: 18, textAlign: 'center', marginTop: screenHeight / 2 },
  permissionContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40, gap: 24 },
  permissionTitle: { color: '#FFFFFF', fontSize: 24, fontWeight: '800', textAlign: 'center' },
  permissionText: { color: Colors.palette.taupe, fontSize: 16, textAlign: 'center', lineHeight: 24 },
  permissionButton: { borderRadius: 16, overflow: 'hidden', marginTop: 16 },
  permissionButtonGradient: { paddingHorizontal: 32, paddingVertical: 16 },
  permissionButtonText: { color: '#000000', fontSize: 16, fontWeight: '800', textAlign: 'center' },

  gridOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 5 },
  gridLine: { position: 'absolute', backgroundColor: 'rgba(255,255,255,0.3)', width: 1, height: '100%', left: '50%' },
  gridLineVertical: { left: '50%' },
  gridLineVertical1: { left: '33.33%' },
  gridLineVertical2: { left: '66.66%' },
  gridLineHorizontal1: { position: 'absolute', backgroundColor: 'rgba(255,255,255,0.3)', width: '100%', height: 1, top: '33.33%' },
  gridLineHorizontal2: { position: 'absolute', backgroundColor: 'rgba(255,255,255,0.3)', width: '100%', height: 1, top: '66.66%' },
  
  flashOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#FFFFFF', zIndex: 100 },
  modeIndicator: { position: 'absolute', top: 80, left: 20, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, zIndex: 20 },
  modeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  recDotRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  recDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF3B30' },
  recText: { color: '#FF3B30', fontSize: 12, fontWeight: '800' },
  captureSection: { alignItems: 'center', gap: 8 },
  modeButton: { backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  modeButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  recordingButton: { borderWidth: 3, borderColor: '#FF3B30' },

  topControls: { position: 'absolute', top: 20, left: 20, right: 20, zIndex: 20 },
  controlsBlur: { borderRadius: 20, overflow: 'hidden' },
  webBlur: { backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(20px)' as any },
  controlsContent: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 12, paddingHorizontal: 20 },
  controlButton: { padding: 12, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)' },
  ratioText: { color: '#FFFFFF', fontWeight: '800' },

  filterIndicator: { position: 'absolute', top: 120, right: 20, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, zIndex: 20 },
  filterText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },

  bottomControls: { position: 'absolute', bottom: 120, left: 20, right: 20, zIndex: 20 },
  bottomBlur: { borderRadius: 30, overflow: 'hidden' },
  bottomContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, paddingHorizontal: 24 },
  sideButton: { padding: 16, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)' },
  captureButton: { width: 80, height: 80, borderRadius: 40, position: 'relative', shadowColor: '#FFD700', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 10, elevation: 10 },
  captureGradient: { flex: 1, borderRadius: 40, justifyContent: 'center', alignItems: 'center' },

  zoomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingBottom: 8 },
  zoomBtn: { backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 12 },
  zoomText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },
  zoomTextSmall: { color: '#FFFFFF', fontWeight: '700', fontSize: 12 },
  zoomValue: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.08)' },

  galleryContainer: { position: 'absolute', bottom: 220, left: 20, right: 20, height: 80, zIndex: 15 },
  galleryBlur: { borderRadius: 16, overflow: 'hidden', paddingVertical: 8 },
  galleryScroll: { paddingHorizontal: 12 },
  galleryItem: { width: 60, height: 60, borderRadius: 12, marginRight: 8, overflow: 'hidden', borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)' },
  galleryImage: { width: '100%', height: '100%' },
  galleryToggle: { position: 'absolute', bottom: 140, left: 30, width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', zIndex: 25 },

  lastThumb: { position: 'absolute', bottom: 136, right: 30, width: 54, height: 54, borderRadius: 12, overflow: 'hidden', borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)', zIndex: 26 },
  lastThumbImage: { width: '100%', height: '100%' },

  modalBackdropCenter: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  photoActionsCard: { width: '100%', maxWidth: 420, backgroundColor: '#0B0B0D', borderRadius: 16, overflow: 'hidden' },
  photoPreview: { width: '100%', height: 240 },
  actionsRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, gap: 10 },
  actionBtn: { flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  deleteBtn: { backgroundColor: 'rgba(255,0,0,0.2)' },
  actionText: { color: '#FFFFFF', fontWeight: '700' },
  closeBtn: { backgroundColor: 'rgba(255,255,255,0.1)', paddingVertical: 12, margin: 16, borderRadius: 12, alignItems: 'center' },
  closeText: { color: '#FFFFFF', fontWeight: '700' },
  galleryToggleText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#0B0B0D', padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '70%' },
  modalTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  modalSubtitle: { color: '#A9AFBC', fontSize: 14, textAlign: 'center', marginBottom: 20 },
  albumsList: { maxHeight: 300 },
  albumItem: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12, marginBottom: 12, overflow: 'hidden' },
  albumItemContent: { padding: 16 },
  albumItemName: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', marginBottom: 4 },
  albumItemCount: { color: '#A9AFBC', fontSize: 12 },
  modalActions: { marginTop: 16 },
  skipBtn: { backgroundColor: 'rgba(255,255,255,0.1)', paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  skipText: { color: '#FFFFFF', fontWeight: '700' },
  
  // New styles for providers integration
  offlineIndicator: {
    position: 'absolute',
    left: 20,
    backgroundColor: 'rgba(255, 165, 0, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    zIndex: 25,
  },
  offlineText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '700',
  },
  aiIndicator: {
    position: 'absolute',
    left: 20,
    backgroundColor: 'rgba(255, 215, 0, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    zIndex: 25,
  },
  aiText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '700',
  },
  compressionIndicator: {
    position: 'absolute',
    left: 20,
    backgroundColor: 'rgba(0, 255, 0, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    zIndex: 25,
  },
  compressionText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '700',
  },
  cloudUploadIndicator: {
    position: 'absolute',
    left: 20,
    backgroundColor: 'rgba(0, 191, 255, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    zIndex: 25,
  },
  cloudUploadText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '700',
  },
  cloudSuccessIndicator: {
    position: 'absolute',
    left: 20,
    backgroundColor: 'rgba(0, 255, 127, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    zIndex: 25,
  },
  cloudSuccessText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '700',
  },
});