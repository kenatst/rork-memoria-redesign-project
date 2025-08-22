import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
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
  Brain,
  Sparkles,
  Users,
  MapPin,
  Calendar,
  Camera,
  Heart,
  Plus,
  RefreshCw,
  TrendingUp,
  Zap,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAppState } from '@/providers/AppStateProvider';
import { trpc } from '@/lib/trpc';
import Colors from '@/constants/colors';
import { useToast } from '@/providers/ToastProvider';

const { width: screenWidth } = Dimensions.get('window');

interface AISuggestion {
  id: string;
  title: string;
  description: string;
  criteria: 'people' | 'location' | 'events' | 'objects';
  cover: string;
  confidence: number;
  aiInsights: {
    [key: string]: any;
  };
  photos: string[];
  tags: string[];
}

export default function AISuggestionsScreen() {
  const { albums, createAlbum } = useAppState();
  const { showSuccess, showError } = useToast();
  
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisProgress, setAnalysisProgress] = useState<number>(0);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [selectedCriteria, setSelectedCriteria] = useState<'auto' | 'people' | 'location' | 'events' | 'time' | 'objects'>('auto');

  const suggestAlbumsMutation = trpc.ai.suggestAlbums.useMutation({
    onSuccess: (result) => {
      console.log('AI suggestions generated:', result);
      setSuggestions(result.suggestions as AISuggestion[]);
      setIsAnalyzing(false);
      setAnalysisProgress(0);
      setCurrentStep('');
      showSuccess('Suggestions générées', `${result.suggestions.length} suggestions d'albums créées par IA`);
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    },
    onError: (error) => {
      console.error('AI suggestions failed:', error);
      setIsAnalyzing(false);
      setAnalysisProgress(0);
      setCurrentStep('');
      showError('Erreur', 'Impossible de générer les suggestions. Veuillez réessayer.');
    },
  });

  const allPhotos = albums.flatMap(album => album.photos);

  const handleGenerateSuggestions = useCallback(async () => {
    if (allPhotos.length < 5) {
      Alert.alert('Photos insuffisantes', 'Vous avez besoin d&apos;au moins 5 photos pour générer des suggestions d&apos;albums.');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisProgress(0);
    setCurrentStep('Initialisation de l\'analyse IA...');

    // Simulate progress updates
    const progressSteps = [
      'Chargement des modèles de vision...',
      'Analyse du contenu des images...',
      'Détection des visages et objets...',
      'Extraction des métadonnées EXIF...',
      'Clustering du contenu similaire...',
      'Génération des suggestions intelligentes...',
    ];

    const progressInterval = setInterval(() => {
      setAnalysisProgress(prev => {
        const newProgress = Math.min(prev + 0.15, 0.9);
        const stepIndex = Math.floor(newProgress * progressSteps.length);
        setCurrentStep(progressSteps[stepIndex] || 'Finalisation...');
        return newProgress;
      });
    }, 600);

    try {
      await suggestAlbumsMutation.mutateAsync({
        photos: allPhotos.map(photo => typeof photo === 'string' ? photo : (photo as any).uri || photo),
        criteria: selectedCriteria,
        maxSuggestions: 5,
      });
    } finally {
      clearInterval(progressInterval);
    }
  }, [allPhotos, selectedCriteria, suggestAlbumsMutation]);

  const handleCreateAlbumFromSuggestion = useCallback(async (suggestion: AISuggestion) => {
    try {
      if (Platform.OS !== 'web') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      
      await createAlbum(suggestion.title);
      showSuccess('Album créé', `L&apos;album "${suggestion.title}" a été créé avec succès`);
      
      // Remove the suggestion from the list
      setSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
    } catch (error) {
      console.error('Error creating album from suggestion:', error);
      showError('Erreur', 'Impossible de créer l&apos;album. Veuillez réessayer.');
    }
  }, [createAlbum, showSuccess, showError]);

  const getCriteriaIcon = (criteria: string) => {
    switch (criteria) {
      case 'people': return Users;
      case 'location': return MapPin;
      case 'events': return Calendar;
      case 'objects': return Camera;
      default: return Sparkles;
    }
  };

  const getCriteriaColor = (criteria: string) => {
    switch (criteria) {
      case 'people': return '#4F46E5';
      case 'location': return '#059669';
      case 'events': return '#DC2626';
      case 'objects': return '#7C2D12';
      default: return '#FFD700';
    }
  };

  const formatConfidence = (confidence: number) => {
    return Math.round(confidence * 100);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Suggestions IA',
          headerStyle: { backgroundColor: '#000000' },
          headerTintColor: '#FFFFFF',
          headerRight: () => (
            <Pressable 
              onPress={handleGenerateSuggestions} 
              style={styles.headerButton}
              disabled={isAnalyzing}
            >
              {isAnalyzing ? (
                <ActivityIndicator size="small" color="#FFD700" />
              ) : (
                <RefreshCw size={24} color="#FFFFFF" />
              )}
            </Pressable>
          ),
        }}
      />

      <LinearGradient
        colors={['#000000', '#0B0B0D', '#131417']}
        style={StyleSheet.absoluteFillObject}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Brain size={32} color="#FFD700" />
          </View>
          <Text style={styles.headerTitle}>Intelligence Artificielle</Text>
          <Text style={styles.headerSubtitle}>
            Laissez l'IA organiser vos photos en albums intelligents
          </Text>
        </View>

        {/* Criteria Selection */}
        <View style={styles.criteriaSection}>
          <Text style={styles.sectionTitle}>Critère d'analyse</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.criteriaRow}>
              {([
                { key: 'auto', label: 'Automatique', icon: Zap },
                { key: 'people', label: 'Personnes', icon: Users },
                { key: 'location', label: 'Lieux', icon: MapPin },
                { key: 'events', label: 'Événements', icon: Calendar },
                { key: 'objects', label: 'Objets', icon: Camera },
              ] as const).map(({ key, label, icon: Icon }) => (
                <Pressable
                  key={key}
                  style={[
                    styles.criteriaButton,
                    selectedCriteria === key && styles.criteriaButtonActive
                  ]}
                  onPress={() => {
                    if (Platform.OS !== 'web') {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                    setSelectedCriteria(key);
                  }}
                >
                  <Icon 
                    size={20} 
                    color={selectedCriteria === key ? '#000000' : Colors.palette.taupe} 
                  />
                  <Text style={[
                    styles.criteriaButtonText,
                    selectedCriteria === key && styles.criteriaButtonTextActive
                  ]}>
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Analysis Progress */}
        {isAnalyzing && (
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Brain size={24} color="#FFD700" />
              <Text style={styles.progressTitle}>Analyse IA en cours...</Text>
            </View>
            <Text style={styles.progressStep}>{currentStep}</Text>
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBar, { width: `${analysisProgress * 100}%` }]} />
            </View>
            <Text style={styles.progressPercent}>
              {Math.round(analysisProgress * 100)}%
            </Text>
          </View>
        )}

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <View style={styles.suggestionsSection}>
            <View style={styles.suggestionsHeader}>
              <Text style={styles.sectionTitle}>Suggestions d'albums</Text>
              <View style={styles.suggestionsCount}>
                <TrendingUp size={16} color="#FFD700" />
                <Text style={styles.suggestionsCountText}>{suggestions.length}</Text>
              </View>
            </View>

            {suggestions.map((suggestion, index) => {
              const CriteriaIcon = getCriteriaIcon(suggestion.criteria);
              const criteriaColor = getCriteriaColor(suggestion.criteria);
              
              return (
                <View key={suggestion.id} style={styles.suggestionCard}>
                  <LinearGradient
                    colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)']}
                    style={styles.suggestionGradient}
                  >
                    {/* Header */}
                    <View style={styles.suggestionHeader}>
                      <View style={styles.suggestionTitleRow}>
                        <View style={[styles.suggestionIcon, { backgroundColor: `${criteriaColor}20` }]}>
                          <CriteriaIcon size={20} color={criteriaColor} />
                        </View>
                        <View style={styles.suggestionTitleContainer}>
                          <Text style={styles.suggestionTitle}>{suggestion.title}</Text>
                          <Text style={styles.suggestionDescription}>{suggestion.description}</Text>
                        </View>
                        <View style={styles.confidenceContainer}>
                          <Text style={styles.confidenceLabel}>Confiance</Text>
                          <Text style={styles.confidenceValue}>
                            {formatConfidence(suggestion.confidence)}%
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Photos Preview */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View style={styles.photosPreview}>
                        {suggestion.photos.slice(0, 6).map((photo, photoIndex) => (
                          <Image
                            key={photoIndex}
                            source={{ uri: photo }}
                            style={styles.previewPhoto}
                            contentFit="cover"
                          />
                        ))}
                        {suggestion.photos.length > 6 && (
                          <View style={styles.morePhotos}>
                            <Text style={styles.morePhotosText}>
                              +{suggestion.photos.length - 6}
                            </Text>
                          </View>
                        )}
                      </View>
                    </ScrollView>

                    {/* AI Insights */}
                    <View style={styles.insightsContainer}>
                      <Text style={styles.insightsTitle}>Insights IA</Text>
                      <View style={styles.tagsContainer}>
                        {suggestion.tags.map((tag, tagIndex) => (
                          <View key={tagIndex} style={styles.tag}>
                            <Text style={styles.tagText}>{tag}</Text>
                          </View>
                        ))}
                      </View>
                      
                      {/* Specific insights based on criteria */}
                      {suggestion.criteria === 'people' && suggestion.aiInsights.facesDetected && (
                        <Text style={styles.insightDetail}>
                          👥 {suggestion.aiInsights.facesDetected} visages détectés
                        </Text>
                      )}
                      {suggestion.criteria === 'location' && suggestion.aiInsights.locations && (
                        <Text style={styles.insightDetail}>
                          📍 Lieux: {suggestion.aiInsights.locations.join(', ')}
                        </Text>
                      )}
                      {suggestion.criteria === 'events' && suggestion.aiInsights.eventTypes && (
                        <Text style={styles.insightDetail}>
                          🎉 Types: {suggestion.aiInsights.eventTypes.join(', ')}
                        </Text>
                      )}
                    </View>

                    {/* Actions */}
                    <View style={styles.suggestionActions}>
                      <Pressable
                        style={styles.createButton}
                        onPress={() => handleCreateAlbumFromSuggestion(suggestion)}
                      >
                        <LinearGradient
                          colors={['#FFD700', '#FFA500']}
                          style={styles.createButtonGradient}
                        >
                          <Plus size={20} color="#000000" />
                          <Text style={styles.createButtonText}>Créer l'album</Text>
                        </LinearGradient>
                      </Pressable>
                      
                      <Pressable style={styles.previewButton}>
                        <Heart size={20} color={Colors.palette.taupeDeep} />
                        <Text style={styles.previewButtonText}>Aperçu</Text>
                      </Pressable>
                    </View>
                  </LinearGradient>
                </View>
              );
            })}
          </View>
        )}

        {/* Empty State */}
        {!isAnalyzing && suggestions.length === 0 && (
          <View style={styles.emptyState}>
            <Brain size={64} color={Colors.palette.taupe} />
            <Text style={styles.emptyStateTitle}>Aucune suggestion</Text>
            <Text style={styles.emptyStateSubtitle}>
              Appuyez sur le bouton d&apos;actualisation pour générer des suggestions d&apos;albums intelligentes
            </Text>
            <Pressable style={styles.generateButton} onPress={handleGenerateSuggestions}>
              <LinearGradient
                colors={['#FFD700', '#FFA500']}
                style={styles.generateButtonGradient}
              >
                <Sparkles size={24} color="#000000" />
                <Text style={styles.generateButtonText}>Générer des suggestions</Text>
              </LinearGradient>
            </Pressable>
          </View>
        )}

        {/* Stats */}
        {allPhotos.length > 0 && (
          <View style={styles.statsSection}>
            <Text style={styles.statsTitle}>Statistiques</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Camera size={24} color={Colors.palette.taupeDeep} />
                <Text style={styles.statValue}>{allPhotos.length}</Text>
                <Text style={styles.statLabel}>Photos</Text>
              </View>
              <View style={styles.statItem}>
                <Brain size={24} color={Colors.palette.taupeDeep} />
                <Text style={styles.statValue}>{suggestions.length}</Text>
                <Text style={styles.statLabel}>Suggestions</Text>
              </View>
              <View style={styles.statItem}>
                <TrendingUp size={24} color={Colors.palette.taupeDeep} />
                <Text style={styles.statValue}>
                  {suggestions.length > 0 ? formatConfidence(suggestions.reduce((sum, s) => sum + s.confidence, 0) / suggestions.length) : 0}%
                </Text>
                <Text style={styles.statLabel}>Confiance</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
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
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  headerIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,215,0,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    color: Colors.palette.taupeDeep,
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 8,
  },
  headerSubtitle: {
    color: Colors.palette.taupe,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  criteriaSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    color: Colors.palette.taupeDeep,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  criteriaRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 4,
  },
  criteriaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  criteriaButtonActive: {
    backgroundColor: '#FFD700',
  },
  criteriaButtonText: {
    color: Colors.palette.taupe,
    fontSize: 14,
    fontWeight: '600',
  },
  criteriaButtonTextActive: {
    color: '#000000',
  },
  progressSection: {
    backgroundColor: 'rgba(255,215,0,0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
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
  suggestionsSection: {
    marginBottom: 32,
  },
  suggestionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  suggestionsCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,215,0,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  suggestionsCountText: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '700',
  },
  suggestionCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  suggestionGradient: {
    padding: 20,
  },
  suggestionHeader: {
    marginBottom: 16,
  },
  suggestionTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  suggestionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionTitleContainer: {
    flex: 1,
  },
  suggestionTitle: {
    color: Colors.palette.taupeDeep,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  suggestionDescription: {
    color: Colors.palette.taupe,
    fontSize: 14,
    lineHeight: 20,
  },
  confidenceContainer: {
    alignItems: 'center',
  },
  confidenceLabel: {
    color: Colors.palette.taupe,
    fontSize: 12,
    marginBottom: 2,
  },
  confidenceValue: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: '800',
  },
  photosPreview: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  previewPhoto: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  morePhotos: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  morePhotosText: {
    color: Colors.palette.taupeDeep,
    fontSize: 12,
    fontWeight: '700',
  },
  insightsContainer: {
    marginBottom: 16,
  },
  insightsTitle: {
    color: Colors.palette.taupeDeep,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  tag: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tagText: {
    color: Colors.palette.taupe,
    fontSize: 12,
    fontWeight: '500',
  },
  insightDetail: {
    color: Colors.palette.taupe,
    fontSize: 12,
    marginTop: 4,
  },
  suggestionActions: {
    flexDirection: 'row',
    gap: 12,
  },
  createButton: {
    flex: 2,
    borderRadius: 12,
    overflow: 'hidden',
  },
  createButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
  },
  createButtonText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '700',
  },
  previewButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    padding: 12,
    borderRadius: 12,
  },
  previewButtonText: {
    color: Colors.palette.taupeDeep,
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    color: Colors.palette.taupeDeep,
    fontSize: 20,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    color: Colors.palette.taupe,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  generateButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  generateButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  generateButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '800',
  },
  statsSection: {
    marginBottom: 32,
  },
  statsTitle: {
    color: Colors.palette.taupeDeep,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    padding: 20,
  },
  statItem: {
    alignItems: 'center',
    gap: 8,
  },
  statValue: {
    color: Colors.palette.taupeDeep,
    fontSize: 20,
    fontWeight: '800',
  },
  statLabel: {
    color: Colors.palette.taupe,
    fontSize: 12,
    fontWeight: '600',
  },
});