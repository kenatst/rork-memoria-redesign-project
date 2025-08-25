import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  Platform,
  Modal,
  Share
} from 'react-native';
import { Stack, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MapPin, Calendar, Save, Loader2, ExternalLink, QrCode, Users, Clock, MapPin as LocationIcon, Share2, Copy, X } from 'lucide-react-native';
import { Linking } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useAppState } from '@/providers/AppStateProvider';
import { getCurrentLocation, requestLocationPermission, LocationCoords, GeolocationError } from '@/utils/geolocation';
import QRCodeGenerator from '@/components/QRCodeGenerator';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';

export default function CreateEventScreen() {
  const { createEvent, addNotification } = useAppState();
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [location, setLocation] = useState<LocationCoords | null>(null);
  const [address, setAddress] = useState<string>('');
  const [isLoadingLocation, setIsLoadingLocation] = useState<boolean>(false);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [showQRCode, setShowQRCode] = useState<boolean>(false);
  const [eventUrl, setEventUrl] = useState<string>('');
  const [maxParticipants, setMaxParticipants] = useState<string>('');
  const [eventType, setEventType] = useState<'public' | 'private' | 'friends'>('public');

  const getCurrentLocationAsync = useCallback(async () => {
    setIsLoadingLocation(true);
    try {
      console.log('Requesting location permission...');
      const hasPermission = await requestLocationPermission();
      
      if (!hasPermission) {
        console.log('Location permission denied');
        Alert.alert(
          'Permission requise',
          'L\'accès à la localisation est nécessaire pour créer un événement avec votre position.',
          [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Réessayer', onPress: () => getCurrentLocationAsync() }
          ]
        );
        return;
      }

      console.log('Getting current position...');
      const position = await getCurrentLocation({
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60000
      });
      
      console.log('Location obtained:', position);
      setLocation(position);
      
      // Try to get address from coordinates (reverse geocoding)
      if (Platform.OS === 'web') {
        // For web, we can use a simple address format
        setAddress(`${position.latitude.toFixed(4)}, ${position.longitude.toFixed(4)}`);
      } else {
        // For native, we could use expo-location's reverseGeocodeAsync
        // but for simplicity, we'll use coordinates
        setAddress(`${position.latitude.toFixed(4)}, ${position.longitude.toFixed(4)}`);
      }
      
    } catch (error: any) {
      console.error('Error getting location:', error);
      const geoError = error as GeolocationError;
      let message = 'Impossible d\'obtenir votre position';
      
      switch (geoError.code) {
        case 1:
          message = 'Accès à la localisation refusé';
          break;
        case 2:
          message = 'Position non disponible';
          break;
        case 3:
          message = 'Délai d\'attente dépassé';
          break;
        default:
          message = geoError.message || 'Erreur de géolocalisation';
      }
      
      Alert.alert('Erreur de localisation', message, [
        { text: 'Continuer sans localisation', style: 'cancel' },
        { text: 'Réessayer', onPress: () => getCurrentLocationAsync() }
      ]);
    } finally {
      setIsLoadingLocation(false);
    }
  }, []);

  useEffect(() => {
    getCurrentLocationAsync();
  }, [getCurrentLocationAsync]);

  const handleCreateEvent = async () => {
    if (!title.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir un titre pour l\'événement');
      return;
    }

    if (!date.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir une date pour l\'événement');
      return;
    }

    if (!location) {
      Alert.alert('Erreur', 'Impossible de créer un événement sans localisation');
      return;
    }

    setIsCreating(true);
    try {
      console.log('Creating event with location:', location);
      
      const event = createEvent(
        title.trim(),
        description.trim(),
        {
          latitude: location.latitude,
          longitude: location.longitude,
          address: address.trim() || undefined
        },
        date.trim()
      );

      console.log('Event created:', event);

      // Generate event URL for QR code
      const url = `https://memoria.app/event/${event.id}`;
      setEventUrl(url);

      addNotification({
        type: 'photo_added',
        title: 'Événement créé',
        message: `L'événement "${title}" a été créé avec succès`,
        read: false,
        data: { eventId: event.id }
      });

      // Show QR code instead of going back
      setShowQRCode(true);
      
      if (Platform.OS !== 'web') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error('Error creating event:', error);
      Alert.alert('Erreur', 'Impossible de créer l\'événement');
    } finally {
      setIsCreating(false);
    }
  };

  const MapComponent = () => {
    const handleOpenMaps = useCallback(() => {
      if (!location) return;
      const lat = location.latitude;
      const lng = location.longitude;
      const query = address ? encodeURIComponent(address) : `${lat},${lng}`;
      const url = Platform.select({
        ios: `http://maps.apple.com/?q=${query}&ll=${lat},${lng}`,
        android: `geo:${lat},${lng}?q=${query}`,
        default: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
      });
      if (url) Linking.openURL(url).catch((e) => console.error('Failed to open maps', e));
    }, []);

    return (
      <View style={styles.webMapFallback}>
        <MapPin size={24} color="#007AFF" />
        <Text style={styles.webMapText}>
          {location ? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}` : 'Position non disponible'}
        </Text>
        {address ? (
          <Text style={styles.webMapAddress}>{address}</Text>
        ) : null}
        <TouchableOpacity
          accessibilityRole="button"
          onPress={handleOpenMaps}
          disabled={!location}
          style={[styles.openMapsButton, !location && styles.openMapsButtonDisabled]}
          testID="open-maps-button"
        >
          <ExternalLink size={16} color="#fff" />
          <Text style={styles.openMapsText}>Ouvrir dans Maps</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Créer un événement',
          headerRight: () => (
            <TouchableOpacity
              onPress={handleCreateEvent}
              disabled={isCreating || !title.trim() || !date.trim() || !location}
              style={[
                styles.saveButton,
                (!title.trim() || !date.trim() || !location || isCreating) && styles.saveButtonDisabled
              ]}
            >
              {isCreating ? (
                <Loader2 size={20} color="#fff" />
              ) : (
                <Save size={20} color="#fff" />
              )}
            </TouchableOpacity>
          )
        }} 
      />
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.label}>Titre de l'événement *</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Ex: Sortie photo au parc"
            placeholderTextColor="#999"
            testID="event-title-input"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Décrivez votre événement..."
            placeholderTextColor="#999"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            testID="event-description-input"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Date et heure *</Text>
          <View style={styles.inputContainer}>
            <Calendar size={20} color="#007AFF" style={styles.inputIcon} />
            <TextInput
              style={[styles.input, styles.inputWithIcon]}
              value={date}
              onChangeText={setDate}
              placeholder="Ex: 25/12/2024 à 14h30"
              placeholderTextColor="#999"
              testID="event-date-input"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Type d'événement</Text>
          <View style={styles.typeSelector}>
            {(['public', 'private', 'friends'] as const).map((type) => (
              <TouchableOpacity
                key={type}
                style={[styles.typeButton, eventType === type && styles.typeButtonActive]}
                onPress={() => setEventType(type)}
              >
                <Text style={[styles.typeText, eventType === type && styles.typeTextActive]}>
                  {type === 'public' ? '🌍 Public' : type === 'private' ? '🔒 Privé' : '👥 Amis'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Nombre de participants (optionnel)</Text>
          <View style={styles.inputContainer}>
            <Users size={20} color="#007AFF" style={styles.inputIcon} />
            <TextInput
              style={[styles.input, styles.inputWithIcon]}
              value={maxParticipants}
              onChangeText={setMaxParticipants}
              placeholder="Ex: 20"
              placeholderTextColor="#999"
              keyboardType="numeric"
              testID="event-participants-input"
            />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.locationHeader}>
            <Text style={styles.label}>Localisation</Text>
            {isLoadingLocation && (
              <ActivityIndicator size="small" color="#007AFF" />
            )}
            <TouchableOpacity
              onPress={getCurrentLocationAsync}
              style={styles.refreshLocationButton}
              disabled={isLoadingLocation}
            >
              <MapPin size={16} color="#007AFF" />
              <Text style={styles.refreshLocationText}>Actualiser</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.mapContainer}>
            <MapComponent />
          </View>

          {address && (
            <View style={styles.addressContainer}>
              <Text style={styles.addressLabel}>Adresse:</Text>
              <TextInput
                style={styles.addressInput}
                value={address}
                onChangeText={setAddress}
                placeholder="Adresse de l'événement"
                placeholderTextColor="#999"
                testID="event-address-input"
              />
            </View>
          )}
        </View>

        <View style={styles.infoSection}>
          <LinearGradient
            colors={['#007AFF20', '#007AFF10']}
            style={styles.infoGradient}
          >
            <QrCode size={24} color="#007AFF" />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoTitle}>QR Code automatique</Text>
              <Text style={styles.infoText}>
                Un QR code sera généré pour partager facilement votre événement avec vos invités.
              </Text>
            </View>
          </LinearGradient>
        </View>
      </ScrollView>
      
      {/* QR Code Modal */}
      <Modal
        visible={showQRCode}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowQRCode(false)}
      >
        <View style={styles.qrModalContainer}>
          <LinearGradient
            colors={['#000000', '#1a1a1a', '#2a2a2a']}
            style={StyleSheet.absoluteFillObject}
          />
          <SafeAreaView style={styles.qrModalSafeArea}>
            <View style={styles.qrModalHeader}>
              <TouchableOpacity
                style={styles.qrCloseButton}
                onPress={() => {
                  setShowQRCode(false);
                  router.back();
                }}
              >
                <X size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.qrModalTitle}>Événement créé !</Text>
              <View style={styles.qrPlaceholder} />
            </View>
            
            <ScrollView style={styles.qrModalContent} showsVerticalScrollIndicator={false}>
              <View style={styles.qrSuccessCard}>
                <View style={styles.qrSuccessIcon}>
                  <Calendar size={32} color="#00C851" />
                </View>
                <Text style={styles.qrSuccessTitle}>{title}</Text>
                <Text style={styles.qrSuccessSubtitle}>Votre événement est prêt !</Text>
              </View>
              
              <View style={styles.qrCodeCard}>
                {Platform.OS !== 'web' ? (
                  <BlurView intensity={20} style={styles.qrCodeBlur}>
                    <View style={styles.qrCodeContainer}>
                      <QRCodeGenerator
                        value={eventUrl}
                        size={200}
                        color="#000000"
                        backgroundColor="#FFFFFF"
                      />
                      <Text style={styles.qrCodeLabel}>Scannez pour rejoindre</Text>
                    </View>
                  </BlurView>
                ) : (
                  <View style={[styles.qrCodeBlur, styles.qrWebBlur]}>
                    <View style={styles.qrCodeContainer}>
                      <QRCodeGenerator
                        value={eventUrl}
                        size={200}
                        color="#000000"
                        backgroundColor="#FFFFFF"
                      />
                      <Text style={styles.qrCodeLabel}>Scannez pour rejoindre</Text>
                    </View>
                  </View>
                )}
              </View>
              
              <View style={styles.qrEventDetails}>
                <View style={styles.qrDetailRow}>
                  <Clock size={20} color="#007AFF" />
                  <Text style={styles.qrDetailText}>{date}</Text>
                </View>
                <View style={styles.qrDetailRow}>
                  <LocationIcon size={20} color="#007AFF" />
                  <Text style={styles.qrDetailText}>{address || 'Position actuelle'}</Text>
                </View>
                {maxParticipants && (
                  <View style={styles.qrDetailRow}>
                    <Users size={20} color="#007AFF" />
                    <Text style={styles.qrDetailText}>{maxParticipants} participants max</Text>
                  </View>
                )}
              </View>
              
              <View style={styles.qrActions}>
                <TouchableOpacity
                  style={styles.qrActionButton}
                  onPress={async () => {
                    try {
                      await Clipboard.setStringAsync(eventUrl);
                      Alert.alert('Copié !', 'Le lien a été copié dans le presse-papiers');
                      if (Platform.OS !== 'web') {
                        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }
                    } catch (error) {
                      Alert.alert('Erreur', 'Impossible de copier le lien');
                    }
                  }}
                >
                  <Copy size={20} color="#FFFFFF" />
                  <Text style={styles.qrActionText}>Copier le lien</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.qrActionButton, styles.qrShareButton]}
                  onPress={async () => {
                    try {
                      if (Platform.OS !== 'web') {
                        await Share.share({
                          message: `Rejoignez mon événement "${title}" le ${date} ! ${eventUrl}`,
                          url: eventUrl,
                          title: `Événement: ${title}`
                        });
                        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      } else {
                        // Web fallback
                        await Clipboard.setStringAsync(eventUrl);
                        Alert.alert('Lien copié', 'Le lien a été copié pour partage');
                      }
                    } catch (error) {
                      Alert.alert('Erreur', 'Impossible de partager l\'événement');
                    }
                  }}
                >
                  <Share2 size={20} color="#000000" />
                  <Text style={[styles.qrActionText, styles.qrShareText]}>Partager</Text>
                </TouchableOpacity>
              </View>
              
              <TouchableOpacity
                style={styles.qrDoneButton}
                onPress={() => {
                  setShowQRCode(false);
                  router.back();
                }}
              >
                <Text style={styles.qrDoneText}>Terminé</Text>
              </TouchableOpacity>
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#e1e5e9',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  inputContainer: {
    position: 'relative',
  },
  inputWithIcon: {
    paddingLeft: 48,
  },
  inputIcon: {
    position: 'absolute',
    left: 16,
    top: 18,
    zIndex: 1,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  typeButton: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  typeButtonActive: {
    backgroundColor: '#007AFF20',
    borderColor: '#007AFF',
  },
  typeText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  typeTextActive: {
    color: '#007AFF',
    fontWeight: '700',
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  refreshLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
  },
  refreshLocationText: {
    fontSize: 14,
    color: '#007AFF',
    marginLeft: 4,
    fontWeight: '500',
  },
  mapContainer: {
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f5f5f5',
  },
  webMapFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f8ff',
    padding: 20,
    gap: 8,
  },
  webMapText: {
    fontSize: 16,
    color: '#007AFF',
    marginTop: 8,
    fontWeight: '500',
  },
  webMapAddress: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  addressContainer: {
    marginTop: 12,
  },
  addressLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
  },
  addressInput: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#e1e5e9',
  },
  infoSection: {
    borderRadius: 12,
    marginBottom: 20,
    overflow: 'hidden',
  },
  infoGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#007AFF',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#007AFF',
    lineHeight: 20,
  },
  openMapsButton: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  openMapsButtonDisabled: {
    backgroundColor: '#a0a0a0',
  },
  openMapsText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 16,
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
  },
  qrModalContainer: {
    flex: 1,
  },
  qrModalSafeArea: {
    flex: 1,
  },
  qrModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  qrCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrModalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  qrPlaceholder: {
    width: 40,
  },
  qrModalContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  qrSuccessCard: {
    alignItems: 'center',
    paddingVertical: 24,
    marginBottom: 24,
  },
  qrSuccessIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0, 200, 81, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  qrSuccessTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  qrSuccessSubtitle: {
    fontSize: 16,
    color: '#A9AFBC',
    textAlign: 'center',
  },
  qrCodeCard: {
    marginBottom: 24,
    borderRadius: 20,
    overflow: 'hidden',
  },
  qrCodeBlur: {
    padding: 24,
    alignItems: 'center',
  },
  qrWebBlur: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    backdropFilter: 'blur(20px)',
  },
  qrCodeContainer: {
    alignItems: 'center',
    gap: 16,
  },
  qrCodeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  qrEventDetails: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    gap: 16,
  },
  qrDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  qrDetailText: {
    fontSize: 16,
    color: '#FFFFFF',
    flex: 1,
  },
  qrActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  qrActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 16,
    borderRadius: 12,
  },
  qrShareButton: {
    backgroundColor: '#007AFF',
  },
  qrActionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  qrShareText: {
    color: '#000000',
  },
  qrDoneButton: {
    backgroundColor: '#00C851',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 40,
  },
  qrDoneText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});