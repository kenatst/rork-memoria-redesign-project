import React, { useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, Text, ScrollView, Pressable, Platform, Switch, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Download, FileText, Image as ImageIcon, Video, Archive, Cloud, Mail, Share2, Settings } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useToast } from '@/providers/ToastProvider';
import { useAppState } from '@/providers/AppStateProvider';
import Colors from '@/constants/colors';
import ProgressToast from '@/components/ProgressToast';

interface ExportFormat {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  fileExtension: string;
  estimatedSize: string;
  features: string[];
}

interface ExportOptions {
  includeMetadata: boolean;
  includeLocation: boolean;
  compressImages: boolean;
  includeVideos: boolean;
  createAlbumStructure: boolean;
  exportFormat: string;
  quality: 'original' | 'high' | 'medium' | 'low';
}

export default function ExportAdvancedScreen() {
  const router = useRouter();
  const { showError, showSuccess } = useToast();
  const { albums, photos } = useAppState();

  const [options, setOptions] = useState<ExportOptions>({
    includeMetadata: true,
    includeLocation: true,
    compressImages: false,
    includeVideos: true,
    createAlbumStructure: true,
    exportFormat: 'zip',
    quality: 'high'
  });

  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<number>(0);

  const exportFormats = useMemo<ExportFormat[]>(() => [
    {
      id: 'zip',
      name: 'Archive ZIP',
      description: 'Fichier compressé avec structure de dossiers',
      icon: Archive,
      fileExtension: '.zip',
      estimatedSize: '2.4 GB',
      features: ['Structure préservée', 'Métadonnées incluses', 'Compatible partout']
    },
    {
      id: 'pdf',
      name: 'Album PDF',
      description: 'Livre photo au format PDF',
      icon: FileText,
      fileExtension: '.pdf',
      estimatedSize: '156 MB',
      features: ['Mise en page automatique', 'Haute qualité', 'Facile à partager']
    },
    {
      id: 'json',
      name: 'Données JSON',
      description: 'Export des métadonnées et liens',
      icon: Settings,
      fileExtension: '.json',
      estimatedSize: '2.1 MB',
      features: ['Métadonnées complètes', 'Structure de données', 'Développeurs']
    },
    {
      id: 'cloud',
      name: 'Sauvegarde Cloud',
      description: 'Export vers service cloud',
      icon: Cloud,
      fileExtension: '',
      estimatedSize: '2.4 GB',
      features: ['Synchronisation', 'Accès partout', 'Sauvegarde sécurisée']
    }
  ], []);

  const handleBack = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.back();
  }, [router]);

  const updateOption = useCallback((key: keyof ExportOptions, value: any) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    setOptions(prev => ({ ...prev, [key]: value }));
  }, []);

  const calculateEstimatedSize = useCallback((): string => {
    const baseSize = photos.length * 3.2; // MB per photo average
    const videoSize = options.includeVideos ? photos.length * 0.3 * 25 : 0; // 30% are videos, 25MB each
    
    let totalSize = baseSize + videoSize;
    
    if (options.compressImages) {
      totalSize *= 0.6; // 40% compression
    }
    
    if (options.quality === 'medium') {
      totalSize *= 0.4;
    } else if (options.quality === 'low') {
      totalSize *= 0.2;
    }
    
    if (totalSize > 1000) {
      return `${(totalSize / 1000).toFixed(1)} GB`;
    }
    return `${Math.round(totalSize)} MB`;
  }, [photos.length, options]);

  const startExport = useCallback(async () => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    const selectedFormat = exportFormats.find(f => f.id === options.exportFormat);
    
    Alert.alert(
      'Confirmer l\'export',
      `Exporter ${photos.length} photos et ${albums.length} albums au format ${selectedFormat?.name}?\n\nTaille estimée: ${calculateEstimatedSize()}`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Exporter',
          onPress: async () => {
            setIsExporting(true);
            setExportProgress(0);

            try {
              // Simulate export process
              const steps = 100;
              for (let i = 0; i <= steps; i++) {
                await new Promise(resolve => setTimeout(resolve, 50));
                setExportProgress(i / steps);
              }

              // Simulate file creation and download
              if (Platform.OS === 'web') {
                // Web download simulation
                const blob = new Blob(['Export data'], { type: 'application/octet-stream' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `memoryshare-export${selectedFormat?.fileExtension || '.zip'}`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              } else {
                // Native sharing
                const { Sharing } = await import('expo-sharing');
                if (await Sharing.isAvailableAsync()) {
                  // In a real app, this would be the actual file path
                  await Sharing.shareAsync('file://path/to/export.zip');
                }
              }

              showSuccess(
                'Export terminé',
                `Vos données ont été exportées au format ${selectedFormat?.name}`
              );
            } catch (error) {
              console.error('Export error:', error);
              showError('Erreur d\'export', 'Impossible de créer l\'export');
            } finally {
              setIsExporting(false);
              setExportProgress(0);
            }
          }
        }
      ]
    );
  }, [options, exportFormats, photos.length, albums.length, calculateEstimatedSize, showSuccess, showError]);

  const handleEmailExport = useCallback(async () => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    try {
      if (Platform.OS === 'web') {
        const subject = encodeURIComponent('Export MemoryShare');
        const body = encodeURIComponent(`Voici l'export de mes souvenirs MemoryShare.\n\n${photos.length} photos et ${albums.length} albums inclus.`);
        window.open(`mailto:?subject=${subject}&body=${body}`);
      } else {
        const { MailComposer } = await import('expo-mail-composer');
        const isAvailable = await MailComposer.isAvailableAsync();
        
        if (isAvailable) {
          await MailComposer.composeAsync({
            subject: 'Export MemoryShare',
            body: `Voici l'export de mes souvenirs MemoryShare.\n\n${photos.length} photos et ${albums.length} albums inclus.`,
            isHtml: false,
          });
        } else {
          showError('Email non disponible', 'L\'application mail n\'est pas configurée');
        }
      }
    } catch (error) {
      console.error('Email export error:', error);
      showError('Erreur email', 'Impossible d\'ouvrir l\'application mail');
    }
  }, [photos.length, albums.length, showError]);

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
            <Text style={styles.headerTitle}>Export Avancé</Text>
            <Text style={styles.headerSubtitle}>
              Exportez vos données en toute sécurité
            </Text>
          </View>
          
          <View style={styles.headerIcon}>
            <Download size={24} color={Colors.palette.accentGold} />
          </View>
        </View>

        <ScrollView 
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Export Summary */}
          <View style={styles.summaryCard}>
            <LinearGradient
              colors={['rgba(255,215,0,0.1)', 'rgba(255,215,0,0.05)']}
              style={styles.summaryCardGradient}
            >
              <Text style={styles.summaryTitle}>Contenu à exporter</Text>
              <View style={styles.summaryStats}>
                <View style={styles.summaryItem}>
                  <ImageIcon size={20} color={Colors.palette.accentGold} />
                  <Text style={styles.summaryValue}>{photos.length}</Text>
                  <Text style={styles.summaryLabel}>Photos</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Video size={20} color={Colors.palette.accentGold} />
                  <Text style={styles.summaryValue}>{Math.floor(photos.length * 0.3)}</Text>
                  <Text style={styles.summaryLabel}>Vidéos</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Archive size={20} color={Colors.palette.accentGold} />
                  <Text style={styles.summaryValue}>{albums.length}</Text>
                  <Text style={styles.summaryLabel}>Albums</Text>
                </View>
              </View>
              <Text style={styles.estimatedSize}>
                Taille estimée: {calculateEstimatedSize()}
              </Text>
            </LinearGradient>
          </View>

          {/* Export Formats */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Format d'export</Text>
            
            <View style={styles.formatsGrid}>
              {exportFormats.map((format) => {
                const IconComponent = format.icon;
                const isSelected = options.exportFormat === format.id;
                
                return (
                  <Pressable
                    key={format.id}
                    style={[styles.formatCard, isSelected && styles.formatCardSelected]}
                    onPress={() => updateOption('exportFormat', format.id)}
                    testID={`format-${format.id}`}
                  >
                    <LinearGradient
                      colors={isSelected 
                        ? ['rgba(255,215,0,0.2)', 'rgba(255,215,0,0.1)']
                        : ['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.02)']
                      }
                      style={styles.formatCardGradient}
                    >
                      <View style={styles.formatHeader}>
                        <View style={[styles.formatIcon, isSelected && styles.formatIconSelected]}>
                          <IconComponent size={24} color={isSelected ? '#000000' : Colors.palette.accentGold} />
                        </View>
                        <Text style={[styles.formatName, isSelected && styles.formatNameSelected]}>
                          {format.name}
                        </Text>
                      </View>
                      
                      <Text style={styles.formatDescription}>
                        {format.description}
                      </Text>
                      
                      <Text style={styles.formatSize}>
                        {format.estimatedSize}
                      </Text>
                      
                      <View style={styles.formatFeatures}>
                        {format.features.map((feature, index) => (
                          <Text key={index} style={styles.formatFeature}>
                            • {feature}
                          </Text>
                        ))}
                      </View>
                    </LinearGradient>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Export Options */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Options d'export</Text>
            
            <View style={styles.optionsCard}>
              <LinearGradient
                colors={['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.02)']}
                style={styles.optionsCardGradient}
              >
                {/* Quality */}
                <View style={styles.optionItem}>
                  <View style={styles.optionInfo}>
                    <Text style={styles.optionTitle}>Qualité</Text>
                    <Text style={styles.optionDescription}>
                      {options.quality === 'original' ? 'Originale (meilleure qualité)' :
                       options.quality === 'high' ? 'Haute (recommandé)' :
                       options.quality === 'medium' ? 'Moyenne (équilibré)' : 'Basse (plus petit)'}
                    </Text>
                  </View>
                  <Pressable 
                    style={styles.optionButton}
                    onPress={() => {
                      const qualities: ExportOptions['quality'][] = ['original', 'high', 'medium', 'low'];
                      const currentIndex = qualities.indexOf(options.quality);
                      const nextQuality = qualities[(currentIndex + 1) % qualities.length];
                      updateOption('quality', nextQuality);
                    }}
                    testID="quality-option"
                  >
                    <Settings size={16} color={Colors.palette.accentGold} />
                  </Pressable>
                </View>

                {/* Include Metadata */}
                <View style={styles.optionItem}>
                  <View style={styles.optionInfo}>
                    <Text style={styles.optionTitle}>Inclure les métadonnées</Text>
                    <Text style={styles.optionDescription}>
                      Date, heure, paramètres appareil photo
                    </Text>
                  </View>
                  <Switch
                    value={options.includeMetadata}
                    onValueChange={(value) => updateOption('includeMetadata', value)}
                    trackColor={{ false: '#767577', true: Colors.palette.accentGold }}
                    thumbColor={options.includeMetadata ? '#FFFFFF' : '#f4f3f4'}
                    testID="metadata-switch"
                  />
                </View>

                {/* Include Location */}
                <View style={styles.optionItem}>
                  <View style={styles.optionInfo}>
                    <Text style={styles.optionTitle}>Inclure la géolocalisation</Text>
                    <Text style={styles.optionDescription}>
                      Coordonnées GPS des photos
                    </Text>
                  </View>
                  <Switch
                    value={options.includeLocation}
                    onValueChange={(value) => updateOption('includeLocation', value)}
                    trackColor={{ false: '#767577', true: Colors.palette.accentGold }}
                    thumbColor={options.includeLocation ? '#FFFFFF' : '#f4f3f4'}
                    testID="location-switch"
                  />
                </View>

                {/* Include Videos */}
                <View style={styles.optionItem}>
                  <View style={styles.optionInfo}>
                    <Text style={styles.optionTitle}>Inclure les vidéos</Text>
                    <Text style={styles.optionDescription}>
                      Exporter aussi les fichiers vidéo
                    </Text>
                  </View>
                  <Switch
                    value={options.includeVideos}
                    onValueChange={(value) => updateOption('includeVideos', value)}
                    trackColor={{ false: '#767577', true: Colors.palette.accentGold }}
                    thumbColor={options.includeVideos ? '#FFFFFF' : '#f4f3f4'}
                    testID="videos-switch"
                  />
                </View>

                {/* Create Album Structure */}
                <View style={styles.optionItem}>
                  <View style={styles.optionInfo}>
                    <Text style={styles.optionTitle}>Structure d'albums</Text>
                    <Text style={styles.optionDescription}>
                      Organiser en dossiers par album
                    </Text>
                  </View>
                  <Switch
                    value={options.createAlbumStructure}
                    onValueChange={(value) => updateOption('createAlbumStructure', value)}
                    trackColor={{ false: '#767577', true: Colors.palette.accentGold }}
                    thumbColor={options.createAlbumStructure ? '#FFFFFF' : '#f4f3f4'}
                    testID="structure-switch"
                  />
                </View>

                {/* Compress Images */}
                <View style={styles.optionItem}>
                  <View style={styles.optionInfo}>
                    <Text style={styles.optionTitle}>Compresser les images</Text>
                    <Text style={styles.optionDescription}>
                      Réduire la taille des fichiers (40% plus petit)
                    </Text>
                  </View>
                  <Switch
                    value={options.compressImages}
                    onValueChange={(value) => updateOption('compressImages', value)}
                    trackColor={{ false: '#767577', true: Colors.palette.accentGold }}
                    thumbColor={options.compressImages ? '#FFFFFF' : '#f4f3f4'}
                    testID="compress-switch"
                  />
                </View>
              </LinearGradient>
            </View>
          </View>

          {/* Quick Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Actions rapides</Text>
            
            <View style={styles.quickActions}>
              <Pressable 
                style={styles.quickActionCard}
                onPress={handleEmailExport}
                testID="email-export"
              >
                <View style={styles.quickActionIcon}>
                  <Mail size={20} color={Colors.palette.accentGold} />
                </View>
                <Text style={styles.quickActionText}>Envoyer par email</Text>
              </Pressable>
              
              <Pressable 
                style={styles.quickActionCard}
                onPress={() => updateOption('exportFormat', 'cloud')}
                testID="cloud-export"
              >
                <View style={styles.quickActionIcon}>
                  <Cloud size={20} color={Colors.palette.accentGold} />
                </View>
                <Text style={styles.quickActionText}>Vers le cloud</Text>
              </Pressable>
              
              <Pressable 
                style={styles.quickActionCard}
                testID="share-export"
              >
                <View style={styles.quickActionIcon}>
                  <Share2 size={20} color={Colors.palette.accentGold} />
                </View>
                <Text style={styles.quickActionText}>Partager</Text>
              </Pressable>
            </View>
          </View>

          {/* Export Button */}
          <Pressable 
            style={[styles.exportButton, isExporting && styles.exportButtonDisabled]}
            onPress={startExport}
            disabled={isExporting}
            testID="export-button"
          >
            <LinearGradient
              colors={isExporting 
                ? ['rgba(255,215,0,0.3)', 'rgba(255,215,0,0.1)']
                : [Colors.palette.accentGold, '#E6B800']
              }
              style={styles.exportButtonGradient}
            >
              <Download size={20} color={isExporting ? Colors.palette.taupe : '#000000'} />
              <Text style={[styles.exportButtonText, isExporting && styles.exportButtonTextDisabled]}>
                {isExporting ? 'Export en cours...' : 'Démarrer l\'export'}
              </Text>
            </LinearGradient>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
      
      <ProgressToast 
        visible={isExporting} 
        label="Export en cours..." 
        progress={exportProgress} 
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
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,215,0,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  summaryCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
  },
  summaryCardGradient: {
    padding: 20,
  },
  summaryTitle: {
    color: Colors.palette.taupeDeep,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  summaryItem: {
    alignItems: 'center',
    gap: 8,
  },
  summaryValue: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
  summaryLabel: {
    color: Colors.palette.taupe,
    fontSize: 12,
  },
  estimatedSize: {
    color: Colors.palette.accentGold,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: Colors.palette.taupeDeep,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  formatsGrid: {
    gap: 12,
  },
  formatCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  formatCardSelected: {
    borderWidth: 2,
    borderColor: Colors.palette.accentGold,
  },
  formatCardGradient: {
    padding: 16,
  },
  formatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 12,
  },
  formatIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,215,0,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  formatIconSelected: {
    backgroundColor: Colors.palette.accentGold,
  },
  formatName: {
    color: Colors.palette.taupeDeep,
    fontSize: 16,
    fontWeight: '700',
  },
  formatNameSelected: {
    color: Colors.palette.accentGold,
  },
  formatDescription: {
    color: Colors.palette.taupe,
    fontSize: 14,
    marginBottom: 8,
  },
  formatSize: {
    color: Colors.palette.accentGold,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  formatFeatures: {
    gap: 2,
  },
  formatFeature: {
    color: Colors.palette.taupe,
    fontSize: 11,
  },
  optionsCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  optionsCardGradient: {
    padding: 16,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  optionInfo: {
    flex: 1,
    marginRight: 16,
  },
  optionTitle: {
    color: Colors.palette.taupeDeep,
    fontSize: 16,
    fontWeight: '600',
  },
  optionDescription: {
    color: Colors.palette.taupe,
    fontSize: 12,
    marginTop: 2,
  },
  optionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,215,0,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
  },
  quickActionCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  quickActionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,215,0,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickActionText: {
    color: Colors.palette.taupeDeep,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  exportButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 16,
  },
  exportButtonDisabled: {
    opacity: 0.6,
  },
  exportButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 12,
  },
  exportButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '700',
  },
  exportButtonTextDisabled: {
    color: Colors.palette.taupe,
  },
});