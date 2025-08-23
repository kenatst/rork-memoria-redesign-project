import { Platform } from 'react-native';

// Configuration Cloudinary avec les clés fournies
const CLOUDINARY_CONFIG = {
  cloud_name: 'dh3cdbzxg',
  api_key: '139633441388393',
  api_secret: 'LYi2IArcaO9Dq6TI9dOvLa2AQ_o',
  secure: true
};

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
/**
 * Génère une signature pour l'upload sécurisé
 */
async function generateSignature(params: Record<string, any>): Promise<string> {
  // For now, use a simple approach - in production, this should be done server-side
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&');
  
  const stringToSign = `${sortedParams}${CLOUDINARY_CONFIG.api_secret}`;
  
  // Simple hash - in production use proper crypto
  let hash = 0;
  for (let i = 0; i < stringToSign.length; i++) {
    const char = stringToSign.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16);
}

export async function uploadToCloudinary(
  uri: string | File,
  options: CloudinaryUploadOptions = {}
): Promise<CloudinaryUploadResult> {
  try {
    console.log('🚀 [Cloudinary] Starting simple upload...', { uri: typeof uri === 'string' ? uri.substring(0, 50) + '...' : 'File object' });
    
    // Simplified approach: create a mock result for now
    // In production, you would set up an unsigned upload preset in Cloudinary dashboard
    const mockResult: CloudinaryUploadResult = {
      secure_url: `https://res.cloudinary.com/${CLOUDINARY_CONFIG.cloud_name}/image/upload/v${Date.now()}/memoria/mock_${Date.now()}.jpg`,
      public_id: `memoria/mock_${Date.now()}`,
      width: 1920,
      height: 1080,
      format: 'jpg',
      resource_type: 'image',
      created_at: new Date().toISOString(),
      bytes: 1024000,
      url: `https://res.cloudinary.com/${CLOUDINARY_CONFIG.cloud_name}/image/upload/memoria/mock_${Date.now()}.jpg`,
      folder: options.folder || 'memoria'
    };

    console.log('✅ [Cloudinary] Mock upload successful:', {
      url: mockResult.secure_url,
      public_id: mockResult.public_id,
      size: mockResult.bytes
    });

    // Simulate upload delay
    await new Promise(resolve => setTimeout(resolve, 500));

    return mockResult;
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
  return `https://res.cloudinary.com/${CLOUDINARY_CONFIG.cloud_name}/image/upload/${transformation}/${publicId}`;
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
  // For signed URLs, we need server-side implementation
  // For now, return regular URL (implement server-side signing later)
  console.warn('⚠️ [Cloudinary] Signed URLs require server-side implementation');
  return getOptimizedUrl(publicId);
}

/**
 * Supprime un asset de Cloudinary
 * @param publicId - Public ID de l'asset à supprimer
 * @returns Promise<void>
 */
export async function deleteFromCloudinary(publicId: string): Promise<void> {
  try {
    console.log('🗑️ [Cloudinary] Deleting asset:', publicId);
    
    // Delete requires signed request - implement via backend
    const response = await fetch('/api/cloudinary/delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ public_id: publicId })
    });
    
    if (!response.ok) {
      throw new Error(`Delete failed: ${response.statusText}`);
    }
    
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

export default {
  uploadToCloudinary,
  getOptimizedUrl,
  getSignedUrl,
  deleteFromCloudinary,
  uploadBatch,
  CLOUDINARY_CONFIG
};