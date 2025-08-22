import React, { useMemo, useState, useEffect } from 'react';
import { View, StyleSheet, Text, ScrollView, Pressable, Alert, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import Colors from '@/constants/colors';
import { MapPin, CalendarDays, Users2, Sparkles, Navigation, RefreshCw } from 'lucide-react-native';
import { useAppState } from '@/providers/AppStateProvider';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  city?: string;
}

interface LocalEvent {
  id: string;
  name: string;
  coverImage?: string;
  participants: number;
  distance: number;
  city: string;
  startTime: string;
  endTime?: string;
  description?: string;
  location: {
    latitude: number;
    longitude: number;
  };
  isLive: boolean;
}

export default function LocalEventsScreen() {
  const router = useRouter();
  const { getSmartAlbums } = useAppState() as any;
  const [userLocation, setUserLocation] = useState<LocationData | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState<boolean>(false);
  const [localEvents, setLocalEvents] = useState<LocalEvent[]>([]);
  
  const albumEvents = useMemo(() => getSmartAlbums().byLocation, [getSmartAlbums]);

  useEffect(() => {
    requestLocationPermission();
    loadMockEvents();
  }, []);

  const requestLocationPermission = async () => {
    try {
      setIsLoadingLocation(true);
      
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission requise',
          'L\'accès à la localisation est nécessaire pour afficher les événements à proximité.',
          [
            { text: 'Paramètres', onPress: () => Location.requestForegroundPermissionsAsync() },
            { text: 'Ignorer', style: 'cancel' }
          ]
        );
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = location.coords;
      
      // Reverse geocoding to get city name
      try {
        const [address] = await Location.reverseGeocodeAsync({ latitude, longitude });
        setUserLocation({
          latitude,
          longitude,
          accuracy: location.coords.accuracy || undefined,
          city: address.city || address.subregion || 'Ville inconnue'
        });
      } catch (geocodeError) {
        setUserLocation({
          latitude,
          longitude,
          accuracy: location.coords.accuracy || undefined,
          city: 'Ville inconnue'
        });
      }
      
      if (Platform.OS !== 'web') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error('Erreur localisation:', error);
      Alert.alert('Erreur', 'Impossible d\'obtenir votre localisation');
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const loadMockEvents = () => {
    // Mock events with realistic locations
    const mockEvents: LocalEvent[] = [
      {
        id: '1',
        name: 'Soirée Électro Underground',
        coverImage: 'https://images.unsplash.com/photo-1571266028243-d220c9c3b2d2?q=80&w=1600&auto=format&fit=crop',
        participants: 247,
        distance: 0.8,
        city: 'Paris 11e',
        startTime: new Date().toISOString(),
        description: 'Soirée électro dans un lieu secret avec les meilleurs DJs de la scène underground parisienne.',
        location: { latitude: 48.8566, longitude: 2.3522 },
        isLive: true
      },
      {
        id: '2',
        name: 'Mariage Royal',
        coverImage: 'https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=1600&auto=format&fit=crop',
        participants: 156,
        distance: 2.3,
        city: 'Versailles',
        startTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        description: 'Célébration d\'un mariage dans les jardins du château de Versailles.',
        location: { latitude: 48.8049, longitude: 2.1204 },
        isLive: false
      },
      {
        id: '3',
        name: 'Festival Tech 2024',
        coverImage: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=1600&auto=format&fit=crop',
        participants: 892,
        distance: 5.7,
        city: 'La Défense',
        startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        description: 'Le plus grand festival tech de France avec conférences, démonstrations et networking.',
        location: { latitude: 48.8922, longitude: 2.2358 },
        isLive: false
      },
      {
        id: '4',
        name: 'Concert Jazz au Sunset',
        coverImage: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?q=80&w=1600&auto=format&fit=crop',
        participants: 89,
        distance: 1.2,
        city: 'Saint-Germain',
        startTime: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
        description: 'Concert de jazz intimiste dans le célèbre club parisien.',
        location: { latitude: 48.8534, longitude: 2.3488 },
        isLive: true
      }
    ];
    
    setLocalEvents(mockEvents);
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const sortedEvents = useMemo(() => {
    if (!userLocation) return localEvents;
    
    return localEvents
      .map(event => ({
        ...event,
        distance: calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          event.location.latitude,
          event.location.longitude
        )
      }))
      .sort((a, b) => a.distance - b.distance);
  }, [localEvents, userLocation]);

  const refreshLocation = async () => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    await requestLocationPermission();
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#000000', '#0B0B0D', '#131417']} style={StyleSheet.absoluteFillObject} />
      <SafeAreaView style={styles.safeArea} edges={['top','bottom']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.title}>Événements autour de vous</Text>
              <Text style={styles.subtitle}>
                {userLocation 
                  ? `${userLocation.city} • ${sortedEvents.length} événements`
                  : 'Albums géolocalisés, partagés en temps réel'
                }
              </Text>
            </View>
            <Pressable 
              style={[styles.locationButton, isLoadingLocation && styles.locationButtonLoading]} 
              onPress={refreshLocation}
              disabled={isLoadingLocation}
            >
              {isLoadingLocation ? (
                <RefreshCw color="#FFD700" size={20} />
              ) : (
                <Navigation color="#FFD700" size={20} />
              )}
            </Pressable>
          </View>

          <View style={styles.list}>
            {sortedEvents.map((event) => (
              <Pressable 
                key={event.id} 
                style={styles.card} 
                onPress={() => {
                  // For now, navigate to a mock album. In real app, this would be event-specific
                  router.push(`/album/${event.id}`);
                }} 
                testID={`event-${event.id}`}
              >
                <Image 
                  source={{ uri: event.coverImage || 'https://images.unsplash.com/photo-1532635224-97aa6b1a4310?q=80&w=1600&auto=format&fit=crop' }} 
                  style={styles.cover} 
                  contentFit="cover" 
                />
                <LinearGradient colors={['transparent','rgba(0,0,0,0.8)']} style={styles.overlay} />
                
                <View style={styles.badges}>
                  {event.isLive && (
                    <View style={[styles.badge, styles.liveBadge]}>
                      <Sparkles size={12} color="#FFD700" />
                      <Text style={styles.badgeText}>LIVE</Text>
                    </View>
                  )}
                  <View style={styles.badge}>
                    <Users2 size={12} color="#E8EAF0" />
                    <Text style={styles.badgeText}>{event.participants}</Text>
                  </View>
                  {userLocation && (
                    <View style={styles.badge}>
                      <MapPin size={12} color="#4ECDC4" />
                      <Text style={styles.badgeText}>{event.distance.toFixed(1)}km</Text>
                    </View>
                  )}
                </View>
                
                <View style={styles.meta}>
                  <Text numberOfLines={1} style={styles.name}>{event.name}</Text>
                  <View style={styles.row}>
                    <MapPin color={Colors.palette.taupe} size={14} />
                    <Text style={styles.metaText}>{event.city}</Text>
                  </View>
                  <View style={styles.row}>
                    <CalendarDays color={Colors.palette.taupe} size={14} />
                    <Text style={styles.metaText}>
                      {new Date(event.startTime).toLocaleTimeString('fr-FR', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </Text>
                  </View>
                  {event.description && (
                    <Text numberOfLines={2} style={styles.description}>{event.description}</Text>
                  )}
                </View>
              </Pressable>
            ))}
            
            {/* Album Events Section */}
            {albumEvents.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Albums avec géolocalisation</Text>
                {albumEvents.map((ev: any) => (
                  <Pressable key={`album-${ev.id}`} style={styles.card} onPress={() => router.push(`/album/${ev.id}`)} testID={`album-event-${ev.id}`}>
                    <Image source={{ uri: ev.coverImage || 'https://images.unsplash.com/photo-1532635224-97aa6b1a4310?q=80&w=1600&auto=format&fit=crop' }} style={styles.cover} contentFit="cover" />
                    <LinearGradient colors={['transparent','rgba(0,0,0,0.8)']} style={styles.overlay} />
                    <View style={styles.badges}>
                      <View style={styles.badge}><Users2 size={12} color="#E8EAF0" /><Text style={styles.badgeText}>{ev.participants ?? 0}</Text></View>
                    </View>
                    <View style={styles.meta}>
                      <Text numberOfLines={1} style={styles.name}>{ev.name}</Text>
                      <View style={styles.row}><MapPin color={Colors.palette.taupe} size={14} /><Text style={styles.metaText}>Album géolocalisé</Text></View>
                      <View style={styles.row}><CalendarDays color={Colors.palette.taupe} size={14} /><Text style={styles.metaText}>Récent</Text></View>
                    </View>
                  </Pressable>
                ))}
              </>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  safeArea: { flex: 1 },
  content: { padding: 20, paddingBottom: 120, gap: 12 },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  title: { color: '#fff', fontSize: 24, fontWeight: '900' },
  subtitle: { color: Colors.palette.taupe, fontSize: 14, marginTop: 4 },
  locationButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,215,0,0.1)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,215,0,0.3)' },
  locationButtonLoading: { opacity: 0.6 },
  list: { gap: 16 },
  card: { borderRadius: 16, overflow: 'hidden', backgroundColor: '#131417' },
  cover: { height: 160, width: '100%' },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  badges: { position: 'absolute', top: 8, right: 8, flexDirection: 'row', gap: 6, flexWrap: 'wrap', maxWidth: '60%' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 8 },
  liveBadge: { backgroundColor: 'rgba(255,215,0,0.9)' },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  meta: { position: 'absolute', left: 12, right: 12, bottom: 12 },
  name: { color: '#fff', fontSize: 16, fontWeight: '800' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  metaText: { color: Colors.palette.taupe, fontSize: 12 },
  description: { color: Colors.palette.taupe, fontSize: 11, lineHeight: 14, marginTop: 4, opacity: 0.8 },
  sectionTitle: { color: '#fff', fontSize: 18, fontWeight: '700', marginTop: 24, marginBottom: 12 },
});