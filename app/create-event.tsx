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
  Platform
} from 'react-native';
import { Stack, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MapPin, Calendar, Save, Loader2 } from 'lucide-react-native';
import MapView, { Marker } from 'react-native-maps';
import { useAppState } from '@/providers/AppStateProvider';
import { getCurrentLocation, requestLocationPermission, LocationCoords, GeolocationError } from '@/utils/geolocation';

export default function CreateEventScreen() {
  const { createEvent, addNotification } = useAppState();
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [location, setLocation] = useState<LocationCoords | null>(null);
  const [address, setAddress] = useState<string>('');
  const [isLoadingLocation, setIsLoadingLocation] = useState<boolean>(false);
  const [isCreating, setIsCreating] = useState<boolean>(false);

  const getCurrentLocationAsync = useCallback(async () => {
    setIsLoadingLocation(true);
    try {
      console.log('Requesting location permission...');
      const hasPermission = await requestLocationPermission();
      
      if (!hasPermission) {
        console.log('Location permission denied');
        Alert.alert(
          'Permission requise',
          'L&apos;accès à la localisation est nécessaire pour créer un événement avec votre position.',
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
      Alert.alert('Erreur', 'Veuillez saisir un titre pour l&apos;événement');
      return;
    }

    if (!date.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir une date pour l&apos;événement');
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

      addNotification({
        type: 'photo_added',
        title: 'Événement créé',
        message: `L&apos;événement "${title}" a été créé avec succès`,
        read: false,
        data: { eventId: event.id }
      });

      router.back();
    } catch (error) {
      console.error('Error creating event:', error);
      Alert.alert('Erreur', 'Impossible de créer l&apos;événement');
    } finally {
      setIsCreating(false);
    }
  };

  const MapComponent = () => {
    if (Platform.OS === 'web') {
      // Web fallback - simple location display
      return (
        <View style={styles.webMapFallback}>
          <MapPin size={24} color="#007AFF" />
          <Text style={styles.webMapText}>
            {location ? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}` : 'Position non disponible'}
          </Text>
          {address && (
            <Text style={styles.webMapAddress}>{address}</Text>
          )}
        </View>
      );
    }

    // Native map
    if (!location) {
      return (
        <View style={styles.mapPlaceholder}>
          <MapPin size={48} color="#ccc" />
          <Text style={styles.mapPlaceholderText}>Position non disponible</Text>
        </View>
      );
    }

    return (
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        showsUserLocation={true}
        showsMyLocationButton={true}
      >
        <Marker
          coordinate={{
            latitude: location.latitude,
            longitude: location.longitude,
          }}
          title="Emplacement de l&apos;événement"
          description={address || 'Position actuelle'}
        />
      </MapView>
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
          <Text style={styles.label}>Titre de l&apos;événement *</Text>
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
                placeholder="Adresse de l&apos;événement"
                placeholderTextColor="#999"
                testID="event-address-input"
              />
            </View>
          )}
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.infoText}>
            💡 L&apos;événement sera créé avec votre position actuelle. Les autres utilisateurs pourront voir l&apos;emplacement sur la carte.
          </Text>
        </View>
      </ScrollView>
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
  map: {
    flex: 1,
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  mapPlaceholderText: {
    fontSize: 16,
    color: '#999',
    marginTop: 8,
  },
  webMapFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f8ff',
    padding: 20,
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
    backgroundColor: '#f0f8ff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  infoText: {
    fontSize: 14,
    color: '#007AFF',
    lineHeight: 20,
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
});