import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Image, Compass, Settings, Check, X } from 'lucide-react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import Colors from '@/constants/colors';
import * as Haptics from 'expo-haptics';

interface ImageCompressionProps {
  visible: boolean;
  imageUri: string;
  onClose: () => void;
  onCompress: (compressedUri: string) => void;
}

interface CompressionSettings {
  quality: number;
  maxWidth: number;
  format: 'jpeg' | 'png';
}

const COMPRESSION_PRESETS = {
  high: { quality: 0.9, maxWidth: 2048, format: 'jpeg' as const },
  medium: { quality: 0.7, maxWidth: 1920, format: 'jpeg' as const },
  low: { quality: 0.5, maxWidth: 1280, format: 'jpeg' as const },
  custom: { quality: 0.8, maxWidth: 1920, format: 'jpeg' as const },
};

export default function ImageCompression({ visible, imageUri, onClose, onCompress }: ImageCompressionProps) {
  const [selectedPreset, setSelectedPreset] = useState<keyof typeof COMPRESSION_PRESETS>('medium');
  const [customSettings, setCustomSettings] = useState<CompressionSettings>(COMPRESSION_PRESETS.custom);
  const [isCompressing, setIsCompressing] = useState<boolean>(false);
  const [originalSize, setOriginalSize] = useState<string>('');
  const [compressedSize, setCompressedSize] = useState<string>('');

  const handleHapticFeedback = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getImageSize = async (uri: string): Promise<number> => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      return blob.size;
    } catch (error) {
      console.error('Error getting image size:', error);
      return 0;
    }
  };

  const compressImage = useCallback(async () => {
    if (!imageUri) return;

    setIsCompressing(true);
    handleHapticFeedback();

    try {
      // Get original size
      const originalSizeBytes = await getImageSize(imageUri);
      setOriginalSize(formatFileSize(originalSizeBytes));

      const settings = selectedPreset === 'custom' ? customSettings : COMPRESSION_PRESETS[selectedPreset];
      
      const result = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ resize: { width: settings.maxWidth } }],
        {
          compress: settings.quality,
          format: settings.format === 'jpeg' ? ImageManipulator.SaveFormat.JPEG : ImageManipulator.SaveFormat.PNG,
        }
      );

      // Get compressed size
      const compressedSizeBytes = await getImageSize(result.uri);
      setCompressedSize(formatFileSize(compressedSizeBytes));

      const compressionRatio = ((originalSizeBytes - compressedSizeBytes) / originalSizeBytes * 100).toFixed(1);
      
      Alert.alert(
        'Compression terminée',
        `Taille réduite de ${compressionRatio}%\nOriginal: ${formatFileSize(originalSizeBytes)}\nCompressé: ${formatFileSize(compressedSizeBytes)}`,
        [
          { text: 'Annuler', style: 'cancel' },
          { 
            text: 'Utiliser', 
            onPress: () => {
              onCompress(result.uri);
              onClose();
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error compressing image:', error);
      Alert.alert('Erreur', 'Impossible de compresser l\'image');
    } finally {
      setIsCompressing(false);
    }
  }, [imageUri, selectedPreset, customSettings, onCompress, onClose, handleHapticFeedback]);

  const selectPreset = useCallback((preset: keyof typeof COMPRESSION_PRESETS) => {
    handleHapticFeedback();
    setSelectedPreset(preset);
  }, [handleHapticFeedback]);

  if (!visible) return null;

  const renderContent = () => (
    <View style={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Compression d'image</Text>
        <Pressable style={styles.closeButton} onPress={onClose}>
          <X color="#FFFFFF" size={24} />
        </Pressable>
      </View>

      <View style={styles.previewSection}>
        <Text style={styles.sectionTitle}>Aperçu</Text>
        <View style={styles.imagePreview}>
          <View style={styles.previewImageContainer}>
            <Text style={styles.previewText}>Image à compresser</Text>
          </View>
          <View style={styles.sizeInfo}>
            {originalSize && <Text style={styles.sizeText}>Original: {originalSize}</Text>}
            {compressedSize && <Text style={styles.sizeText}>Compressé: {compressedSize}</Text>}
          </View>
        </View>
      </View>

      <View style={styles.presetsSection}>
        <Text style={styles.sectionTitle}>Qualité de compression</Text>
        <View style={styles.presetButtons}>
          {Object.entries(COMPRESSION_PRESETS).map(([key, preset]) => (
            <Pressable
              key={key}
              style={[
                styles.presetButton,
                selectedPreset === key && styles.presetButtonSelected
              ]}
              onPress={() => selectPreset(key as keyof typeof COMPRESSION_PRESETS)}
            >
              <Text style={[
                styles.presetButtonText,
                selectedPreset === key && styles.presetButtonTextSelected
              ]}>
                {key === 'high' ? 'Haute' : 
                 key === 'medium' ? 'Moyenne' : 
                 key === 'low' ? 'Faible' : 'Personnalisée'}
              </Text>
              <Text style={[
                styles.presetDetails,
                selectedPreset === key && styles.presetDetailsSelected
              ]}>
                {preset.quality * 100}% • {preset.maxWidth}px • {preset.format.toUpperCase()}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {selectedPreset === 'custom' && (
        <View style={styles.customSection}>
          <Text style={styles.sectionTitle}>Paramètres personnalisés</Text>
          <View style={styles.customControls}>
            <Text style={styles.customLabel}>Qualité: {Math.round(customSettings.quality * 100)}%</Text>
            <Text style={styles.customLabel}>Largeur max: {customSettings.maxWidth}px</Text>
            <Text style={styles.customLabel}>Format: {customSettings.format.toUpperCase()}</Text>
          </View>
        </View>
      )}

      <View style={styles.actions}>
        <Pressable style={styles.cancelButton} onPress={onClose}>
          <Text style={styles.cancelButtonText}>Annuler</Text>
        </Pressable>
        
        <Pressable 
          style={[styles.compressButton, isCompressing && styles.compressButtonDisabled]} 
          onPress={compressImage}
          disabled={isCompressing}
        >
          {isCompressing ? (
            <Settings color="#000000" size={20} />
          ) : (
            <Compass color="#000000" size={20} />
          )}
          <Text style={styles.compressButtonText}>
            {isCompressing ? 'Compression...' : 'Compresser'}
          </Text>
        </Pressable>
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.infoTitle}>À propos de la compression</Text>
        <Text style={styles.infoText}>
          • La compression réduit la taille du fichier{"\n"}
          • Qualité élevée = fichier plus volumineux{"\n"}
          • JPEG recommandé pour les photos{"\n"}
          • PNG pour les images avec transparence
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.overlay}>
      {Platform.OS !== 'web' ? (
        <BlurView intensity={40} style={styles.container}>
          {renderContent()}
        </BlurView>
      ) : (
        <View style={[styles.container, styles.webContainer]}>
          {renderContent()}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  container: {
    width: '90%',
    maxWidth: 400,
    maxHeight: '85%',
    borderRadius: 20,
    overflow: 'hidden',
  },
  webContainer: {
    backgroundColor: 'rgba(0,0,0,0.9)',
    backdropFilter: 'blur(20px)',
  },
  content: {
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  previewSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  imagePreview: {
    alignItems: 'center',
    gap: 12,
  },
  previewImageContainer: {
    width: 120,
    height: 120,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewText: {
    color: '#A9AFBC',
    fontSize: 12,
    textAlign: 'center',
  },
  sizeInfo: {
    alignItems: 'center',
    gap: 4,
  },
  sizeText: {
    color: '#A9AFBC',
    fontSize: 12,
    fontWeight: '500',
  },
  presetsSection: {
    marginBottom: 20,
  },
  presetButtons: {
    gap: 8,
  },
  presetButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  presetButtonSelected: {
    backgroundColor: 'rgba(255,215,0,0.3)',
    borderColor: '#FFD700',
  },
  presetButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  presetButtonTextSelected: {
    color: '#FFD700',
  },
  presetDetails: {
    color: '#A9AFBC',
    fontSize: 12,
  },
  presetDetailsSelected: {
    color: '#FFD700',
  },
  customSection: {
    marginBottom: 20,
  },
  customControls: {
    gap: 8,
  },
  customLabel: {
    color: '#A9AFBC',
    fontSize: 14,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  compressButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFD700',
    paddingVertical: 16,
    borderRadius: 12,
  },
  compressButtonDisabled: {
    opacity: 0.6,
  },
  compressButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '700',
  },
  infoSection: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 16,
    borderRadius: 12,
  },
  infoTitle: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  infoText: {
    color: '#A9AFBC',
    fontSize: 12,
    lineHeight: 18,
  },
});