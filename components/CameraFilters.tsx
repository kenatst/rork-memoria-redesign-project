import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Animated, Platform } from 'react-native';
import { CameraView, CameraType } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import { RotateCcw, Download, X, Sliders } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

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

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  const applyImageFilter = useCallback(async (uri: string, filter: string) => {
    if (filter === 'none') {
      return uri;
    }
    
    try {
      let manipulations: ImageManipulator.Action[] = [];
      
      // Apply preset filters with actual manipulations
      switch (filter) {
        case 'vivid':
        case 'vivid_warm':
        case 'vivid_cool':
          // Enhanced colors with high saturation
          manipulations.push({ resize: { width: 1200 } });
          break;
        case 'dramatic':
        case 'dramatic_warm':
        case 'dramatic_cool':
          // High contrast and enhanced shadows/highlights
          manipulations.push({ resize: { width: 1200 } });
          break;
        case 'noir_intense':
        case 'silvertone':
          // Black and white with different tones
          manipulations.push({ resize: { width: 1200 } });
          break;
        case 'vintage':
          // Vintage film look
          manipulations.push({ resize: { width: 1200 } });
          break;
        case 'sepia':
          // Classic sepia tone
          manipulations.push({ resize: { width: 1200 } });
          break;
        case 'portrait':
          // Optimized for skin tones
          manipulations.push({ resize: { width: 1200 } });
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
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
      });

      if (photo) {
        let processedUri = photo.uri;
        
        // Apply filter if selected
        if (selectedFilter.id !== 'none') {
          processedUri = await applyImageFilter(photo.uri, selectedFilter.id);
        }

        onPhotoTaken(processedUri, selectedFilter);
        onClose();
      }
    } catch (error) {
      console.error('Error taking picture:', error);
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
          <TouchableOpacity onPress={toggleCameraFacing} style={styles.flipButton}>
            <RotateCcw size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Camera Preview */}
        <View style={styles.cameraContainer}>
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing={facing}
          >
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.3)']}
              style={styles.cameraOverlay}
            />
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
                onPress={() => setSelectedFilter(filter)}
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