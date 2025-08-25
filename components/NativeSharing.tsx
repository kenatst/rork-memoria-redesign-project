import { Platform, Alert, Share } from 'react-native';
import * as Sharing from 'expo-sharing';

interface ShareOptions {
  title?: string;
  message?: string;
  url?: string;
  imageUri?: string;
  mimeType?: string;
}

export class NativeSharing {
  static async shareText(options: ShareOptions): Promise<boolean> {
    try {
      if (Platform.OS === 'web') {
        if (navigator.share) {
          await navigator.share({
            title: options.title || '',
            text: options.message || '',
            url: options.url || '',
          });
          return true;
        } else {
          // Fallback for web browsers without native sharing
          const textToShare = `${options.title || ''}\n${options.message || ''}\n${options.url || ''}`.trim();
          await navigator.clipboard.writeText(textToShare);
          Alert.alert('Copié', 'Le contenu a été copié dans le presse-papiers');
          return true;
        }
      } else {
        // Native mobile sharing
        const result = await Share.share({
          title: options.title || '',
          message: options.message || '',
          url: options.url || '',
        });
        
        return result.action === Share.sharedAction;
      }
    } catch (error) {
      console.error('Share text error:', error);
      Alert.alert('Erreur', 'Impossible de partager le contenu');
      return false;
    }
  }

  static async shareImage(options: ShareOptions): Promise<boolean> {
    try {
      if (!options.imageUri) {
        throw new Error('Image URI is required');
      }

      if (Platform.OS === 'web') {
        // Web image sharing
        if (navigator.share) {
          const response = await fetch(options.imageUri);
          const blob = await response.blob();
          const file = new File([blob], 'image.jpg', { type: blob.type });
          
          await navigator.share({
            title: options.title,
            text: options.message,
            files: [file],
          });
          return true;
        } else {
          // Fallback: download image
          const link = document.createElement('a');
          link.href = options.imageUri;
          link.download = 'memoria-image.jpg';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          return true;
        }
      } else {
        // Native mobile image sharing
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(options.imageUri, {
            mimeType: options.mimeType || 'image/jpeg',
            dialogTitle: options.title,
          });
          return true;
        } else {
          // Fallback to system share
          await Share.share({
            title: options.title,
            message: options.message,
            url: options.imageUri,
          });
          return true;
        }
      }
    } catch (error) {
      console.error('Share image error:', error);
      Alert.alert('Erreur', 'Impossible de partager l\'image');
      return false;
    }
  }

  static async shareMultipleImages(imageUris: string[], options: ShareOptions): Promise<boolean> {
    try {
      if (Platform.OS === 'web') {
        // Web doesn't support multiple image sharing well, so we'll share URLs
        const urls = imageUris.join('\n');
        return await this.shareText({
          ...options,
          message: `${options.message || ''}\n\nImages:\n${urls}`,
        });
      } else {
        // For mobile, we can only share one at a time or create a combined share
        if (imageUris.length === 1) {
          return await this.shareImage({ ...options, imageUri: imageUris[0] });
        } else {
          // Share the first image with a message about multiple images
          return await this.shareImage({
            ...options,
            imageUri: imageUris[0],
            message: `${options.message || ''} (${imageUris.length} images)`,
          });
        }
      }
    } catch (error) {
      console.error('Share multiple images error:', error);
      Alert.alert('Erreur', 'Impossible de partager les images');
      return false;
    }
  }

  static async shareProfile(profileData: {
    name: string;
    albumCount: number;
    photoCount: number;
    profileUrl?: string;
  }): Promise<boolean> {
    const message = `Découvrez le profil de ${profileData.name} sur Memoria !\n\n📸 ${profileData.photoCount} photos\n📁 ${profileData.albumCount} albums`;
    
    return await this.shareText({
      title: `Profil de ${profileData.name} - Memoria`,
      message,
      url: profileData.profileUrl,
    });
  }

  static async shareAlbum(albumData: {
    name: string;
    photoCount: number;
    coverImage?: string;
    albumUrl?: string;
  }): Promise<boolean> {
    const message = `Découvrez l'album "${albumData.name}" sur Memoria !\n\n📸 ${albumData.photoCount} photos à explorer`;
    
    if (albumData.coverImage) {
      return await this.shareImage({
        title: `Album: ${albumData.name}`,
        message,
        imageUri: albumData.coverImage,
      });
    } else {
      return await this.shareText({
        title: `Album: ${albumData.name}`,
        message,
        url: albumData.albumUrl,
      });
    }
  }
}

export default NativeSharing;