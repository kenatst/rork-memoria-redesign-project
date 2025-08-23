import React, { useState } from 'react';
import { View, StyleSheet, Text, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Cloud, Upload, Download, Image as ImageIcon } from 'lucide-react-native';
import Colors from '@/constants/colors';
import ImagePickerComponent from '@/components/ImagePicker';
import { CloudinaryUploadResult } from '@/lib/cloudinary';

export default function CloudinaryTestScreen() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [uploadResults, setUploadResults] = useState<CloudinaryUploadResult[]>([]);


  const handleImageSelected = (uri: string) => {
    console.log('📸 [CloudinaryTest] Image selected:', uri);
    setSelectedImage(uri);
  };

  const handleCloudUpload = (result: CloudinaryUploadResult) => {
    console.log('☁️ [CloudinaryTest] Cloud upload successful:', result);
    setUploadResults(prev => [result, ...prev]);
    
    Alert.alert(
      '✅ Upload réussi !',
      `Image uploadée vers Cloudinary avec succès !\n\nURL: ${result.secure_url}\nTaille: ${Math.round(result.bytes / 1024)} KB\nFormat: ${result.format}`,
      [{ text: 'OK' }]
    );
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
  };

  const clearUploadHistory = () => {
    setUploadResults([]);
    Alert.alert('Historique effacé', 'L&apos;historique des uploads a été effacé.');
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#000000', '#1a1a1a']} style={StyleSheet.absoluteFillObject} />
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Cloud color={Colors.palette.accentGold} size={32} />
          </View>
          <Text style={styles.title}>Test Cloudinary</Text>
          <Text style={styles.subtitle}>
            Testez l&apos;upload automatique vers Cloudinary avec compression
          </Text>
        </View>

        {/* Image Picker Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📸 Sélection d&apos;image</Text>
          <Text style={styles.sectionDescription}>
            Sélectionnez une image pour tester l&apos;upload automatique vers Cloudinary
          </Text>
          
          <View style={styles.imagePickerContainer}>
            <ImagePickerComponent
              currentImage={selectedImage || undefined}
              onImageSelected={handleImageSelected}
              onRemove={handleRemoveImage}
              size={200}
              placeholder="Sélectionner une image"
              enableCloudUpload={true}
              onCloudUpload={handleCloudUpload}
              compressionEnabled={true}
              cloudinaryFolder="memoria/test"
            />
          </View>
        </View>

        {/* Upload Results Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>☁️ Historique des uploads</Text>
            {uploadResults.length > 0 && (
              <Text 
                style={styles.clearButton} 
                onPress={clearUploadHistory}
              >
                Effacer
              </Text>
            )}
          </View>
          
          {uploadResults.length === 0 ? (
            <View style={styles.emptyState}>
              <Upload color={Colors.palette.taupe} size={48} />
              <Text style={styles.emptyStateText}>
                Aucun upload pour le moment
              </Text>
              <Text style={styles.emptyStateSubtext}>
                Sélectionnez une image ci-dessus pour commencer
              </Text>
            </View>
          ) : (
            <View style={styles.uploadsList}>
              {uploadResults.map((result, index) => (
                <View key={index} style={styles.uploadItem}>
                  <View style={styles.uploadItemHeader}>
                    <View style={styles.uploadItemIcon}>
                      <ImageIcon color={Colors.palette.accentGold} size={20} />
                    </View>
                    <View style={styles.uploadItemInfo}>
                      <Text style={styles.uploadItemTitle}>
                        Upload #{uploadResults.length - index}
                      </Text>
                      <Text style={styles.uploadItemDate}>
                        {new Date(result.created_at).toLocaleString('fr-FR')}
                      </Text>
                    </View>
                    <View style={styles.uploadItemBadge}>
                      <Text style={styles.uploadItemBadgeText}>
                        {result.format.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.uploadItemDetails}>
                    <View style={styles.uploadItemDetail}>
                      <Text style={styles.uploadItemDetailLabel}>URL:</Text>
                      <Text style={styles.uploadItemDetailValue} numberOfLines={1}>
                        {result.secure_url}
                      </Text>
                    </View>
                    
                    <View style={styles.uploadItemDetail}>
                      <Text style={styles.uploadItemDetailLabel}>Taille:</Text>
                      <Text style={styles.uploadItemDetailValue}>
                        {Math.round(result.bytes / 1024)} KB
                      </Text>
                    </View>
                    
                    <View style={styles.uploadItemDetail}>
                      <Text style={styles.uploadItemDetailLabel}>Dimensions:</Text>
                      <Text style={styles.uploadItemDetailValue}>
                        {result.width} × {result.height}
                      </Text>
                    </View>
                    
                    <View style={styles.uploadItemDetail}>
                      <Text style={styles.uploadItemDetailLabel}>Public ID:</Text>
                      <Text style={styles.uploadItemDetailValue} numberOfLines={1}>
                        {result.public_id}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Instructions Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ℹ️ Instructions</Text>
          <View style={styles.instructionsList}>
            <View style={styles.instructionItem}>
              <Text style={styles.instructionNumber}>1</Text>
              <Text style={styles.instructionText}>
                Appuyez sur le sélecteur d&apos;image ci-dessus
              </Text>
            </View>
            <View style={styles.instructionItem}>
              <Text style={styles.instructionNumber}>2</Text>
              <Text style={styles.instructionText}>
                Choisissez une image depuis votre galerie ou prenez une photo
              </Text>
            </View>
            <View style={styles.instructionItem}>
              <Text style={styles.instructionNumber}>3</Text>
              <Text style={styles.instructionText}>
                L&apos;image sera automatiquement compressée et uploadée vers Cloudinary
              </Text>
            </View>
            <View style={styles.instructionItem}>
              <Text style={styles.instructionNumber}>4</Text>
              <Text style={styles.instructionText}>
                Consultez les détails de l&apos;upload dans l&apos;historique ci-dessus
              </Text>
            </View>
          </View>
        </View>

        {/* Features Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>✨ Fonctionnalités testées</Text>
          <View style={styles.featuresList}>
            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Cloud color={Colors.palette.accentGold} size={16} />
              </View>
              <Text style={styles.featureText}>Upload automatique vers Cloudinary</Text>
            </View>
            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Download color={Colors.palette.accentGold} size={16} />
              </View>
              <Text style={styles.featureText}>Compression automatique des images</Text>
            </View>
            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <ImageIcon color={Colors.palette.accentGold} size={16} />
              </View>
              <Text style={styles.featureText}>Optimisation format et qualité</Text>
            </View>
            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Upload color={Colors.palette.accentGold} size={16} />
              </View>
              <Text style={styles.featureText}>URLs sécurisées et CDN intégré</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    color: Colors.palette.taupe,
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  sectionDescription: {
    color: Colors.palette.taupe,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  clearButton: {
    color: Colors.palette.accentGold,
    fontSize: 14,
    fontWeight: '600',
  },
  imagePickerContainer: {
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  emptyStateText: {
    color: Colors.palette.taupe,
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 4,
  },
  emptyStateSubtext: {
    color: Colors.palette.taupeDeep,
    fontSize: 14,
    textAlign: 'center',
  },
  uploadsList: {
    gap: 12,
  },
  uploadItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  uploadItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  uploadItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  uploadItemInfo: {
    flex: 1,
  },
  uploadItemTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  uploadItemDate: {
    color: Colors.palette.taupe,
    fontSize: 12,
  },
  uploadItemBadge: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  uploadItemBadgeText: {
    color: Colors.palette.accentGold,
    fontSize: 10,
    fontWeight: '700',
  },
  uploadItemDetails: {
    gap: 8,
  },
  uploadItemDetail: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  uploadItemDetailLabel: {
    color: Colors.palette.taupe,
    fontSize: 12,
    fontWeight: '600',
    width: 80,
  },
  uploadItemDetailValue: {
    color: '#FFFFFF',
    fontSize: 12,
    flex: 1,
  },
  instructionsList: {
    gap: 16,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  instructionNumber: {
    color: Colors.palette.accentGold,
    fontSize: 16,
    fontWeight: '700',
    width: 24,
    height: 24,
    textAlign: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: 12,
    lineHeight: 24,
    marginRight: 12,
  },
  instructionText: {
    color: Colors.palette.taupe,
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  featuresList: {
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  featureText: {
    color: Colors.palette.taupe,
    fontSize: 14,
    flex: 1,
  },
});