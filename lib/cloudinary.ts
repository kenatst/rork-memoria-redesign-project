import { v2 as cloudinary } from 'cloudinary';
import { Platform } from 'react-native';

// Configuration Cloudinary avec les clés fournies
cloudinary.config({
  cloud_name: 'dh3cdbzxg',
  api_key: '139633441388393',
  api_secret: 'LYi2IArcaO9Dq6TI9dOvLa2AQ_o',
  secure: true
});

export interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  width: number;
  height: number;
  format: string;
  resource_type: string;
  created_at: string;
  bytes: number;
  url: string;
  folder?: string;
}

export interface CloudinaryUploadOptions {
  folder?: string;
  transformation?: string;
  tags?: string[];
  context?: Record<string, string>;
  public_id?: string;
  overwrite?: boolean;
  resource_type?: 'image' | 'video' | 'raw' | 'auto';
}

/**
 * Upload un fichier vers Cloudinary avec optimisation automatique
 * @param uri - URI du fichier local (mobile) ou File object (web)
 * @param options - Options d'upload Cloudinary
 * @returns Promise<CloudinaryUploadResult>
 */
export async function uploadToCloudinary(
  uri: string | File,
  options: CloudinaryUploadOptions = {}
): Promise<CloudinaryUploadResult> {
  try {
    console.log('🚀 [Cloudinary] Starting upload...', { uri: typeof uri === 'string' ? uri.substring(0, 50) + '...' : 'File object', options });
    
    const uploadOptions = {
      folder: options.folder || 'memoria',
      resource_type: options.resource_type || 'auto',
      transformation: options.transformation || 'q_auto,f_auto',
      tags: options.tags || ['memoria-app'],
      context: options.context,
      public_id: options.public_id,
      overwrite: options.overwrite ?? false,
      ...options
    };

    let result: CloudinaryUploadResult;
    
    if (Platform.OS === 'web' && uri instanceof File) {
      // Web: Upload File object
      const formData = new FormData();
      formData.append('file', uri);
      formData.append('upload_preset', 'memoria_preset'); // Vous devrez créer ce preset dans Cloudinary
      
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/dh3cdbzxg/${uploadOptions.resource_type}/upload`,
        {
          method: 'POST',
          body: formData
        }
      );
      
      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }
      
      result = await response.json();
    } else {
      // Mobile: Upload via URI
      result = await cloudinary.uploader.upload(uri as string, uploadOptions);
    }

    console.log('✅ [Cloudinary] Upload successful:', {
      url: result.secure_url,
      public_id: result.public_id,
      size: result.bytes,
      format: result.format
    });

    return result;
  } catch (error) {
    console.error('❌ [Cloudinary] Upload error:', error);
    throw new Error(`Cloudinary upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Génère une URL optimisée pour un asset Cloudinary
 * @param publicId - Public ID de l'asset
 * @param transformation - Transformations à appliquer
 * @returns URL optimisée
 */
export function getOptimizedUrl(
  publicId: string,
  transformation: string = 'q_auto,f_auto,w_800,h_600,c_fill'
): string {
  return cloudinary.url(publicId, {
    transformation,
    secure: true
  });
}

/**
 * Génère une URL signée avec expiration pour partage sécurisé
 * @param publicId - Public ID de l'asset
 * @param expiresAt - Timestamp d'expiration (défaut: 1h)
 * @returns URL signée
 */
export function getSignedUrl(
  publicId: string,
  expiresAt: number = Date.now() + 3600000 // 1 heure par défaut
): string {
  return cloudinary.utils.private_download_url(publicId, 'jpg', {
    expires_at: Math.floor(expiresAt / 1000)
  });
}

/**
 * Supprime un asset de Cloudinary
 * @param publicId - Public ID de l'asset à supprimer
 * @returns Promise<void>
 */
export async function deleteFromCloudinary(publicId: string): Promise<void> {
  try {
    console.log('🗑️ [Cloudinary] Deleting asset:', publicId);
    await cloudinary.uploader.destroy(publicId);
    console.log('✅ [Cloudinary] Asset deleted successfully');
  } catch (error) {
    console.error('❌ [Cloudinary] Delete error:', error);
    throw error;
  }
}

/**
 * Upload multiple files en batch
 * @param files - Array d'URIs ou Files
 * @param options - Options d'upload
 * @returns Promise<CloudinaryUploadResult[]>
 */
export async function uploadBatch(
  files: (string | File)[],
  options: CloudinaryUploadOptions = {}
): Promise<CloudinaryUploadResult[]> {
  console.log('📦 [Cloudinary] Starting batch upload:', files.length, 'files');
  
  const results = await Promise.allSettled(
    files.map((file, index) => 
      uploadToCloudinary(file, {
        ...options,
        public_id: options.public_id ? `${options.public_id}_${index}` : undefined
      })
    )
  );

  const successful = results
    .filter((result): result is PromiseFulfilledResult<CloudinaryUploadResult> => 
      result.status === 'fulfilled'
    )
    .map(result => result.value);

  const failed = results.filter(result => result.status === 'rejected');
  
  if (failed.length > 0) {
    console.warn('⚠️ [Cloudinary] Some uploads failed:', failed.length);
    failed.forEach((failure, index) => {
      console.error(`Failed upload ${index}:`, failure.reason);
    });
  }

  console.log('✅ [Cloudinary] Batch upload completed:', successful.length, 'successful,', failed.length, 'failed');
  return successful;
}

export default cloudinary;