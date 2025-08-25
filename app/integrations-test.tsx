import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, ScrollView, Alert, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  Brain, 
  MapPin, 
  Shield, 
  Camera, 
  Zap,
  CheckCircle,
  XCircle,
  Loader
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import ImagePickerComponent from '@/components/ImagePicker';

// Import des intégrations
import { analyzeImage } from '@/lib/google-vision';
import { getCurrentLocation, reverseGeocode, findNearbyPlaces } from '@/lib/google-maps';
import { authenticateWithGoogle, isAuthenticated, getCurrentUser, AuthUser } from '@/lib/auth';
// Convex supprimé: importations retirées
import { uploadToCloudinary } from '@/lib/cloudinary';

interface TestResult {
  name: string;
  status: 'idle' | 'loading' | 'success' | 'error';
  data?: any;
  error?: string;
}

export default function IntegrationsTestScreen() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<TestResult[]>([
    { name: 'Cloudinary Upload', status: 'idle' },
    { name: 'Google Vision Analysis', status: 'idle' },
    { name: 'Google Maps Location', status: 'idle' },
    { name: 'Auth0 Authentication', status: 'idle' },
  ]);
  
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [realtimeData, setRealtimeData] = useState<null>(null);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const authenticated = await isAuthenticated();
      if (authenticated) {
        const user = await getCurrentUser();
        setCurrentUser(user);
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
    }
  };

  const updateTestResult = (name: string, status: TestResult['status'], data?: any, error?: string) => {
    setTestResults(prev => prev.map(result => 
      result.name === name ? { ...result, status, data, error } : result
    ));
  };

  const handleImageSelected = (uri: string) => {
    console.log('📸 [IntegrationsTest] Image selected:', uri);
    setSelectedImage(uri);
  };

  const testCloudinaryUpload = async () => {
    if (!selectedImage) {
      Alert.alert('Erreur', 'Veuillez sélectionner une image d\'abord');
      return;
    }

    updateTestResult('Cloudinary Upload', 'loading');
    
    try {
      const result = await uploadToCloudinary(selectedImage, {
        folder: 'memoria/test',
        tags: ['integration-test']
      });
      
      updateTestResult('Cloudinary Upload', 'success', {
        url: result.secure_url,
        size: Math.round(result.bytes / 1024) + ' KB',
        format: result.format
      });
      
      Alert.alert('✅ Cloudinary', 'Upload réussi !');
    } catch (error) {
      updateTestResult('Cloudinary Upload', 'error', null, error instanceof Error ? error.message : 'Unknown error');
      Alert.alert('❌ Cloudinary', 'Erreur lors de l\'upload');
    }
  };

  const testGoogleVision = async () => {
    if (!selectedImage) {
      Alert.alert('Erreur', 'Veuillez sélectionner une image d\'abord');
      return;
    }

    updateTestResult('Google Vision Analysis', 'loading');
    
    try {
      const result = await analyzeImage(selectedImage);
      
      updateTestResult('Google Vision Analysis', 'success', {
        faces: result.faces.length,
        labels: result.labels.slice(0, 5).map(l => l.description),
        texts: result.texts.length,
        objects: result.objects.length
      });
      
      Alert.alert('✅ Google Vision', `Analyse terminée !\n\nVisages: ${result.faces.length}\nLabels: ${result.labels.length}\nTextes: ${result.texts.length}`);
    } catch (error) {
      updateTestResult('Google Vision Analysis', 'error', null, error instanceof Error ? error.message : 'Unknown error');
      Alert.alert('❌ Google Vision', 'Erreur lors de l\'analyse');
    }
  };

  const testGoogleMaps = async () => {
    updateTestResult('Google Maps Location', 'loading');
    
    try {
      const location = await getCurrentLocation();
      const geocode = await reverseGeocode(location);
      const nearbyPlaces = await findNearbyPlaces(location, 1000, 'restaurant');
      
      updateTestResult('Google Maps Location', 'success', {
        coordinates: `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`,
        address: geocode.city + ', ' + geocode.country,
        nearbyPlaces: nearbyPlaces.length
      });
      
      Alert.alert('✅ Google Maps', `Localisation obtenue !\n\n${geocode.formattedAddress}\n\nRestaurants à proximité: ${nearbyPlaces.length}`);
    } catch (error) {
      updateTestResult('Google Maps Location', 'error', null, error instanceof Error ? error.message : 'Unknown error');
      Alert.alert('❌ Google Maps', 'Erreur lors de la géolocalisation');
    }
  };

  const testAuth0 = async () => {
    updateTestResult('Auth0 Authentication', 'loading');
    
    try {
      const user = await authenticateWithGoogle();
      setCurrentUser(user);
      
      updateTestResult('Auth0 Authentication', 'success', {
        name: user.name,
        email: user.email,
        provider: user.provider
      });
      
      Alert.alert('✅ Auth0', `Authentification réussie !\n\nBonjour ${user.name} !`);
    } catch (error) {
      updateTestResult('Auth0 Authentication', 'error', null, error instanceof Error ? error.message : 'Unknown error');
      Alert.alert('❌ Auth0', 'Erreur lors de l\'authentification');
    }
  };

  // Convex supprimé: test de base de données retiré

  const runAllTests = async () => {
    if (!selectedImage) {
      Alert.alert('Erreur', 'Veuillez sélectionner une image d\'abord');
      return;
    }

    Alert.alert(
      'Tests complets',
      'Lancer tous les tests d\'intégration ? Cela peut prendre quelques minutes.',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Lancer', 
          onPress: async () => {
            await testCloudinaryUpload();
            await new Promise(resolve => setTimeout(resolve, 1000));
            await testGoogleVision();
            await new Promise(resolve => setTimeout(resolve, 1000));
            await testGoogleMaps();
            await new Promise(resolve => setTimeout(resolve, 1000));
            if (!currentUser) {
              await testAuth0();
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
        }
      ]
    );
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'loading':
        return <Loader color={Colors.palette.accentGold} size={20} />;
      case 'success':
        return <CheckCircle color="#4CAF50" size={20} />;
      case 'error':
        return <XCircle color="#F44336" size={20} />;
      default:
        return <View style={styles.idleIcon} />;
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'loading':
        return Colors.palette.accentGold;
      case 'success':
        return '#4CAF50';
      case 'error':
        return '#F44336';
      default:
        return Colors.palette.taupe;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#000000', '#1a1a1a']} style={StyleSheet.absoluteFillObject} />
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Zap color={Colors.palette.accentGold} size={32} />
          </View>
          <Text style={styles.title}>Tests d&apos;Intégrations</Text>
          <Text style={styles.subtitle}>
            Testez toutes les intégrations de Memoria
          </Text>
        </View>

        {/* Current User */}
        {currentUser && (
          <View style={styles.userCard}>
            <View style={styles.userInfo}>
              {currentUser.picture && (
                <Image source={{ uri: currentUser.picture }} style={styles.userAvatar} />
              )}
              <View style={styles.userDetails}>
                <Text style={styles.userName}>{currentUser.name}</Text>
                <Text style={styles.userEmail}>{currentUser.email}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Image Picker */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📸 Image de test</Text>
          <Text style={styles.sectionDescription}>
            Sélectionnez une image pour tester les intégrations
          </Text>
          
          <View style={styles.imagePickerContainer}>
            <ImagePickerComponent
              currentImage={selectedImage || undefined}
              onImageSelected={handleImageSelected}
              onRemove={() => setSelectedImage(null)}
              size={150}
              placeholder="Sélectionner"
            />
          </View>
        </View>

        {/* Test Results */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🧪 Résultats des tests</Text>
            <TouchableOpacity 
              style={styles.runAllButton}
              onPress={runAllTests}
            >
              <Text style={styles.runAllButtonText}>Tout tester</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.testsList}>
            {testResults.map((result, index) => (
              <View key={index} style={styles.testItem}>
                <View style={styles.testItemHeader}>
                  <View style={styles.testItemIcon}>
                    {getStatusIcon(result.status)}
                  </View>
                  <View style={styles.testItemInfo}>
                    <Text style={styles.testItemTitle}>{result.name}</Text>
                    <Text style={[styles.testItemStatus, { color: getStatusColor(result.status) }]}>
                      {result.status === 'idle' ? 'En attente' :
                       result.status === 'loading' ? 'En cours...' :
                       result.status === 'success' ? 'Réussi' : 'Échec'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.testButton}
                    onPress={() => {
                      switch (result.name) {
                        case 'Cloudinary Upload':
                          testCloudinaryUpload();
                          break;
                        case 'Google Vision Analysis':
                          testGoogleVision();
                          break;
                        case 'Google Maps Location':
                          testGoogleMaps();
                          break;
                        case 'Auth0 Authentication':
                          testAuth0();
                          break;

                      }
                    }}
                  >
                    <Text style={styles.testButtonText}>Test</Text>
                  </TouchableOpacity>
                </View>
                
                {result.data && (
                  <View style={styles.testItemData}>
                    {Object.entries(result.data).map(([key, value]) => (
                      <View key={key} style={styles.testDataItem}>
                        <Text style={styles.testDataKey}>{key}:</Text>
                        <Text style={styles.testDataValue}>
                          {Array.isArray(value) ? value.join(', ') : String(value)}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
                
                {result.error && (
                  <View style={styles.testItemError}>
                    <Text style={styles.testErrorText}>{result.error}</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Realtime Data */}
        {realtimeData && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🔄 Données temps réel</Text>
            <View style={styles.realtimeCard}>
              <Text style={styles.realtimeText}>
                {JSON.stringify(realtimeData, null, 2)}
              </Text>
            </View>
          </View>
        )}

        {/* Integration Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 État des intégrations</Text>
          <View style={styles.integrationsList}>
            <View style={styles.integrationItem}>
              <Brain color={Colors.palette.accentGold} size={24} />
              <Text style={styles.integrationText}>Google Cloud Vision</Text>
              <Text style={styles.integrationStatus}>Configuré</Text>
            </View>
            <View style={styles.integrationItem}>
              <MapPin color={Colors.palette.accentGold} size={24} />
              <Text style={styles.integrationText}>Google Maps</Text>
              <Text style={styles.integrationStatus}>Configuré</Text>
            </View>
            <View style={styles.integrationItem}>
              <Shield color={Colors.palette.accentGold} size={24} />
              <Text style={styles.integrationText}>Auth0</Text>
              <Text style={styles.integrationStatus}>Configuré</Text>
            </View>

            <View style={styles.integrationItem}>
              <Camera color={Colors.palette.accentGold} size={24} />
              <Text style={styles.integrationText}>Cloudinary</Text>
              <Text style={styles.integrationStatus}>Actif</Text>
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
  userCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  userEmail: {
    color: Colors.palette.taupe,
    fontSize: 14,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
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
  imagePickerContainer: {
    alignItems: 'center',
  },
  runAllButton: {
    backgroundColor: Colors.palette.accentGold,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  runAllButtonText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '600',
  },
  testsList: {
    gap: 16,
  },
  testItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  testItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  testItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  idleIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.palette.taupe,
  },
  testItemInfo: {
    flex: 1,
  },
  testItemTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  testItemStatus: {
    fontSize: 12,
    fontWeight: '500',
  },
  testButton: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  testButtonText: {
    color: Colors.palette.accentGold,
    fontSize: 12,
    fontWeight: '600',
  },
  testItemData: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 8,
    padding: 12,
    gap: 6,
  },
  testDataItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  testDataKey: {
    color: Colors.palette.taupe,
    fontSize: 12,
    fontWeight: '600',
    width: 80,
  },
  testDataValue: {
    color: '#FFFFFF',
    fontSize: 12,
    flex: 1,
  },
  testItemError: {
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
    borderRadius: 8,
    padding: 12,
  },
  testErrorText: {
    color: '#F44336',
    fontSize: 12,
  },
  realtimeCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  realtimeText: {
    color: Colors.palette.taupe,
    fontSize: 12,
    fontFamily: 'monospace',
  },
  integrationsList: {
    gap: 12,
  },
  integrationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  integrationText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
    marginLeft: 12,
  },
  integrationStatus: {
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: '600',
  },
});