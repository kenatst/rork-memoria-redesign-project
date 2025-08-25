import React, { useEffect, useCallback, useRef, useState } from 'react';
import { Image } from 'expo-image';
import { Platform, InteractionManager, AppState, View, StyleSheet, Dimensions, AppStateStatus } from 'react-native';
import { Skeleton } from '@/components/LoadingStates';

interface ImageCacheOptimizerProps {
  imageUris: string[];
  priority?: 'low' | 'normal' | 'high';
  maxCacheSize?: number;
  onCacheComplete?: () => void;
}

interface LazyImageProps {
  source: { uri: string };
  style?: any;
  contentFit?: 'cover' | 'contain' | 'fill' | 'scale-down';
  placeholder?: React.ReactNode;
  onLoad?: () => void;
  onError?: (error: any) => void;
  priority?: 'low' | 'normal' | 'high';
  lazy?: boolean;
  threshold?: number;
}

// Gestionnaire de cache global
class ImageCacheManager {
  private static instance: ImageCacheManager;
  private cacheQueue: string[] = [];
  private processing = false;
  private maxConcurrent = 3;
  private currentlyProcessing = 0;

  static getInstance(): ImageCacheManager {
    if (!ImageCacheManager.instance) {
      ImageCacheManager.instance = new ImageCacheManager();
    }
    return ImageCacheManager.instance;
  }

  async addToQueue(uris: string[], priority: 'low' | 'normal' | 'high' = 'normal') {
    const priorityWeight = { low: 0, normal: 1, high: 2 };
    const sortedUris = uris.sort(() => priorityWeight[priority] - 1);
    
    this.cacheQueue.push(...sortedUris);
    this.processQueue();
  }

  private async processQueue() {
    if (this.processing || this.cacheQueue.length === 0) return;
    
    this.processing = true;
    
    while (this.cacheQueue.length > 0 && this.currentlyProcessing < this.maxConcurrent) {
      const uri = this.cacheQueue.shift();
      if (uri) {
        this.currentlyProcessing++;
        this.preloadImage(uri).finally(() => {
          this.currentlyProcessing--;
        });
      }
    }
    
    this.processing = false;
  }

  private async preloadImage(uri: string) {
    if (Platform.OS === 'web') return;
    
    try {
      await Image.prefetch(uri, {
        cachePolicy: 'memory-disk'
      });
    } catch (error) {
      console.warn(`Failed to preload image: ${uri}`, error);
    }
  }

  async clearCache() {
    if (Platform.OS === 'web') return;
    
    try {
      await Image.clearMemoryCache();
      
      // Nettoyer le cache disque périodiquement
      if (Math.random() < 0.1) {
        await Image.clearDiskCache();
      }
    } catch (error) {
      console.warn('Cache cleanup failed:', error);
    }
  }
}

// Composant d'image lazy avec optimisations
export const LazyImage: React.FC<LazyImageProps> = ({
  source,
  style,
  contentFit = 'cover',
  placeholder,
  onLoad,
  onError,
  priority = 'normal',
  lazy = true,
  threshold = 100
}) => {
  const [isVisible, setIsVisible] = useState(!lazy);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const viewRef = useRef<View>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Intersection Observer pour le lazy loading (web uniquement)
  useEffect(() => {
    if (!lazy || Platform.OS !== 'web' || !viewRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: `${threshold}px` }
    );

    observer.observe(viewRef.current as any);
    observerRef.current = observer;

    return () => {
      observer.disconnect();
    };
  }, [lazy, threshold]);

  // Pour mobile, on utilise une approche différente
  useEffect(() => {
    if (!lazy || Platform.OS === 'web') return;
    
    // Sur mobile, on charge après un délai pour éviter de bloquer l'UI
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, priority === 'high' ? 0 : priority === 'normal' ? 100 : 300);

    return () => clearTimeout(timer);
  }, [lazy, priority]);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback((error: any) => {
    setHasError(true);
    onError?.(error);
  }, [onError]);

  if (!isVisible) {
    return (
      <View ref={viewRef} style={style}>
        {placeholder || <Skeleton width={style?.width || 200} height={style?.height || 200} />}
      </View>
    );
  }

  if (hasError) {
    return (
      <View style={[style, styles.errorContainer]}>
        {placeholder || <Skeleton width={style?.width || 200} height={style?.height || 200} />}
      </View>
    );
  }

  return (
    <View style={style}>
      {!isLoaded && (placeholder || <Skeleton width={style?.width || 200} height={style?.height || 200} />)}
      <Image
        source={source}
        style={[StyleSheet.absoluteFillObject, isLoaded ? { opacity: 1 } : { opacity: 0 }]}
        contentFit={contentFit}
        onLoad={handleLoad}
        onError={handleError}
        cachePolicy="memory-disk"
        priority={priority}
        transition={200}
      />
    </View>
  );
};

// Composant principal d'optimisation du cache
export const ImageCacheOptimizer: React.FC<ImageCacheOptimizerProps> = ({
  imageUris,
  priority = 'normal',
  maxCacheSize = 100,
  onCacheComplete
}) => {
  const cacheManager = ImageCacheManager.getInstance();
  const appStateRef = useRef(AppState.currentState);

  const preloadImages = useCallback(async () => {
    if (imageUris.length === 0) return;
    
    // Utiliser InteractionManager pour ne pas bloquer l'UI
    InteractionManager.runAfterInteractions(() => {
      cacheManager.addToQueue(imageUris, priority).then(() => {
        onCacheComplete?.();
      });
    });
  }, [imageUris, priority, cacheManager, onCacheComplete]);

  const handleAppStateChange = useCallback((nextAppState: AppStateStatus) => {
    if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
      // App revient au premier plan, on peut reprendre le cache
      preloadImages();
    } else if (nextAppState.match(/inactive|background/)) {
      // App passe en arrière-plan, on nettoie le cache si nécessaire
      if (imageUris.length > maxCacheSize) {
        cacheManager.clearCache();
      }
    }
    appStateRef.current = nextAppState;
  }, [preloadImages, imageUris.length, maxCacheSize, cacheManager]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [handleAppStateChange]);

  useEffect(() => {
    preloadImages();
  }, [preloadImages]);

  // Nettoyer le cache périodiquement
  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() < 0.05) { // 5% de chance toutes les minutes
        cacheManager.clearCache();
      }
    }, 60000); // Chaque minute

    return () => clearInterval(interval);
  }, [cacheManager]);

  return null; // Ce composant ne rend rien visuellement
};

// Hook pour optimiser les images
export const useImageOptimization = () => {
  const cacheManager = ImageCacheManager.getInstance();

  const preloadImages = useCallback((uris: string[], priority: 'low' | 'normal' | 'high' = 'normal') => {
    return cacheManager.addToQueue(uris, priority);
  }, [cacheManager]);

  const clearCache = useCallback(() => {
    return cacheManager.clearCache();
  }, [cacheManager]);

  const getOptimizedImageSize = useCallback((originalWidth: number, originalHeight: number, maxWidth: number = 400) => {
    const screenWidth = Dimensions.get('window').width;
    const targetWidth = Math.min(maxWidth, screenWidth);
    const aspectRatio = originalHeight / originalWidth;
    
    return {
      width: targetWidth,
      height: targetWidth * aspectRatio
    };
  }, []);

  return {
    preloadImages,
    clearCache,
    getOptimizedImageSize
  };
};

const styles = StyleSheet.create({
  errorContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

// Composant d'image responsive avec optimisations
export const ResponsiveImage: React.FC<{
  source: { uri: string };
  aspectRatio?: number;
  maxWidth?: number;
  style?: any;
  lazy?: boolean;
}> = ({ source, aspectRatio = 1, maxWidth, style, lazy = true }) => {
  const screenWidth = Dimensions.get('window').width;
  const imageWidth = maxWidth ? Math.min(maxWidth, screenWidth) : screenWidth;
  const imageHeight = imageWidth / aspectRatio;

  return (
    <LazyImage
      source={source}
      style={[{ width: imageWidth, height: imageHeight }, style]}
      contentFit="cover"
      lazy={lazy}
      priority="normal"
    />
  );
};

export default ImageCacheOptimizer;