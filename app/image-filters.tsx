import React, { useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, Text, ScrollView, Pressable, Platform, Dimensions } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Download, Share2, RotateCcw, Palette, Sliders, Sun, Contrast, Zap } from 'lucide-react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useToast } from '@/providers/ToastProvider';
import { useAI } from '@/providers/AIProvider';
import Colors from '@/constants/colors';
import ProgressToast from '@/components/ProgressToast';

const { width: screenWidth } = Dimensions.get('window');

interface Filter {
  id: string;
  name: string;
  preview: string;
  intensity: number;
  style: 'vintage' | 'modern' | 'artistic' | 'natural';
}

interface Adjustment {
  id: string;
  name: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  value: number;
  min: number;
  max: number;
  step: number;
}

export default function ImageFiltersScreen() {
  const router = useRouter();
  const { photoId } = useLocalSearchParams<{ photoId: string }>();
  const { showError, showSuccess } = useToast();
  const { applyStyleTransfer, isProcessing, progress } = useAI();

  const [selectedFilter, setSelectedFilter] = useState<string>('');
  const [adjustments, setAdjustments] = useState<Adjustment[]>([
    { id: 'brightness', name: 'Luminosité', icon: Sun, value: 0, min: -100, max: 100, step: 1 },
    { id: 'contrast', name: 'Contraste', icon: Contrast, value: 0, min: -100, max: 100, step: 1 },
    { id: 'saturation', name: 'Saturation', icon: Palette, value: 0, min: -100, max: 100, step: 1 },
    { id: 'sharpness', name: 'Netteté', icon: Zap, value: 0, min: -100, max: 100, step: 1 },
  ]);

  const [activeTab, setActiveTab] = useState<'filters' | 'adjustments'>('filters');

  const filters = useMemo<Filter[]>(() => [
    { id: 'original', name: 'Original', preview: '📸', intensity: 0, style: 'natural' },
    { id: 'vintage', name: 'Vintage', preview: '📷', intensity: 80, style: 'vintage' },
    { id: 'bw', name: 'Noir & Blanc', preview: '⚫', intensity: 100, style: 'artistic' },
    { id: 'sepia', name: 'Sépia', preview: '🟤', intensity: 70, style: 'vintage' },
    { id: 'vivid', name: 'Éclatant', preview: '🌈', intensity: 90, style: 'modern' },
    { id: 'cool', name: 'Froid', preview: '❄️', intensity: 60, style: 'modern' },
    { id: 'warm', name: 'Chaud', preview: '🔥', intensity: 60, style: 'modern' },
    { id: 'dramatic', name: 'Dramatique', preview: '⚡', intensity: 85, style: 'artistic' },
    { id: 'soft', name: 'Doux', preview: '☁️', intensity: 50, style: 'natural' },
    { id: 'film', name: 'Pellicule', preview: '🎞️', intensity: 75, style: 'vintage' },
  ], []);

  const sampleImage = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=800&auto=format&fit=crop';

  const handleBack = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.back();
  }, [router]);

  const handleFilterSelect = useCallback(async (filterId: string) => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    setSelectedFilter(filterId);

    if (filterId !== 'original') {
      try {
        await applyStyleTransfer(sampleImage, filterId);
        showSuccess('Filtre appliqué', `Le filtre ${filters.find(f => f.id === filterId)?.name} a été appliqué`);
      } catch (error) {
        console.error('Filter application error:', error);
        showError('Erreur', 'Impossible d\'appliquer le filtre');
      }
    }
  }, [applyStyleTransfer, filters, showSuccess, showError]);

  const handleAdjustmentChange = useCallback((adjustmentId: string, value: number) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    setAdjustments(prev => 
      prev.map(adj => 
        adj.id === adjustmentId ? { ...adj, value } : adj
      )
    );
  }, []);

  const resetAdjustments = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    setAdjustments(prev => prev.map(adj => ({ ...adj, value: 0 })));
    setSelectedFilter('original');
    showSuccess('Réinitialisé', 'Tous les réglages ont été remis à zéro');
  }, [showSuccess]);

  const handleSave = useCallback(async () => {
    if (Platform.OS !== 'web') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    try {
      // Simulate saving the edited image
      await new Promise(resolve => setTimeout(resolve, 1500));
      showSuccess('Image sauvegardée', 'Votre image modifiée a été sauvegardée');
      router.back();
    } catch (error) {
      console.error('Save error:', error);
      showError('Erreur de sauvegarde', 'Impossible de sauvegarder l\'image');
    }
  }, [showSuccess, showError, router]);

  const handleShare = useCallback(async () => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    try {
      if (Platform.OS === 'web') {
        if (navigator.share) {
          await navigator.share({
            title: 'Image éditée - MemoryShare',
            text: 'Découvrez mon image éditée avec des filtres professionnels',
            url: sampleImage
          });
        } else {
          await navigator.clipboard.writeText(sampleImage);
          showSuccess('Lien copié', 'Le lien de l\'image a été copié');
        }
      } else {
        const Sharing = await import('expo-sharing');
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(sampleImage);
        }
      }
    } catch (error) {
      console.error('Share error:', error);
      showError('Erreur de partage', 'Impossible de partager l\'image');
    }
  }, [showSuccess, showError]);

  return (
    <View style={styles.container}>
      <LinearGradient 
        colors={['#000000', '#0B0B0D', '#131417']} 
        style={StyleSheet.absoluteFillObject} 
        start={{ x: 0, y: 0 }} 
        end={{ x: 1, y: 1 }} 
      />
      
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable 
            style={styles.backButton}
            onPress={handleBack}
            accessibilityLabel="Retour"
            accessibilityRole="button"
            testID="back-button"
          >
            <ArrowLeft size={24} color={Colors.palette.taupeDeep} />
          </Pressable>
          
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Filtres & Édition</Text>
            <Text style={styles.headerSubtitle}>
              Sublimez vos photos
            </Text>
          </View>
          
          <Pressable 
            style={styles.resetButton}
            onPress={resetAdjustments}
            accessibilityLabel="Réinitialiser"
            testID="reset-button"
          >
            <RotateCcw size={20} color={Colors.palette.accentGold} />
          </Pressable>
        </View>

        {/* Image Preview */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: sampleImage }}
            style={styles.previewImage}
            contentFit="cover"
          />
          {selectedFilter !== 'original' && (
            <View style={styles.filterOverlay}>
              <Text style={styles.filterName}>
                {filters.find(f => f.id === selectedFilter)?.name}
              </Text>
            </View>
          )}
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <Pressable 
            style={[styles.tab, activeTab === 'filters' && styles.tabActive]}
            onPress={() => setActiveTab('filters')}
            testID="filters-tab"
          >
            <Palette size={20} color={activeTab === 'filters' ? '#000000' : Colors.palette.taupe} />
            <Text style={[styles.tabText, activeTab === 'filters' && styles.tabTextActive]}>
              Filtres
            </Text>
          </Pressable>
          
          <Pressable 
            style={[styles.tab, activeTab === 'adjustments' && styles.tabActive]}
            onPress={() => setActiveTab('adjustments')}
            testID="adjustments-tab"
          >
            <Sliders size={20} color={activeTab === 'adjustments' ? '#000000' : Colors.palette.taupe} />
            <Text style={[styles.tabText, activeTab === 'adjustments' && styles.tabTextActive]}>
              Réglages
            </Text>
          </Pressable>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {activeTab === 'filters' ? (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filtersContainer}
            >
              {filters.map((filter) => (
                <Pressable
                  key={filter.id}
                  style={[styles.filterCard, selectedFilter === filter.id && styles.filterCardSelected]}
                  onPress={() => handleFilterSelect(filter.id)}
                  testID={`filter-${filter.id}`}
                >
                  <View style={styles.filterPreview}>
                    <Image
                      source={{ uri: sampleImage }}
                      style={styles.filterPreviewImage}
                      contentFit="cover"
                    />
                    <View style={styles.filterPreviewOverlay}>
                      <Text style={styles.filterPreviewEmoji}>{filter.preview}</Text>
                    </View>
                  </View>
                  <Text style={[styles.filterName, selectedFilter === filter.id && styles.filterNameSelected]}>
                    {filter.name}
                  </Text>
                  {filter.intensity > 0 && (
                    <View style={styles.intensityBar}>
                      <View 
                        style={[styles.intensityFill, { width: `${filter.intensity}%` }]} 
                      />
                    </View>
                  )}
                </Pressable>
              ))}
            </ScrollView>
          ) : (
            <ScrollView 
              style={styles.adjustmentsContainer}
              showsVerticalScrollIndicator={false}
            >
              {adjustments.map((adjustment) => {
                const IconComponent = adjustment.icon;
                return (
                  <View key={adjustment.id} style={styles.adjustmentItem}>
                    <View style={styles.adjustmentHeader}>
                      <View style={styles.adjustmentIcon}>
                        <IconComponent size={20} color={Colors.palette.accentGold} />
                      </View>
                      <Text style={styles.adjustmentName}>{adjustment.name}</Text>
                      <Text style={styles.adjustmentValue}>{adjustment.value}</Text>
                    </View>
                    
                    <View style={styles.sliderContainer}>
                      <View style={styles.slider}>
                        <View style={styles.sliderTrack} />
                        <View 
                          style={[
                            styles.sliderFill, 
                            { 
                              width: `${((adjustment.value - adjustment.min) / (adjustment.max - adjustment.min)) * 100}%` 
                            }
                          ]} 
                        />
                        <Pressable
                          style={[
                            styles.sliderThumb,
                            {
                              left: `${((adjustment.value - adjustment.min) / (adjustment.max - adjustment.min)) * 100}%`
                            }
                          ]}
                          onPressIn={() => {
                            if (Platform.OS !== 'web') {
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            }
                          }}
                        />
                      </View>
                      
                      <View style={styles.sliderLabels}>
                        <Text style={styles.sliderLabel}>{adjustment.min}</Text>
                        <Text style={styles.sliderLabel}>{adjustment.max}</Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <Pressable 
            style={styles.actionButton}
            onPress={handleShare}
            testID="share-button"
          >
            <Share2 size={20} color={Colors.palette.accentGold} />
            <Text style={styles.actionButtonText}>Partager</Text>
          </Pressable>
          
          <Pressable 
            style={[styles.actionButton, styles.saveButton]}
            onPress={handleSave}
            testID="save-button"
          >
            <LinearGradient
              colors={[Colors.palette.accentGold, '#E6B800']}
              style={styles.saveButtonGradient}
            >
              <Download size={20} color="#000000" />
              <Text style={styles.saveButtonText}>Sauvegarder</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </SafeAreaView>
      
      <ProgressToast 
        visible={isProcessing} 
        label="Application du filtre..." 
        progress={progress} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: Colors.palette.taupe,
    fontSize: 14,
    marginTop: 2,
  },
  resetButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,215,0,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageContainer: {
    height: screenWidth * 0.8,
    marginHorizontal: 20,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  filterOverlay: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  filterName: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  tabsContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  tabActive: {
    backgroundColor: Colors.palette.accentGold,
  },
  tabText: {
    color: Colors.palette.taupe,
    fontSize: 14,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#000000',
  },
  content: {
    flex: 1,
  },
  filtersContainer: {
    paddingHorizontal: 20,
    gap: 12,
  },
  filterCard: {
    alignItems: 'center',
    width: 80,
  },
  filterCardSelected: {
    transform: [{ scale: 1.05 }],
  },
  filterPreview: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 8,
  },
  filterPreviewImage: {
    width: '100%',
    height: '100%',
  },
  filterPreviewOverlay: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterPreviewEmoji: {
    fontSize: 10,
  },
  filterNameSelected: {
    color: Colors.palette.accentGold,
    fontWeight: '700',
  },
  intensityBar: {
    width: 40,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 1,
    marginTop: 4,
    overflow: 'hidden',
  },
  intensityFill: {
    height: '100%',
    backgroundColor: Colors.palette.accentGold,
  },
  adjustmentsContainer: {
    paddingHorizontal: 20,
  },
  adjustmentItem: {
    marginBottom: 24,
  },
  adjustmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  adjustmentIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,215,0,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adjustmentName: {
    flex: 1,
    color: Colors.palette.taupeDeep,
    fontSize: 16,
    fontWeight: '600',
  },
  adjustmentValue: {
    color: Colors.palette.accentGold,
    fontSize: 16,
    fontWeight: '700',
    minWidth: 40,
    textAlign: 'right',
  },
  sliderContainer: {
    paddingHorizontal: 12,
  },
  slider: {
    height: 40,
    justifyContent: 'center',
    position: 'relative',
  },
  sliderTrack: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
  },
  sliderFill: {
    position: 'absolute',
    height: 4,
    backgroundColor: Colors.palette.accentGold,
    borderRadius: 2,
  },
  sliderThumb: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    marginLeft: -10,
    marginTop: -8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  sliderLabel: {
    color: Colors.palette.taupe,
    fontSize: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    gap: 8,
  },
  actionButtonText: {
    color: Colors.palette.taupeDeep,
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  saveButtonGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  saveButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '700',
  },
});