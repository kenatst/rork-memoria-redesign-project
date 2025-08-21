import React, { useState } from 'react';
import { View, StyleSheet, Text, Pressable, Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { Camera, Upload, X } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Colors from '@/constants/colors';

interface ImagePickerComponentProps {
  currentImage?: string;
  onImageSelected: (uri: string) => void;
  onRemove?: () => void;
  size?: number;
  placeholder?: string;
}

export default function ImagePickerComponent({
  currentImage,
  onImageSelected,
  onRemove,
  size = 120,
  placeholder = "Ajouter une image"
}: ImagePickerComponentProps) {
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission requise', 'Nous avons besoin d\'accéder à votre galerie pour sélectionner des images.');
        return false;
      }
    }
    return true;
  };

  const pickImage = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    setIsLoading(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        onImageSelected(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Erreur', 'Impossible de sélectionner l\'image');
    } finally {
      setIsLoading(false);
    }
  };

  const takePhoto = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Non disponible', 'La prise de photo n\'est pas disponible sur le web. Utilisez l\'import depuis la galerie.');
      return;
    }

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission requise', 'Nous avons besoin d\'accéder à votre caméra.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        onImageSelected(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Erreur', 'Impossible de prendre la photo');
    } finally {
      setIsLoading(false);
    }
  };

  const showOptions = () => {
    Alert.alert(
      'Sélectionner une image',
      'Choisissez une option',
      [
        { text: 'Galerie', onPress: pickImage },
        ...(Platform.OS !== 'web' ? [{ text: 'Caméra', onPress: takePhoto }] : []),
        { text: 'Annuler', style: 'cancel' }
      ]
    );
  };

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {currentImage ? (
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: currentImage }}
            style={[styles.image, { width: size, height: size }]}
            contentFit="cover"
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.6)']}
            style={styles.overlay}
          />
          <View style={styles.actions}>
            <Pressable style={styles.actionButton} onPress={showOptions}>
              <Upload color="#FFFFFF" size={16} />
            </Pressable>
            {onRemove && (
              <Pressable style={[styles.actionButton, styles.removeButton]} onPress={onRemove}>
                <X color="#FFFFFF" size={16} />
              </Pressable>
            )}
          </View>
        </View>
      ) : (
        <Pressable style={styles.placeholder} onPress={showOptions} disabled={isLoading}>
          {Platform.OS !== 'web' ? (
            <BlurView intensity={20} style={styles.placeholderBlur}>
              <Camera color={Colors.palette.accentGold} size={32} />
              <Text style={styles.placeholderText}>{placeholder}</Text>
              {isLoading && <Text style={styles.loadingText}>Chargement...</Text>}
            </BlurView>
          ) : (
            <View style={[styles.placeholderBlur, styles.webBlur]}>
              <Camera color={Colors.palette.accentGold} size={32} />
              <Text style={styles.placeholderText}>{placeholder}</Text>
              {isLoading && <Text style={styles.loadingText}>Chargement...</Text>}
            </View>
          )}
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
  },
  imageContainer: {
    flex: 1,
    position: 'relative',
  },
  image: {
    borderRadius: 16,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  actions: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButton: {
    backgroundColor: 'rgba(255,0,0,0.6)',
  },
  placeholder: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,215,0,0.3)',
    borderStyle: 'dashed',
  },
  placeholderBlur: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    padding: 16,
  },
  webBlur: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    backdropFilter: 'blur(20px)',
  },
  placeholderText: {
    color: Colors.palette.taupeDeep,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  loadingText: {
    color: Colors.palette.taupe,
    fontSize: 10,
    fontStyle: 'italic',
  },
});