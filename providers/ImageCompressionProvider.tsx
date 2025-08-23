import React, { useCallback, useMemo } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import * as ImageManipulator from 'expo-image-manipulator';
import { Platform } from 'react-native';
import { uploadToCloudinary, uploadBatch, CloudinaryUploadResult, CloudinaryUploadOptions } from '@/lib/cloudinary';

interface CompressionSettings {
  maxWidth: number;
  maxHeight: number;
  quality: number;
  format: 'jpeg' | 'png' | 'webp';
  enableAutoResize: boolean;
  enableQualityOptimization: boolean;
}

interface CompressionResult {
  uri: string;
  originalSize?: number;
  compressedSize?: number;
  compressionRatio?: number;
  width: number;
  height: number;
}

interface ImageCompressionContextValue {
  compressImage: (uri: string, settings?: Partial<CompressionSettings>) => Promise<CompressionResult>;
  compressMultipleImages: (uris: string[], settings?: Partial<CompressionSettings>) => Promise<CompressionResult[]>;
  getOptimalSettings: (width: number, height: number, fileSize?: number) => CompressionSettings;
  defaultSettings: CompressionSettings;
  isCompressing: boolean;
  // Nouvelles méthodes Cloudinary
  compressAndUpload: (uri: string, cloudinaryOptions?: CloudinaryUploadOptions, compressionSettings?: Partial<CompressionSettings>) => Promise<CloudinaryUploadResult>;
  compressAndUploadBatch: (uris: string[], cloudinaryOptions?: CloudinaryUploadOptions, compressionSettings?: Partial<CompressionSettings>) => Promise<CloudinaryUploadResult[]>;
  uploadToCloud: (uri: string, options?: CloudinaryUploadOptions) => Promise<CloudinaryUploadResult>;
  uploadBatchToCloud: (uris: string[], options?: CloudinaryUploadOptions) => Promise<CloudinaryUploadResult[]>;
}

const DEFAULT_SETTINGS: CompressionSettings = {
  maxWidth: 1920,
  maxHeight: 1080,
  quality: 0.8,
  format: 'jpeg',
  enableAutoResize: true,
  enableQualityOptimization: true,
};

export const [ImageCompressionProvider, useImageCompression] = createContextHook<ImageCompressionContextValue>(() => {
  const [isCompressing, setIsCompressing] = React.useState<boolean>(false);

  const getOptimalSettings = useCallback((width: number, height: number, fileSize?: number): CompressionSettings => {
    const settings = { ...DEFAULT_SETTINGS };
    
    // Adjust based on image dimensions
    if (width > 3000 || height > 3000) {
      settings.maxWidth = 2048;
      settings.maxHeight = 2048;
      settings.quality = 0.7;
    } else if (width > 2000 || height > 2000) {
      settings.maxWidth = 1920;
      settings.maxHeight = 1080;
      settings.quality = 0.75;
    } else if (width < 800 && height < 800) {
      settings.maxWidth = width;
      settings.maxHeight = height;
      settings.quality = 0.9;
    }
    
    // Adjust based on file size (if available)
    if (fileSize) {
      const sizeMB = fileSize / (1024 * 1024);
      if (sizeMB > 10) {
        settings.quality = 0.6;
      } else if (sizeMB > 5) {
        settings.quality = 0.7;
      } else if (sizeMB < 1) {
        settings.quality = 0.9;
      }
    }
    
    // Platform-specific optimizations
    if (Platform.OS === 'web') {
      settings.format = 'webp';
    }
    
    return settings;
  }, []);

  const getImageInfo = async (uri: string): Promise<{ width: number; height: number; size?: number }> => {
    try {
      if (Platform.OS === 'web') {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => {
            resolve({
              width: img.naturalWidth,
              height: img.naturalHeight,
            });
          };
          img.onerror = reject;
          img.src = uri;
        });
      } else {
        // For native platforms, we'll use ImageManipulator to get info
        const result = await ImageManipulator.manipulateAsync(uri, [], { compress: 1 });
        return {
          width: result.width,
          height: result.height,
        };
      }
    } catch (error) {
      console.error('Failed to get image info:', error);
      return { width: 1920, height: 1080 }; // Fallback
    }
  };

  const compressImage = useCallback(async (uri: string, customSettings?: Partial<CompressionSettings>): Promise<CompressionResult> => {
    try {
      console.log('Starting image compression for:', uri);
      
      // Get image dimensions
      const imageInfo = await getImageInfo(uri);
      
      // Determine optimal settings
      const optimalSettings = getOptimalSettings(imageInfo.width, imageInfo.height, imageInfo.size);
      const settings = { ...optimalSettings, ...customSettings };
      
      console.log('Compression settings:', settings);
      
      // Prepare manipulations
      const manipulations: ImageManipulator.Action[] = [];
      
      // Resize if needed and auto-resize is enabled
      if (settings.enableAutoResize) {
        const needsResize = imageInfo.width > settings.maxWidth || imageInfo.height > settings.maxHeight;
        
        if (needsResize) {
          // Calculate new dimensions maintaining aspect ratio
          const aspectRatio = imageInfo.width / imageInfo.height;
          let newWidth = settings.maxWidth;
          let newHeight = settings.maxHeight;
          
          if (aspectRatio > 1) {
            // Landscape
            newHeight = newWidth / aspectRatio;
            if (newHeight > settings.maxHeight) {
              newHeight = settings.maxHeight;
              newWidth = newHeight * aspectRatio;
            }
          } else {
            // Portrait or square
            newWidth = newHeight * aspectRatio;
            if (newWidth > settings.maxWidth) {
              newWidth = settings.maxWidth;
              newHeight = newWidth / aspectRatio;
            }
          }
          
          manipulations.push({
            resize: {
              width: Math.round(newWidth),
              height: Math.round(newHeight),
            },
          });
        }
      }
      
      // Apply compression
      const result = await ImageManipulator.manipulateAsync(
        uri,
        manipulations,
        {
          compress: settings.quality,
          format: settings.format === 'png' ? ImageManipulator.SaveFormat.PNG : ImageManipulator.SaveFormat.JPEG,
        }
      );
      
      console.log('Compression completed:', {
        original: `${imageInfo.width}x${imageInfo.height}`,
        compressed: `${result.width}x${result.height}`,
        quality: settings.quality,
      });
      
      return {
        uri: result.uri,
        width: result.width,
        height: result.height,
        originalSize: imageInfo.size,
        compressedSize: undefined, // Would need additional API to get file size
        compressionRatio: imageInfo.size ? undefined : undefined,
      };
    } catch (error) {
      console.error('Image compression failed:', error);
      // Return original if compression fails
      const imageInfo = await getImageInfo(uri);
      return {
        uri,
        width: imageInfo.width,
        height: imageInfo.height,
      };
    }
  }, [getOptimalSettings]);

  const compressMultipleImages = useCallback(async (
    uris: string[], 
    settings?: Partial<CompressionSettings>
  ): Promise<CompressionResult[]> => {
    setIsCompressing(true);
    
    try {
      console.log(`Starting batch compression of ${uris.length} images`);
      
      const results: CompressionResult[] = [];
      
      // Process images in batches to avoid memory issues
      const batchSize = 3;
      for (let i = 0; i < uris.length; i += batchSize) {
        const batch = uris.slice(i, i + batchSize);
        const batchPromises = batch.map(uri => compressImage(uri, settings));
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
        
        // Small delay between batches
        if (i + batchSize < uris.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      console.log(`Batch compression completed: ${results.length} images processed`);
      return results;
    } catch (error) {
      console.error('Batch compression failed:', error);
      throw error;
    } finally {
      setIsCompressing(false);
    }
  }, [compressImage]);

  // Nouvelle méthode : Compression + Upload vers Cloudinary
  const compressAndUpload = useCallback(async (
    uri: string,
    cloudinaryOptions?: CloudinaryUploadOptions,
    compressionSettings?: Partial<CompressionSettings>
  ): Promise<CloudinaryUploadResult> => {
    try {
      console.log('🔄 [ImageCompression] Starting compress and upload for:', uri);
      setIsCompressing(true);
      
      // Étape 1: Compression locale
      const compressedResult = await compressImage(uri, compressionSettings);
      console.log('✅ [ImageCompression] Compression completed, uploading to Cloudinary...');
      
      // Étape 2: Upload vers Cloudinary
      const uploadResult = await uploadToCloudinary(compressedResult.uri, {
        folder: 'memoria/compressed',
        tags: ['compressed', 'memoria-app'],
        context: {
          original_width: compressedResult.width.toString(),
          original_height: compressedResult.height.toString(),
          compression_applied: 'true'
        },
        ...cloudinaryOptions
      });
      
      console.log('🎉 [ImageCompression] Compress and upload completed successfully');
      return uploadResult;
    } catch (error) {
      console.error('❌ [ImageCompression] Compress and upload failed:', error);
      throw error;
    } finally {
      setIsCompressing(false);
    }
  }, [compressImage]);

  // Nouvelle méthode : Compression + Upload batch
  const compressAndUploadBatch = useCallback(async (
    uris: string[],
    cloudinaryOptions?: CloudinaryUploadOptions,
    compressionSettings?: Partial<CompressionSettings>
  ): Promise<CloudinaryUploadResult[]> => {
    try {
      console.log('📦 [ImageCompression] Starting batch compress and upload for:', uris.length, 'files');
      setIsCompressing(true);
      
      // Étape 1: Compression batch
      const compressedResults = await compressMultipleImages(uris, compressionSettings);
      console.log('✅ [ImageCompression] Batch compression completed, uploading to Cloudinary...');
      
      // Étape 2: Upload batch vers Cloudinary
      const compressedUris = compressedResults.map(result => result.uri);
      const uploadResults = await uploadBatch(compressedUris, {
        folder: 'memoria/compressed',
        tags: ['compressed', 'memoria-app', 'batch'],
        ...cloudinaryOptions
      });
      
      console.log('🎉 [ImageCompression] Batch compress and upload completed successfully');
      return uploadResults;
    } catch (error) {
      console.error('❌ [ImageCompression] Batch compress and upload failed:', error);
      throw error;
    } finally {
      setIsCompressing(false);
    }
  }, [compressMultipleImages]);

  // Méthode directe d'upload sans compression
  const uploadToCloud = useCallback(async (
    uri: string,
    options?: CloudinaryUploadOptions
  ): Promise<CloudinaryUploadResult> => {
    try {
      console.log('☁️ [ImageCompression] Direct upload to Cloudinary:', uri);
      setIsCompressing(true);
      
      const result = await uploadToCloudinary(uri, {
        folder: 'memoria/original',
        tags: ['original', 'memoria-app'],
        ...options
      });
      
      console.log('✅ [ImageCompression] Direct upload completed');
      return result;
    } catch (error) {
      console.error('❌ [ImageCompression] Direct upload failed:', error);
      throw error;
    } finally {
      setIsCompressing(false);
    }
  }, []);

  // Méthode directe d'upload batch sans compression
  const uploadBatchToCloud = useCallback(async (
    uris: string[],
    options?: CloudinaryUploadOptions
  ): Promise<CloudinaryUploadResult[]> => {
    try {
      console.log('📦☁️ [ImageCompression] Direct batch upload to Cloudinary:', uris.length, 'files');
      setIsCompressing(true);
      
      const results = await uploadBatch(uris, {
        folder: 'memoria/original',
        tags: ['original', 'memoria-app', 'batch'],
        ...options
      });
      
      console.log('✅ [ImageCompression] Direct batch upload completed');
      return results;
    } catch (error) {
      console.error('❌ [ImageCompression] Direct batch upload failed:', error);
      throw error;
    } finally {
      setIsCompressing(false);
    }
  }, []);

  return useMemo(() => ({
    compressImage,
    compressMultipleImages,
    getOptimalSettings,
    defaultSettings: DEFAULT_SETTINGS,
    isCompressing,
    // Nouvelles méthodes Cloudinary
    compressAndUpload,
    compressAndUploadBatch,
    uploadToCloud,
    uploadBatchToCloud,
  }), [compressImage, compressMultipleImages, getOptimalSettings, isCompressing, compressAndUpload, compressAndUploadBatch, uploadToCloud, uploadBatchToCloud]);
});