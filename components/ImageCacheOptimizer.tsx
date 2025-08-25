import React, { useEffect, useCallback } from 'react';
import { Image } from 'expo-image';
import { Platform } from 'react-native';

interface ImageCacheOptimizerProps {
  imageUris: string[];
  priority?: 'low' | 'normal' | 'high';
  maxCacheSize?: number;
}

export const ImageCacheOptimizer: React.FC<ImageCacheOptimizerProps> = ({
  imageUris,
  priority = 'normal',
  maxCacheSize = 100
}) => {
  const preloadImages = useCallback(async () => {
    if (Platform.OS === 'web') return;
    
    try {
      // Précharger les images par batch pour éviter la surcharge
      const batchSize = priority === 'high' ? 10 : priority === 'normal' ? 5 : 3;
      
      for (let i = 0; i < imageUris.length; i += batchSize) {
        const batch = imageUris.slice(i, i + batchSize);
        
        await Promise.allSettled(
          batch.map(uri => 
            Image.prefetch(uri, {
              cachePolicy: 'memory-disk'
            })
          )
        );
        
        // Petite pause entre les batches pour ne pas bloquer l'UI
        if (i + batchSize < imageUris.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    } catch (error) {
      console.warn('Image preloading failed:', error);
    }
  }, [imageUris, priority]);

  const clearOldCache = useCallback(async () => {
    if (Platform.OS === 'web') return;
    
    try {
      // Nettoyer le cache si nécessaire
      await Image.clearMemoryCache();
      
      // Optionnel: nettoyer le cache disque si nécessaire
      // Note: getCacheSize n'est pas disponible dans expo-image
      // On nettoie périodiquement le cache disque
      if (Math.random() < 0.1) { // 10% de chance de nettoyer
        await Image.clearDiskCache();
      }
    } catch (error) {
      console.warn('Cache cleanup failed:', error);
    }
  }, [maxCacheSize]);

  useEffect(() => {
    if (imageUris.length > 0) {
      // Nettoyer d'abord si nécessaire
      clearOldCache().then(() => {
        // Puis précharger les nouvelles images
        preloadImages();
      });
    }
  }, [imageUris, preloadImages, clearOldCache]);

  return null; // Ce composant ne rend rien visuellement
};

export default ImageCacheOptimizer;