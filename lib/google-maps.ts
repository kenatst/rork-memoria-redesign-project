
import * as Location from 'expo-location';

// Configuration Google Maps avec la clé API fournie
const GOOGLE_MAPS_API_KEY = 'AIzaSyAb8RN6J7-0OTdprRlQ3SiSkySH1_F9HXk7mzmX7TNdSlDDOhSQ';
const GEOCODING_API_URL = 'https://maps.googleapis.com/maps/api/geocode/json';
const PLACES_API_URL = 'https://maps.googleapis.com/maps/api/place';

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  altitude?: number;
  accuracy?: number;
  timestamp?: number;
}

export interface GeocodeResult {
  address: string;
  formattedAddress: string;
  city: string;
  country: string;
  postalCode: string;
  coordinates: LocationCoordinates;
  placeId?: string;
}

export interface PlaceDetails {
  placeId: string;
  name: string;
  address: string;
  coordinates: LocationCoordinates;
  rating?: number;
  priceLevel?: number;
  types: string[];
  photos?: string[];
  phoneNumber?: string;
  website?: string;
  openingHours?: string[];
}

export interface NearbyPlace {
  placeId: string;
  name: string;
  vicinity: string;
  coordinates: LocationCoordinates;
  rating?: number;
  types: string[];
  distance?: number;
}

/**
 * Demande les permissions de géolocalisation
 * @returns Promise<boolean> - true si les permissions sont accordées
 */
export async function requestLocationPermissions(): Promise<boolean> {
  try {
    console.log('📍 [GoogleMaps] Requesting location permissions...');
    
    const { status } = await Location.requestForegroundPermissionsAsync();
    
    if (status !== 'granted') {
      console.warn('⚠️ [GoogleMaps] Location permission denied');
      return false;
    }
    
    console.log('✅ [GoogleMaps] Location permissions granted');
    return true;
  } catch (error) {
    console.error('❌ [GoogleMaps] Error requesting permissions:', error);
    return false;
  }
}

/**
 * Obtient la position actuelle de l'utilisateur
 * @param highAccuracy - Utiliser la haute précision (GPS)
 * @returns Promise<LocationCoordinates>
 */
export async function getCurrentLocation(highAccuracy: boolean = true): Promise<LocationCoordinates> {
  try {
    console.log('🎯 [GoogleMaps] Getting current location...');
    
    const hasPermission = await requestLocationPermissions();
    if (!hasPermission) {
      throw new Error('Location permission not granted');
    }
    
    const location = await Location.getCurrentPositionAsync({
      accuracy: highAccuracy ? Location.Accuracy.High : Location.Accuracy.Balanced,
    });
    
    const coordinates: LocationCoordinates = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      altitude: location.coords.altitude || undefined,
      accuracy: location.coords.accuracy || undefined,
      timestamp: location.timestamp,
    };
    
    console.log('✅ [GoogleMaps] Current location obtained:', coordinates);
    return coordinates;
  } catch (error) {
    console.error('❌ [GoogleMaps] Error getting current location:', error);
    throw new Error(`Failed to get current location: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Convertit des coordonnées en adresse (Reverse Geocoding)
 * @param coordinates - Coordonnées à convertir
 * @returns Promise<GeocodeResult>
 */
export async function reverseGeocode(coordinates: LocationCoordinates): Promise<GeocodeResult> {
  try {
    console.log('🔄 [GoogleMaps] Reverse geocoding...', coordinates);
    
    const url = `${GEOCODING_API_URL}?latlng=${coordinates.latitude},${coordinates.longitude}&key=${GOOGLE_MAPS_API_KEY}&language=fr`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Geocoding API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      throw new Error(`Geocoding failed: ${data.status}`);
    }
    
    const result = data.results[0];
    const addressComponents = result.address_components;
    
    // Extract address components
    let city = '';
    let country = '';
    let postalCode = '';
    
    addressComponents.forEach((component: any) => {
      const types = component.types;
      if (types.includes('locality') || types.includes('administrative_area_level_2')) {
        city = component.long_name;
      }
      if (types.includes('country')) {
        country = component.long_name;
      }
      if (types.includes('postal_code')) {
        postalCode = component.long_name;
      }
    });
    
    const geocodeResult: GeocodeResult = {
      address: result.formatted_address,
      formattedAddress: result.formatted_address,
      city,
      country,
      postalCode,
      coordinates: {
        latitude: result.geometry.location.lat,
        longitude: result.geometry.location.lng,
      },
      placeId: result.place_id,
    };
    
    console.log('✅ [GoogleMaps] Reverse geocoding completed:', geocodeResult);
    return geocodeResult;
  } catch (error) {
    console.error('❌ [GoogleMaps] Reverse geocoding error:', error);
    throw new Error(`Reverse geocoding failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Convertit une adresse en coordonnées (Forward Geocoding)
 * @param address - Adresse à convertir
 * @returns Promise<GeocodeResult>
 */
export async function forwardGeocode(address: string): Promise<GeocodeResult> {
  try {
    console.log('➡️ [GoogleMaps] Forward geocoding...', address);
    
    const encodedAddress = encodeURIComponent(address);
    const url = `${GEOCODING_API_URL}?address=${encodedAddress}&key=${GOOGLE_MAPS_API_KEY}&language=fr`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Geocoding API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      throw new Error(`Geocoding failed: ${data.status}`);
    }
    
    const result = data.results[0];
    const addressComponents = result.address_components;
    
    // Extract address components
    let city = '';
    let country = '';
    let postalCode = '';
    
    addressComponents.forEach((component: any) => {
      const types = component.types;
      if (types.includes('locality') || types.includes('administrative_area_level_2')) {
        city = component.long_name;
      }
      if (types.includes('country')) {
        country = component.long_name;
      }
      if (types.includes('postal_code')) {
        postalCode = component.long_name;
      }
    });
    
    const geocodeResult: GeocodeResult = {
      address: result.formatted_address,
      formattedAddress: result.formatted_address,
      city,
      country,
      postalCode,
      coordinates: {
        latitude: result.geometry.location.lat,
        longitude: result.geometry.location.lng,
      },
      placeId: result.place_id,
    };
    
    console.log('✅ [GoogleMaps] Forward geocoding completed:', geocodeResult);
    return geocodeResult;
  } catch (error) {
    console.error('❌ [GoogleMaps] Forward geocoding error:', error);
    throw new Error(`Forward geocoding failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Recherche des lieux à proximité
 * @param coordinates - Coordonnées de référence
 * @param radius - Rayon de recherche en mètres (max 50000)
 * @param type - Type de lieu (restaurant, gas_station, etc.)
 * @returns Promise<NearbyPlace[]>
 */
export async function findNearbyPlaces(
  coordinates: LocationCoordinates,
  radius: number = 1000,
  type?: string
): Promise<NearbyPlace[]> {
  try {
    console.log('🔍 [GoogleMaps] Finding nearby places...', { coordinates, radius, type });
    
    let url = `${PLACES_API_URL}/nearbysearch/json?location=${coordinates.latitude},${coordinates.longitude}&radius=${radius}&key=${GOOGLE_MAPS_API_KEY}&language=fr`;
    
    if (type) {
      url += `&type=${type}`;
    }
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Places API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      throw new Error(`Places search failed: ${data.status}`);
    }
    
    const places: NearbyPlace[] = (data.results || []).map((place: any) => ({
      placeId: place.place_id,
      name: place.name,
      vicinity: place.vicinity || place.formatted_address || '',
      coordinates: {
        latitude: place.geometry.location.lat,
        longitude: place.geometry.location.lng,
      },
      rating: place.rating,
      types: place.types || [],
      distance: calculateDistance(coordinates, {
        latitude: place.geometry.location.lat,
        longitude: place.geometry.location.lng,
      }),
    }));
    
    console.log('✅ [GoogleMaps] Found nearby places:', places.length);
    return places;
  } catch (error) {
    console.error('❌ [GoogleMaps] Error finding nearby places:', error);
    throw new Error(`Failed to find nearby places: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Obtient les détails d'un lieu spécifique
 * @param placeId - ID du lieu
 * @returns Promise<PlaceDetails>
 */
export async function getPlaceDetails(placeId: string): Promise<PlaceDetails> {
  try {
    console.log('📍 [GoogleMaps] Getting place details...', placeId);
    
    const fields = 'place_id,name,formatted_address,geometry,rating,price_level,types,photos,formatted_phone_number,website,opening_hours';
    const url = `${PLACES_API_URL}/details/json?place_id=${placeId}&fields=${fields}&key=${GOOGLE_MAPS_API_KEY}&language=fr`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Places API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.status !== 'OK') {
      throw new Error(`Place details failed: ${data.status}`);
    }
    
    const place = data.result;
    
    const placeDetails: PlaceDetails = {
      placeId: place.place_id,
      name: place.name,
      address: place.formatted_address,
      coordinates: {
        latitude: place.geometry.location.lat,
        longitude: place.geometry.location.lng,
      },
      rating: place.rating,
      priceLevel: place.price_level,
      types: place.types || [],
      photos: place.photos ? place.photos.map((photo: any) => 
        `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photo.photo_reference}&key=${GOOGLE_MAPS_API_KEY}`
      ) : [],
      phoneNumber: place.formatted_phone_number,
      website: place.website,
      openingHours: place.opening_hours?.weekday_text,
    };
    
    console.log('✅ [GoogleMaps] Place details obtained:', placeDetails);
    return placeDetails;
  } catch (error) {
    console.error('❌ [GoogleMaps] Error getting place details:', error);
    throw new Error(`Failed to get place details: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Calcule la distance entre deux points en mètres
 * @param point1 - Premier point
 * @param point2 - Deuxième point
 * @returns Distance en mètres
 */
export function calculateDistance(point1: LocationCoordinates, point2: LocationCoordinates): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (point1.latitude * Math.PI) / 180;
  const φ2 = (point2.latitude * Math.PI) / 180;
  const Δφ = ((point2.latitude - point1.latitude) * Math.PI) / 180;
  const Δλ = ((point2.longitude - point1.longitude) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Génère une URL pour une carte statique Google Maps
 * @param coordinates - Coordonnées du centre
 * @param zoom - Niveau de zoom (1-20)
 * @param size - Taille de l'image (ex: "400x400")
 * @param markers - Marqueurs à afficher
 * @returns URL de la carte statique
 */
export function generateStaticMapUrl(
  coordinates: LocationCoordinates,
  zoom: number = 15,
  size: string = '400x400',
  markers?: { coordinates: LocationCoordinates; color?: string; label?: string }[]
): string {
  let url = `https://maps.googleapis.com/maps/api/staticmap?center=${coordinates.latitude},${coordinates.longitude}&zoom=${zoom}&size=${size}&key=${GOOGLE_MAPS_API_KEY}`;
  
  if (markers && markers.length > 0) {
    markers.forEach((marker, index) => {
      const color = marker.color || 'red';
      const label = marker.label || (index + 1).toString();
      url += `&markers=color:${color}|label:${label}|${marker.coordinates.latitude},${marker.coordinates.longitude}`;
    });
  } else {
    // Add default marker at center
    url += `&markers=color:red|${coordinates.latitude},${coordinates.longitude}`;
  }
  
  return url;
}

/**
 * Vérifie si deux coordonnées sont proches (dans un rayon donné)
 * @param point1 - Premier point
 * @param point2 - Deuxième point
 * @param radiusMeters - Rayon en mètres
 * @returns true si les points sont proches
 */
export function areCoordinatesNear(
  point1: LocationCoordinates,
  point2: LocationCoordinates,
  radiusMeters: number = 100
): boolean {
  const distance = calculateDistance(point1, point2);
  return distance <= radiusMeters;
}

export default {
  requestLocationPermissions,
  getCurrentLocation,
  reverseGeocode,
  forwardGeocode,
  findNearbyPlaces,
  getPlaceDetails,
  calculateDistance,
  generateStaticMapUrl,
  areCoordinatesNear,
};