import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Platform, ScrollView } from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { Image as ImageIcon, Play } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { useAppState, Album } from '@/providers/AppStateProvider';

interface AlbumExportProps {
  album: Album;
  isVisible: boolean;
  onClose: () => void;
}

export type ExportFormat = 'photos' | 'slideshow';

interface ExportOption {
  id: ExportFormat;
  title: string;
  description: string;
  icon: any;
  color: string;
  available: boolean;
}

const EXPORT_OPTIONS: ExportOption[] = [
  {
    id: 'photos',
    title: 'App Photos',
    description: 'Sauvegarder dans la galerie',
    icon: ImageIcon,
    color: '#34C759',
    available: Platform.OS !== 'web',
  },
  {
    id: 'slideshow',
    title: 'Mini‑film',
    description: 'Aperçu et partage en vidéo',
    icon: Play,
    color: '#FF9500',
    available: true,
  },
];

export function AlbumExport({ album, isVisible, onClose }: AlbumExportProps) {
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<number>(0);
  const { exportAlbum } = useAppState();

  const requestPermissions = async () => {
    if (Platform.OS === 'web') return true;
    
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission requise',
        'Nous avons besoin d\'accéder à votre galerie pour sauvegarder les photos.'
      );
      return false;
    }
    return true;
  };

  const exportToPhotos = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Non disponible', 'Cette fonctionnalité n\'est pas disponible sur le web.');
      return;
    }

    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    setIsExporting(true);
    setExportProgress(0);

    try {
      let savedCount = 0;
      const totalPhotos = album.photos.length;

      for (let i = 0; i < totalPhotos; i++) {
        const photoUri = album.photos[i];
        
        try {
          // Create asset from URI
          const asset = await MediaLibrary.createAssetAsync(photoUri);
          
          // Try to add to an album named after our album
          try {
            let mediaAlbum = await MediaLibrary.getAlbumAsync(album.name);
            if (!mediaAlbum) {
              mediaAlbum = await MediaLibrary.createAlbumAsync(album.name, asset, false);
            } else {
              await MediaLibrary.addAssetsToAlbumAsync([asset], mediaAlbum, false);
            }
          } catch (albumError) {
            console.log('Could not create/add to album, but photo was saved:', albumError);
          }
          
          savedCount++;
        } catch (error) {
          console.error(`Failed to save photo ${i + 1}:`, error);
        }

        setExportProgress((i + 1) / totalPhotos);
      }

      Alert.alert(
        'Export terminé',
        `${savedCount} sur ${totalPhotos} photos ont été sauvegardées dans votre galerie.`,
        [{ text: 'OK', onPress: onClose }]
      );

    } catch (error) {
      console.error('Export to photos failed:', error);
      Alert.alert('Erreur', 'Impossible d\'exporter vers la galerie.');
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  /* removed: zip export */
  const exportAsZip = async () => {
    setIsExporting(true);
    setExportProgress(0);

    try {
      // Simulate zip creation process
      for (let i = 0; i <= 100; i += 10) {
        setExportProgress(i / 100);
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Use the existing export function
      await exportAlbum(album.id);

      if (Platform.OS !== 'web' && await Sharing.isAvailableAsync()) {
        // In a real implementation, you would have the actual zip file path
        const zipPath = `${FileSystem.documentDirectory}${album.name}.zip`;
        
        // Create a mock zip file for demo
        await FileSystem.writeAsStringAsync(
          zipPath,
          `Album: ${album.name}\nPhotos: ${album.photos.length}\nExported: ${new Date().toISOString()}`
        );

        await Sharing.shareAsync(zipPath, {
          mimeType: 'application/zip',
          dialogTitle: `Partager ${album.name}`,
        });
      } else {
        Alert.alert(
          'Export terminé',
          'L\'archive ZIP a été créée avec succès.',
          [{ text: 'OK', onPress: onClose }]
        );
      }

    } catch (error) {
      console.error('ZIP export failed:', error);
      Alert.alert('Erreur', 'Impossible de créer l\'archive ZIP.');
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  /* removed: pdf export */
  const exportAsPDF = async () => {
    setIsExporting(true);
    setExportProgress(0);

    try {
      // Simulate PDF creation process
      for (let i = 0; i <= 100; i += 5) {
        setExportProgress(i / 100);
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      Alert.alert(
        'PDF créé',
        `L\'album "${album.name}" a été converti en PDF avec ${album.photos.length} photos.`,
        [
          { text: 'Partager', onPress: () => sharePDF() },
          { text: 'OK', onPress: onClose }
        ]
      );

    } catch (error) {
      console.error('PDF export failed:', error);
      Alert.alert('Erreur', 'Impossible de créer le PDF.');
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  // Mini‑film (slideshow) generation preview/share
  const exportAsSlideshow = async () => {
    setIsExporting(true);
    setExportProgress(0);

    try {
      // Simulate slideshow creation process
      for (let i = 0; i <= 100; i += 2) {
        setExportProgress(i / 100);
        await new Promise(resolve => setTimeout(resolve, 30));
      }

      Alert.alert(
        'Mini‑film prêt',
        `Le mini‑film de "${album.name}" est prêt avec ${album.photos.length} photos.`,
        [
          { text: 'Partager', onPress: () => shareSlideshow() },
          { text: 'OK', onPress: onClose }
        ]
      );

    } catch (error) {
      console.error('Slideshow export failed:', error);
      Alert.alert('Erreur', 'Impossible de créer le diaporama.');
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  /* removed: pdf share */
  const sharePDF = async () => {
    if (Platform.OS !== 'web' && await Sharing.isAvailableAsync()) {
      const pdfPath = `${FileSystem.documentDirectory}${album.name}.pdf`;
      
      // Create a mock PDF file for demo
      await FileSystem.writeAsStringAsync(
        pdfPath,
        `PDF Album: ${album.name}\nPages: ${album.photos.length}\nCreated: ${new Date().toISOString()}`
      );

      await Sharing.shareAsync(pdfPath, {
        mimeType: 'application/pdf',
        dialogTitle: `Partager l'album ${album.name}`,
      });
    }
  };

  const shareSlideshow = async () => {
    if (Platform.OS !== 'web' && await Sharing.isAvailableAsync()) {
      const videoPath = `${FileSystem.documentDirectory}${album.name}_slideshow.mp4`;
      
      // Create a mock video file for demo
      await FileSystem.writeAsStringAsync(
        videoPath,
        `Video Slideshow: ${album.name}\nFrames: ${album.photos.length}\nDuration: ${album.photos.length * 3}s\nCreated: ${new Date().toISOString()}`
      );

      await Sharing.shareAsync(videoPath, {
        mimeType: 'video/mp4',
        dialogTitle: `Partager le diaporama ${album.name}`,
      });
    }
  };

  const handleExport = async (format: ExportFormat) => {
    if (isExporting) return;

    switch (format) {
      case 'photos':
        await exportToPhotos();
        break;

      case 'slideshow':
        await exportAsSlideshow();
        break;
    }
  };

  if (!isVisible) return null;

  return (
    <View style={styles.container}>
      {Platform.OS !== 'web' ? (
        <BlurView intensity={95} style={styles.backdrop} />
      ) : (
        <View style={[styles.backdrop, styles.webBackdrop]} />
      )}

      <View style={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Exporter l&apos;album</Text>
            <Text style={styles.subtitle}>
              {album.name} • {album.photos.length} photos
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        {isExporting && (
          <View style={styles.progressContainer}>
            <Text style={styles.progressText}>
              Export en cours... {Math.round(exportProgress * 100)}%
            </Text>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${exportProgress * 100}%` }
                ]} 
              />
            </View>
          </View>
        )}

        <ScrollView style={styles.optionsList} showsVerticalScrollIndicator={false}>
          {EXPORT_OPTIONS.filter(option => option.available).map((option) => {
            const Icon = option.icon;
            
            return (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.optionCard,
                  isExporting && styles.optionCardDisabled
                ]}
                onPress={() => handleExport(option.id)}
                disabled={isExporting}
              >
                <View style={[styles.optionIcon, { backgroundColor: option.color }]}>
                  <Icon size={24} color="#FFFFFF" />
                </View>
                
                <View style={styles.optionContent}>
                  <Text style={styles.optionTitle}>{option.title}</Text>
                  <Text style={styles.optionDescription}>{option.description}</Text>
                </View>

                <View style={styles.optionArrow}>
                  <Text style={styles.arrowText}>{'›'}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Les exports sont sauvegardés localement et peuvent être partagés.
          </Text>
        </View>
      </View>
    </View>
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
    alignItems: 'flex-start',
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#8E8E93',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  progressContainer: {
    marginBottom: 30,
    padding: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
  },
  progressText: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 2,
  },
  optionsList: {
    flex: 1,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    marginBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    gap: 16,
  },
  optionCardDisabled: {
    opacity: 0.5,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    color: '#8E8E93',
  },
  optionArrow: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowText: {
    fontSize: 20,
    color: '#8E8E93',
    fontWeight: '300',
  },
  footer: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  footerText: {
    fontSize: 12,
    color: '#6D6D70',
    textAlign: 'center',
    lineHeight: 16,
  },
});