import { Platform } from 'react-native';
import * as Location from 'expo-location';

export interface LocationCoords {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  heading?: number;
  speed?: number;
}

export interface GeolocationError {
  code: number;
  message: string;
}

export interface GeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
}

class GeolocationService {
  private static instance: GeolocationService;
  private permissionGranted: boolean = false;

  static getInstance(): GeolocationService {
    if (!GeolocationService.instance) {
      GeolocationService.instance = new GeolocationService();
    }
    return GeolocationService.instance;
  }

  async requestPermission(): Promise<boolean> {
    try {
      if (Platform.OS === 'web') {
        if (!navigator.geolocation) {
          console.warn('Geolocation is not supported by this browser');
          return false;
        }
        
        // For web, we'll check permission in getCurrentPosition
        return true;
      } else {
        // Native platforms
        const { status } = await Location.requestForegroundPermissionsAsync();
        this.permissionGranted = status === 'granted';
        return this.permissionGranted;
      }
    } catch (error) {
      console.error('Error requesting location permission:', error);
      return false;
    }
  }

  async getCurrentPosition(options: GeolocationOptions = {}): Promise<LocationCoords> {
    const defaultOptions: GeolocationOptions = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 60000,
      ...options
    };

    if (Platform.OS === 'web') {
      return this.getWebPosition(defaultOptions);
    } else {
      return this.getNativePosition(defaultOptions);
    }
  }

  private async getWebPosition(options: GeolocationOptions): Promise<LocationCoords> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject({
          code: 2,
          message: 'Geolocation is not supported by this browser'
        } as GeolocationError);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude || undefined,
            heading: position.coords.heading || undefined,
            speed: position.coords.speed || undefined
          });
        },
        (error) => {
          let message = 'Unknown error occurred';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              message = 'Location access denied by user';
              break;
            case error.POSITION_UNAVAILABLE:
              message = 'Location information unavailable';
              break;
            case error.TIMEOUT:
              message = 'Location request timed out';
              break;
          }
          reject({
            code: error.code,
            message
          } as GeolocationError);
        },
        {
          enableHighAccuracy: options.enableHighAccuracy,
          timeout: options.timeout,
          maximumAge: options.maximumAge
        }
      );
    });
  }

  private async getNativePosition(options: GeolocationOptions): Promise<LocationCoords> {
    try {
      if (!this.permissionGranted) {
        const hasPermission = await this.requestPermission();
        if (!hasPermission) {
          throw {
            code: 1,
            message: 'Location permission denied'
          } as GeolocationError;
        }
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: options.enableHighAccuracy 
          ? Location.Accuracy.BestForNavigation 
          : Location.Accuracy.Balanced
      });

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy || undefined,
        altitude: location.coords.altitude || undefined,
        heading: location.coords.heading || undefined,
        speed: location.coords.speed || undefined
      };
    } catch (error: any) {
      console.error('Native location error:', error);
      throw {
        code: error.code || 2,
        message: error.message || 'Failed to get location'
      } as GeolocationError;
    }
  }

  async watchPosition(
    successCallback: (position: LocationCoords) => void,
    errorCallback?: (error: GeolocationError) => void,
    options: GeolocationOptions = {}
  ): Promise<() => void> {
    const defaultOptions: GeolocationOptions = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 60000,
      ...options
    };

    if (Platform.OS === 'web') {
      return this.watchWebPosition(successCallback, errorCallback, defaultOptions);
    } else {
      return this.watchNativePosition(successCallback, errorCallback, defaultOptions);
    }
  }

  private watchWebPosition(
    successCallback: (position: LocationCoords) => void,
    errorCallback?: (error: GeolocationError) => void,
    options: GeolocationOptions = {}
  ): () => void {
    if (!navigator.geolocation) {
      errorCallback?.({
        code: 2,
        message: 'Geolocation is not supported by this browser'
      });
      return () => {};
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        successCallback({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude || undefined,
          heading: position.coords.heading || undefined,
          speed: position.coords.speed || undefined
        });
      },
      (error) => {
        let message = 'Unknown error occurred';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = 'Location access denied by user';
            break;
          case error.POSITION_UNAVAILABLE:
            message = 'Location information unavailable';
            break;
          case error.TIMEOUT:
            message = 'Location request timed out';
            break;
        }
        errorCallback?.({
          code: error.code,
          message
        });
      },
      {
        enableHighAccuracy: options.enableHighAccuracy,
        timeout: options.timeout,
        maximumAge: options.maximumAge
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }

  private async watchNativePosition(
    successCallback: (position: LocationCoords) => void,
    errorCallback?: (error: GeolocationError) => void,
    options: GeolocationOptions = {}
  ): Promise<() => void> {
    try {
      if (!this.permissionGranted) {
        const hasPermission = await this.requestPermission();
        if (!hasPermission) {
          errorCallback?.({
            code: 1,
            message: 'Location permission denied'
          });
          return () => {};
        }
      }

      const subscription = await Location.watchPositionAsync(
        {
          accuracy: options.enableHighAccuracy 
            ? Location.Accuracy.BestForNavigation 
            : Location.Accuracy.Balanced,
          timeInterval: 5000,
          distanceInterval: 10
        },
        (location) => {
          successCallback({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy || undefined,
            altitude: location.coords.altitude || undefined,
            heading: location.coords.heading || undefined,
            speed: location.coords.speed || undefined
          });
        }
      );

      return () => {
        subscription.remove();
      };
    } catch (error: any) {
      console.error('Native watch position error:', error);
      errorCallback?.({
        code: error.code || 2,
        message: error.message || 'Failed to watch location'
      });
      return () => {};
    }
  }
}

export const geolocationService = GeolocationService.getInstance();

// Convenience functions
export const getCurrentLocation = (options?: GeolocationOptions): Promise<LocationCoords> => {
  return geolocationService.getCurrentPosition(options);
};

export const requestLocationPermission = (): Promise<boolean> => {
  return geolocationService.requestPermission();
};

export const watchLocation = (
  successCallback: (position: LocationCoords) => void,
  errorCallback?: (error: GeolocationError) => void,
  options?: GeolocationOptions
): Promise<() => void> => {
  return geolocationService.watchPosition(successCallback, errorCallback, options);
};

// Utility functions for photo geotagging
export const addLocationToPhoto = async (photoUri: string): Promise<{ uri: string; location?: LocationCoords }> => {
  try {
    const location = await getCurrentLocation({ enableHighAccuracy: true, timeout: 10000 });
    return {
      uri: photoUri,
      location
    };
  } catch (error) {
    console.warn('Failed to get location for photo:', error);
    return { uri: photoUri };
  }
};

export const calculateDistance = (coord1: LocationCoords, coord2: LocationCoords): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (coord2.latitude - coord1.latitude) * Math.PI / 180;
  const dLon = (coord2.longitude - coord1.longitude) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(coord1.latitude * Math.PI / 180) * Math.cos(coord2.latitude * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in kilometers
};

export const formatLocationName = async (coords: LocationCoords): Promise<string> => {
  try {
    if (Platform.OS === 'web') {
      // For web, we'd need to use a geocoding service
      return `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`;
    } else {
      const [result] = await Location.reverseGeocodeAsync(coords);
      if (result) {
        const parts = [];
        if (result.city) parts.push(result.city);
        if (result.region) parts.push(result.region);
        if (result.country) parts.push(result.country);
        return parts.join(', ') || 'Localisation inconnue';
      }
    }
  } catch (error) {
    console.warn('Failed to reverse geocode:', error);
  }
  return `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`;
};