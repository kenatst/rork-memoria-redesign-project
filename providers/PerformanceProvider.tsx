import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

interface PerformanceMetrics {
  imageLoadTime: number;
  apiResponseTime: number;
  cacheHitRate: number;
  memoryUsage: number;
  networkSpeed: 'slow' | 'medium' | 'fast';
  offlineQueueSize: number;
}

interface PerformanceSettings {
  enableImageCaching: boolean;
  enableLazyLoading: boolean;
  enableBackgroundSync: boolean;
  compressionLevel: 'low' | 'medium' | 'high';
  maxCacheSize: number; // MB
  preloadDistance: number; // pixels
}

interface PerformanceContextType {
  metrics: PerformanceMetrics;
  settings: PerformanceSettings;
  isOnline: boolean;
  updateSettings: (newSettings: Partial<PerformanceSettings>) => Promise<void>;
  clearCache: () => Promise<void>;
  optimizeForDevice: () => Promise<void>;
  measureApiCall: <T>(apiCall: () => Promise<T>) => Promise<T>;
  measureImageLoad: (imageUri: string) => Promise<void>;
}

const PerformanceContext = createContext<PerformanceContextType | undefined>(undefined);

const DEFAULT_SETTINGS: PerformanceSettings = {
  enableImageCaching: true,
  enableLazyLoading: true,
  enableBackgroundSync: true,
  compressionLevel: 'medium',
  maxCacheSize: 100, // 100MB
  preloadDistance: 500, // 500px
};

const DEFAULT_METRICS: PerformanceMetrics = {
  imageLoadTime: 0,
  apiResponseTime: 0,
  cacheHitRate: 0,
  memoryUsage: 0,
  networkSpeed: 'medium',
  offlineQueueSize: 0,
};

export function PerformanceProvider({ children }: { children: React.ReactNode }) {
  const [metrics, setMetrics] = useState<PerformanceMetrics>(DEFAULT_METRICS);
  const [settings, setSettings] = useState<PerformanceSettings>(DEFAULT_SETTINGS);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    loadSettings();
    setupNetworkListener();
    optimizeForDevice();
  }, []);

  const loadSettings = async () => {
    try {
      const stored = await AsyncStorage.getItem('performance_settings');
      if (stored) {
        const parsedSettings = JSON.parse(stored);
        setSettings({ ...DEFAULT_SETTINGS, ...parsedSettings });
      }
    } catch (error) {
      console.error('❌ [Performance] Error loading settings:', error);
    }
  };

  const setupNetworkListener = () => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected ?? false);
      
      // Update network speed based on connection type
      let networkSpeed: 'slow' | 'medium' | 'fast' = 'medium';
      
      if (state.type === 'wifi') {
        networkSpeed = 'fast';
      } else if (state.type === 'cellular') {
        if (state.details?.cellularGeneration === '2g') {
          networkSpeed = 'slow';
        } else if (state.details?.cellularGeneration === '3g') {
          networkSpeed = 'medium';
        } else {
          networkSpeed = 'fast';
        }
      } else if (!state.isConnected) {
        networkSpeed = 'slow';
      }
      
      setMetrics(prev => ({ ...prev, networkSpeed }));
    });

    return unsubscribe;
  };

  const updateSettings = async (newSettings: Partial<PerformanceSettings>) => {
    try {
      const updatedSettings = { ...settings, ...newSettings };
      setSettings(updatedSettings);
      await AsyncStorage.setItem('performance_settings', JSON.stringify(updatedSettings));
      console.log('✅ [Performance] Settings updated:', newSettings);
    } catch (error) {
      console.error('❌ [Performance] Error updating settings:', error);
    }
  };

  const clearCache = async () => {
    try {
      // Clear image cache
      if (Platform.OS !== 'web') {
        const { FileSystem } = require('expo-file-system');
        const cacheDir = `${FileSystem.cacheDirectory}images/`;
        const exists = await FileSystem.getInfoAsync(cacheDir);
        if (exists.exists) {
          await FileSystem.deleteAsync(cacheDir, { idempotent: true });
        }
      }
      
      // Clear AsyncStorage cache
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith('cache_'));
      await AsyncStorage.multiRemove(cacheKeys);
      
      console.log('✅ [Performance] Cache cleared');
    } catch (error) {
      console.error('❌ [Performance] Error clearing cache:', error);
    }
  };

  const optimizeForDevice = async () => {
    try {
      // Get device info
      const deviceInfo = {
        platform: Platform.OS,
        version: Platform.Version,
      };

      let optimizedSettings: Partial<PerformanceSettings> = {};

      // Optimize based on platform
      if (Platform.OS === 'web') {
        optimizedSettings = {
          enableImageCaching: true,
          compressionLevel: 'medium',
          maxCacheSize: 50, // Lower for web
          preloadDistance: 300,
        };
      } else {
        // Mobile optimizations
        optimizedSettings = {
          enableImageCaching: true,
          enableLazyLoading: true,
          compressionLevel: 'high',
          maxCacheSize: 100,
          preloadDistance: 500,
        };
      }

      await updateSettings(optimizedSettings);
      console.log('✅ [Performance] Device optimized:', deviceInfo);
    } catch (error) {
      console.error('❌ [Performance] Error optimizing for device:', error);
    }
  };

  const measureApiCall = useCallback(async function<T>(apiCall: () => Promise<T>): Promise<T> {
    const startTime = Date.now();
    try {
      const result = await apiCall();
      const responseTime = Date.now() - startTime;
      
      setMetrics(prev => ({
        ...prev,
        apiResponseTime: (prev.apiResponseTime + responseTime) / 2, // Moving average
      }));
      
      return result;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      setMetrics(prev => ({
        ...prev,
        apiResponseTime: (prev.apiResponseTime + responseTime) / 2,
      }));
      throw error;
    }
  }, []);

  const measureImageLoad = useCallback(async (imageUri: string): Promise<void> => {
    const startTime = Date.now();
    
    return new Promise((resolve, reject) => {
      if (Platform.OS === 'web') {
        const img = new Image();
        img.onload = () => {
          const loadTime = Date.now() - startTime;
          setMetrics(prev => ({
            ...prev,
            imageLoadTime: (prev.imageLoadTime + loadTime) / 2,
          }));
          resolve();
        };
        img.onerror = reject;
        img.src = imageUri;
      } else {
        // For React Native, we'll simulate measurement
        setTimeout(() => {
          const loadTime = Date.now() - startTime;
          setMetrics(prev => ({
            ...prev,
            imageLoadTime: (prev.imageLoadTime + loadTime) / 2,
          }));
          resolve();
        }, 100);
      }
    });
  }, []);

  // Monitor memory usage (simplified)
  useEffect(() => {
    const interval = setInterval(() => {
      if (Platform.OS === 'web' && 'memory' in performance) {
        const memInfo = (performance as any).memory;
        if (memInfo) {
          const memoryUsage = (memInfo.usedJSHeapSize / memInfo.jsHeapSizeLimit) * 100;
          setMetrics(prev => ({ ...prev, memoryUsage }));
        }
      }
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, []);

  const value: PerformanceContextType = {
    metrics,
    settings,
    isOnline,
    updateSettings,
    clearCache,
    optimizeForDevice,
    measureApiCall,
    measureImageLoad,
  };

  return (
    <PerformanceContext.Provider value={value}>
      {children}
    </PerformanceContext.Provider>
  );
}

export function usePerformance() {
  const context = useContext(PerformanceContext);
  if (context === undefined) {
    throw new Error('usePerformance must be used within a PerformanceProvider');
  }
  return context;
}

export default PerformanceProvider;