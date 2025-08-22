import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  TextInput,
  Alert,
  Platform,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import {
  Play,
  Pause,
  Settings,
  Download,
  Share,
  Film,
  Music,
  Palette,
  Zap,
  Clock,
  Monitor,
  Sparkles,
  ChevronRight,
  X,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAppState } from '@/providers/AppStateProvider';
import { trpc } from '@/lib/trpc';
import Colors from '@/constants/colors';
import { useToast } from '@/providers/ToastProvider';

const { width: screenWidth } = Dimensions.get('window');

interface VideoSettings {
  duration: number;
  transition: 'fade' | 'slide' | 'zoom' | 'dissolve' | 'wipe' | 'push' | 'crossfade';
  music?: string;
  title?: string;
  subtitle?: string;
  aspectRatio: '16:9' | '9:16' | '1:1' | '4:3';
  quality: '720p' | '1080p' | '4K';
  fps: number;
  audioTrack?: string;
  effects?: string[];
  colorGrading: 'none' | 'warm' | 'cool' | 'vintage' | 'cinematic';
}

const DEFAULT_SETTINGS: VideoSettings = {
  duration: 30,
  transition: 'fade',
  aspectRatio: '16:9',
  quality: '1080p',
  fps: 30,
  colorGrading: 'none',
};

export default function VideoStudioScreen() {
  const { albums } = useAppState();
  const { showSuccess, showError } = useToast();
  
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [settings, setSettings] = useState<VideoSettings>(DEFAULT_SETTINGS);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationProgress, setGenerationProgress] = useState<number>(0);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [generatedVideo, setGeneratedVideo] = useState<any>(null);
  const [previewMode, setPreviewMode] = useState<boolean>(false);

  const generateVideoMutation = trpc.video.generate.useMutation({
    onSuccess: (result) => {
      console.log('Video generated successfully:', result);
      setGeneratedVideo(result);
      setIsGenerating(false);
      setGenerationProgress(0);
      setCurrentStep('');
      showSuccess('Vidéo créée', 'Votre mini-film a été généré avec succès!');
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    },
    onError: (error) => {
      console.error('Video generation failed:', error);
      setIsGenerating(false);
      setGenerationProgress(0);
      setCurrentStep('');
      showError('Erreur', 'Impossible de générer la vidéo. Veuillez réessayer.');
    },
  });

  const allPhotos = albums.flatMap(album => album.photos.map((photo, index) => ({
    id: typeof photo === 'string' ? `${album.id}_${index}` : (photo as any).id || `${album.id}_${index}`,
    uri: typeof photo === 'string' ? photo : (photo as any).uri || photo,
    albumName: album.name,
  })));

  const handlePhotoToggle = useCallback((photoUri: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedPhotos(prev => 
      prev.includes(photoUri)
        ? prev.filter(uri => uri !== photoUri)
        : [...prev, photoUri]
    );
  }, []);

  const handleGenerateVideo = useCallback(async () => {
    if (selectedPhotos.length < 2) {
      Alert.alert('Photos insuffisantes', 'Sélectionnez au moins 2 photos pour créer un mini-film.');
      return;
    }

    setIsGenerating(true);
    setGenerationProgress(0);
    setCurrentStep('Initialisation...');

    // Simulate progress updates
    const progressSteps = [
      'Téléchargement des photos...',
      'Analyse IA des scènes...',
      'Détection et suivi des visages...',
      'Recadrage automatique...',
      'Application des transitions...',
      'Étalonnage des couleurs...',
      'Synchronisation audio...',
      'Rendu multi-résolution...',
      'Optimisation qualité...',
      'Finalisation...',
    ];

    const progressInterval = setInterval(() => {
      setGenerationProgress(prev => {
        const newProgress = Math.min(prev + 0.1, 0.9);
        const stepIndex = Math.floor(newProgress * progressSteps.length);
        setCurrentStep(progressSteps[stepIndex] || 'Finalisation...');
        return newProgress;
      });
    }, 800);

    try {
      await generateVideoMutation.mutateAsync({
        photos: selectedPhotos,
        ...settings,
      });
    } finally {
      clearInterval(progressInterval);
    }
  }, [selectedPhotos, settings, generateVideoMutation]);

  const SettingsModal = () => (
    <Modal
      visible={showSettings}
      animationType="slide"
      transparent
      onRequestClose={() => setShowSettings(false)}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.settingsModal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Paramètres vidéo</Text>
            <Pressable onPress={() => setShowSettings(false)} style={styles.closeButton}>
              <X size={24} color={Colors.palette.taupeDeep} />
            </Pressable>
          </View>

          <ScrollView style={styles.settingsContent} showsVerticalScrollIndicator={false}>
            {/* Duration */}
            <View style={styles.settingSection}>
              <Text style={styles.settingLabel}>Durée (secondes)</Text>
              <View style={styles.durationControls}>
                {[15, 30, 60, 90].map(duration => (
                  <Pressable
                    key={duration}
                    style={[
                      styles.durationButton,
                      settings.duration === duration && styles.durationButtonActive
                    ]}
                    onPress={() => setSettings(prev => ({ ...prev, duration }))}
                  >
                    <Text style={[
                      styles.durationButtonText,
                      settings.duration === duration && styles.durationButtonTextActive
                    ]}>
                      {duration}s
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Quality */}
            <View style={styles.settingSection}>
              <Text style={styles.settingLabel}>Qualité</Text>
              <View style={styles.qualityControls}>
                {(['720p', '1080p', '4K'] as const).map(quality => (
                  <Pressable
                    key={quality}
                    style={[
                      styles.qualityButton,
                      settings.quality === quality && styles.qualityButtonActive
                    ]}
                    onPress={() => setSettings(prev => ({ ...prev, quality }))}
                  >
                    <Text style={[
                      styles.qualityButtonText,
                      settings.quality === quality && styles.qualityButtonTextActive
                    ]}>
                      {quality}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Aspect Ratio */}
            <View style={styles.settingSection}>
              <Text style={styles.settingLabel}>Format</Text>
              <View style={styles.aspectRatioControls}>
                {(['16:9', '9:16', '1:1', '4:3'] as const).map(ratio => (
                  <Pressable
                    key={ratio}
                    style={[
                      styles.aspectRatioButton,
                      settings.aspectRatio === ratio && styles.aspectRatioButtonActive
                    ]}
                    onPress={() => setSettings(prev => ({ ...prev, aspectRatio: ratio }))}
                  >
                    <Text style={[
                      styles.aspectRatioButtonText,
                      settings.aspectRatio === ratio && styles.aspectRatioButtonTextActive
                    ]}>
                      {ratio}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Transitions */}
            <View style={styles.settingSection}>
              <Text style={styles.settingLabel}>Transition</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.transitionControls}>
                  {(['fade', 'slide', 'zoom', 'dissolve', 'wipe', 'push', 'crossfade'] as const).map(transition => (
                    <Pressable
                      key={transition}
                      style={[
                        styles.transitionButton,
                        settings.transition === transition && styles.transitionButtonActive
                      ]}
                      onPress={() => setSettings(prev => ({ ...prev, transition }))}
                    >
                      <Text style={[
                        styles.transitionButtonText,
                        settings.transition === transition && styles.transitionButtonTextActive
                      ]}>
                        {transition}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Color Grading */}
            <View style={styles.settingSection}>
              <Text style={styles.settingLabel}>Étalonnage</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.colorGradingControls}>
                  {(['none', 'warm', 'cool', 'vintage', 'cinematic'] as const).map(grading => (
                    <Pressable
                      key={grading}
                      style={[
                        styles.colorGradingButton,
                        settings.colorGrading === grading && styles.colorGradingButtonActive
                      ]}
                      onPress={() => setSettings(prev => ({ ...prev, colorGrading: grading }))}
                    >
                      <Text style={[
                        styles.colorGradingButtonText,
                        settings.colorGrading === grading && styles.colorGradingButtonTextActive
                      ]}>
                        {grading === 'none' ? 'Aucun' : grading}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Title & Subtitle */}
            <View style={styles.settingSection}>
              <Text style={styles.settingLabel}>Titre (optionnel)</Text>
              <TextInput
                style={styles.textInput}
                value={settings.title || ''}
                onChangeText={(title) => setSettings(prev => ({ ...prev, title }))}
                placeholder="Titre de votre mini-film"
                placeholderTextColor={Colors.palette.taupe}
              />
            </View>

            <View style={styles.settingSection}>
              <Text style={styles.settingLabel}>Sous-titre (optionnel)</Text>
              <TextInput
                style={styles.textInput}
                value={settings.subtitle || ''}
                onChangeText={(subtitle) => setSettings(prev => ({ ...prev, subtitle }))}
                placeholder="Sous-titre"
                placeholderTextColor={Colors.palette.taupe}
              />
            </View>
          </ScrollView>

          <View style={styles.modalActions}>
            <Pressable
              style={styles.applyButton}
              onPress={() => setShowSettings(false)}
            >
              <Text style={styles.applyButtonText}>Appliquer</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Studio Vidéo',
          headerStyle: { backgroundColor: '#000000' },
          headerTintColor: '#FFFFFF',
          headerRight: () => (
            <Pressable onPress={() => setShowSettings(true)} style={styles.headerButton}>
              <Settings size={24} color="#FFFFFF" />
            </Pressable>
          ),
        }}
      />

      <LinearGradient
        colors={['#000000', '#0B0B0D', '#131417']}
        style={StyleSheet.absoluteFillObject}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Film size={20} color={Colors.palette.taupeDeep} />
            <Text style={styles.statLabel}>Photos</Text>
            <Text style={styles.statValue}>{selectedPhotos.length}</Text>
          </View>
          <View style={styles.statItem}>
            <Clock size={20} color={Colors.palette.taupeDeep} />
            <Text style={styles.statLabel}>Durée</Text>
            <Text style={styles.statValue}>{settings.duration}s</Text>
          </View>
          <View style={styles.statItem}>
            <Monitor size={20} color={Colors.palette.taupeDeep} />
            <Text style={styles.statLabel}>Qualité</Text>
            <Text style={styles.statValue}>{settings.quality}</Text>
          </View>
        </View>

        {/* Photo Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sélectionner les photos</Text>
          <Text style={styles.sectionSubtitle}>
            Choisissez au moins 2 photos pour créer votre mini-film
          </Text>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.photosGrid}>
              {allPhotos.map((photo) => {
                const isSelected = selectedPhotos.includes(photo.uri);
                return (
                  <Pressable
                    key={photo.id}
                    style={[
                      styles.photoItem,
                      isSelected && styles.photoItemSelected
                    ]}
                    onPress={() => handlePhotoToggle(photo.uri)}
                  >
                    <Image
                      source={{ uri: photo.uri }}
                      style={styles.photoImage}
                      contentFit="cover"
                    />
                    {isSelected && (
                      <View style={styles.photoSelectedOverlay}>
                        <View style={styles.photoSelectedBadge}>
                          <Text style={styles.photoSelectedNumber}>
                            {selectedPhotos.indexOf(photo.uri) + 1}
                          </Text>
                        </View>
                      </View>
                    )}
                    <Text style={styles.photoAlbumName} numberOfLines={1}>
                      {photo.albumName}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        </View>

        {/* Generation Progress */}
        {isGenerating && (
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Sparkles size={24} color="#FFD700" />
              <Text style={styles.progressTitle}>Génération en cours...</Text>
            </View>
            <Text style={styles.progressStep}>{currentStep}</Text>
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBar, { width: `${generationProgress * 100}%` }]} />
            </View>
            <Text style={styles.progressPercent}>
              {Math.round(generationProgress * 100)}%
            </Text>
          </View>
        )}

        {/* Generated Video Preview */}
        {generatedVideo && (
          <View style={styles.videoPreviewSection}>
            <Text style={styles.sectionTitle}>Votre mini-film</Text>
            <View style={styles.videoPreview}>
              <Image
                source={{ uri: generatedVideo.thumbnailUri }}
                style={styles.videoThumbnail}
                contentFit="cover"
              />
              <View style={styles.videoOverlay}>
                <Pressable style={styles.playButton}>
                  <Play size={32} color="#FFFFFF" fill="#FFFFFF" />
                </Pressable>
              </View>
              <View style={styles.videoInfo}>
                <Text style={styles.videoTitle}>
                  {settings.title || 'Mini-film'}
                </Text>
                <Text style={styles.videoDetails}>
                  {settings.duration}s • {settings.quality} • {selectedPhotos.length} photos
                </Text>
              </View>
            </View>
            
            <View style={styles.videoActions}>
              <Pressable style={styles.actionButton}>
                <Download size={20} color={Colors.palette.taupeDeep} />
                <Text style={styles.actionButtonText}>Télécharger</Text>
              </Pressable>
              <Pressable style={styles.actionButton}>
                <Share size={20} color={Colors.palette.taupeDeep} />
                <Text style={styles.actionButtonText}>Partager</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Generate Button */}
        {!isGenerating && !generatedVideo && (
          <View style={styles.generateSection}>
            <Pressable
              style={[
                styles.generateButton,
                selectedPhotos.length < 2 && styles.generateButtonDisabled
              ]}
              onPress={handleGenerateVideo}
              disabled={selectedPhotos.length < 2}
            >
              <LinearGradient
                colors={selectedPhotos.length >= 2 ? ['#FFD700', '#FFA500'] : ['#666', '#444']}
                style={styles.generateButtonGradient}
              >
                <Sparkles size={24} color="#000000" />
                <Text style={styles.generateButtonText}>Créer le mini-film</Text>
              </LinearGradient>
            </Pressable>
          </View>
        )}
      </ScrollView>

      <SettingsModal />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  headerButton: {
    padding: 8,
    marginRight: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  statItem: {
    alignItems: 'center',
    gap: 4,
  },
  statLabel: {
    color: Colors.palette.taupe,
    fontSize: 12,
    fontWeight: '600',
  },
  statValue: {
    color: Colors.palette.taupeDeep,
    fontSize: 18,
    fontWeight: '800',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    color: Colors.palette.taupeDeep,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
  },
  sectionSubtitle: {
    color: Colors.palette.taupe,
    fontSize: 14,
    marginBottom: 16,
  },
  photosGrid: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 4,
  },
  photoItem: {
    width: 120,
    alignItems: 'center',
  },
  photoItemSelected: {
    transform: [{ scale: 0.95 }],
  },
  photoImage: {
    width: 120,
    height: 120,
    borderRadius: 12,
    marginBottom: 8,
  },
  photoSelectedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 28,
    backgroundColor: 'rgba(255,215,0,0.3)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoSelectedBadge: {
    backgroundColor: '#FFD700',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoSelectedNumber: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '800',
  },
  photoAlbumName: {
    color: Colors.palette.taupe,
    fontSize: 12,
    textAlign: 'center',
  },
  progressSection: {
    backgroundColor: 'rgba(255,215,0,0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    alignItems: 'center',
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  progressTitle: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: '800',
  },
  progressStep: {
    color: Colors.palette.taupeDeep,
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  progressBarContainer: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
    marginBottom: 12,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#FFD700',
    borderRadius: 4,
  },
  progressPercent: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: '700',
  },
  videoPreviewSection: {
    marginBottom: 32,
  },
  videoPreview: {
    position: 'relative',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  videoThumbnail: {
    width: '100%',
    height: 200,
  },
  videoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 16,
  },
  videoTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  videoDetails: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
  },
  videoActions: {
    flexDirection: 'row',
    gap: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    padding: 16,
    borderRadius: 12,
  },
  actionButtonText: {
    color: Colors.palette.taupeDeep,
    fontSize: 14,
    fontWeight: '600',
  },
  generateSection: {
    marginBottom: 32,
  },
  generateButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  generateButtonDisabled: {
    opacity: 0.5,
  },
  generateButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 20,
  },
  generateButtonText: {
    color: '#000000',
    fontSize: 18,
    fontWeight: '800',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  settingsModal: {
    backgroundColor: '#0B0B0D',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  modalTitle: {
    color: Colors.palette.taupeDeep,
    fontSize: 20,
    fontWeight: '800',
  },
  closeButton: {
    padding: 8,
  },
  settingsContent: {
    flex: 1,
    padding: 20,
  },
  settingSection: {
    marginBottom: 24,
  },
  settingLabel: {
    color: Colors.palette.taupeDeep,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  durationControls: {
    flexDirection: 'row',
    gap: 12,
  },
  durationButton: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  durationButtonActive: {
    backgroundColor: 'rgba(255,215,0,0.2)',
  },
  durationButtonText: {
    color: Colors.palette.taupe,
    fontSize: 14,
    fontWeight: '600',
  },
  durationButtonTextActive: {
    color: '#FFD700',
  },
  qualityControls: {
    flexDirection: 'row',
    gap: 12,
  },
  qualityButton: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  qualityButtonActive: {
    backgroundColor: 'rgba(255,215,0,0.2)',
  },
  qualityButtonText: {
    color: Colors.palette.taupe,
    fontSize: 14,
    fontWeight: '600',
  },
  qualityButtonTextActive: {
    color: '#FFD700',
  },
  aspectRatioControls: {
    flexDirection: 'row',
    gap: 12,
  },
  aspectRatioButton: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  aspectRatioButtonActive: {
    backgroundColor: 'rgba(255,215,0,0.2)',
  },
  aspectRatioButtonText: {
    color: Colors.palette.taupe,
    fontSize: 14,
    fontWeight: '600',
  },
  aspectRatioButtonTextActive: {
    color: '#FFD700',
  },
  transitionControls: {
    flexDirection: 'row',
    gap: 12,
  },
  transitionButton: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  transitionButtonActive: {
    backgroundColor: 'rgba(255,215,0,0.2)',
  },
  transitionButtonText: {
    color: Colors.palette.taupe,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  transitionButtonTextActive: {
    color: '#FFD700',
  },
  colorGradingControls: {
    flexDirection: 'row',
    gap: 12,
  },
  colorGradingButton: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  colorGradingButtonActive: {
    backgroundColor: 'rgba(255,215,0,0.2)',
  },
  colorGradingButtonText: {
    color: Colors.palette.taupe,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  colorGradingButtonTextActive: {
    color: '#FFD700',
  },
  textInput: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 8,
    padding: 12,
    color: Colors.palette.taupeDeep,
    fontSize: 14,
  },
  modalActions: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  applyButton: {
    backgroundColor: '#FFD700',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '800',
  },
});