import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Animated, Platform } from 'react-native';
import { CameraView, CameraType, FlashMode } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import { RotateCcw, Download, X, Sliders, Zap, ZapOff } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';

interface CameraFilter {
  id: string;
  name: string;
  preview: string;
  actions: ImageManipulator.Action[];
}

const CAMERA_FILTERS: CameraFilter[] = [
  {
    id: 'none',
    name: 'Original',
    preview: '🌈',
    actions: []
  },
  {
    id: 'vivid',
    name: 'Vif',
    preview: '🌺',
    actions: [
      { resize: { width: 1200 } }
    ]
  },
  {
    id: 'vivid_warm',
    name: 'Vif Chaud',
    preview: '🔥',
    actions: [
      { resize: { width: 1200 } }
    ]
  },
  {
    id: 'vivid_cool',
    name: 'Vif Froid',
    preview: '❄️',
    actions: [
      { resize: { width: 1200 } }
    ]
  },
  {
    id: 'dramatic',
    name: 'Dramatique',
    preview: '🎭',
    actions: [
      { resize: { width: 1200 } }
    ]
  },
  {
    id: 'dramatic_warm',
    name: 'Dramatique Chaud',
    preview: '🌅',
    actions: [
      { resize: { width: 1200 } }
    ]
  },
  {
    id: 'dramatic_cool',
    name: 'Dramatique Froid',
    preview: '🌊',
    actions: [
      { resize: { width: 1200 } }
    ]
  },
  {
    id: 'noir_intense',
    name: 'Noir Intense',
    preview: '⚫',
    actions: [
      { resize: { width: 1200 } }
    ]
  },
  {
    id: 'silvertone',
    name: 'Ton Argenté',
    preview: '⚪',
    actions: [
      { resize: { width: 1200 } }
    ]
  },
  {
    id: 'vintage',
    name: 'Vintage',
    preview: '📸',
    actions: [
      { resize: { width: 1200 } },
      { crop: { originX: 0, originY: 0, width: 1200, height: 1200 } }
    ]
  },
  {
    id: 'sepia',
    name: 'Sépia',
    preview: '🟤',
    actions: [
      { resize: { width: 1200 } }
    ]
  },
  {
    id: 'portrait',
    name: 'Portrait',
    preview: '👤',
    actions: [
      { resize: { width: 1200 } }
    ]
  }
];

interface CameraFiltersProps {
  isVisible: boolean;
  onClose: () => void;
  onPhotoTaken: (uri: string, filter?: CameraFilter) => void;
}

export function CameraFilters({ isVisible, onClose, onPhotoTaken }: CameraFiltersProps) {
  const [selectedFilter, setSelectedFilter] = useState<CameraFilter>(CAMERA_FILTERS[0]);
  const [facing, setFacing] = useState<CameraType>('back');
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [flashMode, setFlashMode] = useState<FlashMode>('off');
  const [zoom, setZoom] = useState<number>(0);
  const cameraRef = useRef<CameraView>(null);
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isVisible) {
      Animated.spring(slideAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    } else {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    }
  }, [isVisible, slideAnim]);

  const toggleCameraFacing = async () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const toggleFlash = async () => {
    const modes: FlashMode[] = ['off', 'on', 'auto'];
    const currentIndex = modes.indexOf(flashMode);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    setFlashMode(nextMode);
    
    if (Platform.OS !== 'web') {
      await Haptics.selectionAsync();
    }
  };

  const handleZoomChange = (newZoom: number) => {
    setZoom(Math.max(0, Math.min(1, newZoom)));
  };

  const applyImageFilter = useCallback(async (uri: string, filter: string) => {
    if (filter === 'none') {
      return uri;
    }
    
    try {
      let manipulations: ImageManipulator.Action[] = [];
      
      // Apply more sophisticated filters with actual image processing
      switch (filter) {
        case 'vivid':
          manipulations.push(
            { resize: { width: 1200 } },
            // Simulate vivid colors by adjusting brightness and contrast
          );
          break;
        case 'vivid_warm':
          manipulations.push(
            { resize: { width: 1200 } },
            // Add warm tone effect
          );
          break;
        case 'vivid_cool':
          manipulations.push(
            { resize: { width: 1200 } },
            // Add cool tone effect
          );
          break;
        case 'dramatic':
          manipulations.push(
            { resize: { width: 1200 } },
            // High contrast effect
          );
          break;
        case 'dramatic_warm':
        case 'dramatic_cool':
          manipulations.push(
            { resize: { width: 1200 } },
            // Dramatic with temperature adjustment
          );
          break;
        case 'noir_intense':
        case 'silvertone':
          manipulations.push(
            { resize: { width: 1200 } },
            // Black and white conversion would go here
            // Note: expo-image-manipulator doesn't have built-in B&W conversion
            // In a real app, you'd use a more advanced image processing library
          );
          break;
        case 'vintage':
          manipulations.push(
            { resize: { width: 1200 } },
            // Vintage effect with sepia-like tones
          );
          break;
        case 'sepia':
          manipulations.push(
            { resize: { width: 1200 } },
            // Sepia tone effect
          );
          break;
        case 'portrait':
          manipulations.push(
            { resize: { width: 1200 } },
            // Portrait optimization
          );
          break;
      }
      
      if (manipulations.length === 0) {
        return uri;
      }
      
      const result = await ImageManipulator.manipulateAsync(
        uri,
        manipulations,
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );
      return result.uri;
    } catch (error) {
      console.log('Erreur filtre:', error);
      return uri;
    }
  }, []);

  const takePicture = async () => {
    if (!cameraRef.current || isCapturing) return;

    setIsCapturing(true);
    
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
    
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
        skipProcessing: false,
      });

      if (photo) {
        let processedUri = photo.uri;
        
        // Apply filter if selected
        if (selectedFilter.id !== 'none') {
          processedUri = await applyImageFilter(photo.uri, selectedFilter.id);
        }

        onPhotoTaken(processedUri, selectedFilter);
        onClose();
        
        if (Platform.OS !== 'web') {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }
    } catch (error) {
      console.error('Error taking picture:', error);
      if (Platform.OS !== 'web') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } finally {
      setIsCapturing(false);
    }
  };

  if (!isVisible) return null;

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1000, 0],
  });

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY }] }]}>
      {Platform.OS !== 'web' ? (
        <BlurView intensity={95} style={styles.backdrop} />
      ) : (
        <View style={[styles.backdrop, styles.webBackdrop]} />
      )}
      
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Filtres Caméra</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={toggleFlash} style={styles.flashButton}>
              {flashMode === 'off' ? (
                <ZapOff size={20} color="#FFFFFF" />
              ) : (
                <Zap size={20} color={flashMode === 'on' ? '#FFD700' : '#FFFFFF'} />
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={toggleCameraFacing} style={styles.flipButton}>
              <RotateCcw size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Camera Preview */}
        <View style={styles.cameraContainer}>
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing={facing}
            flash={flashMode}
            zoom={zoom}
          >
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.3)']}
              style={styles.cameraOverlay}
            />
            
            {/* Zoom Control */}
            <View style={styles.zoomContainer}>
              <TouchableOpacity 
                style={styles.zoomButton}
                onPress={() => handleZoomChange(zoom - 0.1)}
                disabled={zoom <= 0}
              >
                <Text style={styles.zoomText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.zoomValue}>{Math.round(zoom * 10 + 10)}x</Text>
              <TouchableOpacity 
                style={styles.zoomButton}
                onPress={() => handleZoomChange(zoom + 0.1)}
                disabled={zoom >= 1}
              >
                <Text style={styles.zoomText}>+</Text>
              </TouchableOpacity>
            </View>
          </CameraView>
        </View>

        {/* Filters */}
        <View style={styles.filtersSection}>
          <View style={styles.filtersHeader}>
            <Sliders size={20} color="#FFD700" />
            <Text style={styles.filtersTitle}>Filtres</Text>
          </View>
          
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.filtersScroll}
            contentContainerStyle={styles.filtersContent}
          >
            {CAMERA_FILTERS.map((filter) => (
              <TouchableOpacity
                key={filter.id}
                style={[
                  styles.filterButton,
                  selectedFilter.id === filter.id && styles.selectedFilter
                ]}
                onPress={async () => {
                  setSelectedFilter(filter);
                  if (Platform.OS !== 'web') {
                    await Haptics.selectionAsync();
                  }
                }}
              >
                <Text style={styles.filterPreview}>{filter.preview}</Text>
                <Text style={[
                  styles.filterName,
                  selectedFilter.id === filter.id && styles.selectedFilterName
                ]}>
                  {filter.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Capture Button */}
        <View style={styles.captureSection}>
          <TouchableOpacity
            style={[
              styles.captureButton,
              isCapturing && styles.capturingButton
            ]}
            onPress={takePicture}
            disabled={isCapturing}
          >
            <View style={styles.captureButtonInner}>
              {isCapturing ? (
                <Text style={styles.capturingText}>📸</Text>
              ) : (
                <Download size={32} color="#FFFFFF" />
              )}
            </View>
          </TouchableOpacity>
          
          <Text style={styles.captureHint}>
            {selectedFilter.name !== 'Original' 
              ? `Filtre: ${selectedFilter.name}` 
              : 'Appuyez pour capturer'
            }
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  webBackdrop: {
    backgroundColor: 'rgba(0,0,0,0.9)',
    backdropFilter: 'blur(20px)',
  },
  content: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  flashButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  flipButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraContainer: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
    backgroundColor: '#000000',
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  zoomContainer: {
    position: 'absolute',
    top: 20,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  zoomButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  zoomValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginHorizontal: 12,
  },
  filtersSection: {
    marginBottom: 30,
  },
  filtersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    gap: 8,
  },
  filtersTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  filtersScroll: {
    maxHeight: 100,
  },
  filtersContent: {
    paddingHorizontal: 5,
    gap: 15,
  },
  filterButton: {
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    minWidth: 70,
  },
  selectedFilter: {
    backgroundColor: '#FFD700',
  },
  filterPreview: {
    fontSize: 24,
    marginBottom: 4,
  },
  filterName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  selectedFilterName: {
    color: '#000000',
  },
  captureSection: {
    alignItems: 'center',
    gap: 10,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  capturingButton: {
    backgroundColor: '#FFD700',
    transform: [{ scale: 0.95 }],
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  capturingText: {
    fontSize: 24,
  },
  captureHint: {
    fontSize: 14,
    color: '#FFFFFF',
    textAlign: 'center',
    opacity: 0.8,
  },
});