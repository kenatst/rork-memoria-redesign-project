import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, Text, ScrollView, Pressable, Platform, Dimensions, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { ArrowLeft, Camera, Plus } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import Colors from '@/constants/colors';
import { useAppState } from '@/providers/AppStateProvider';

const { width: screenWidth } = Dimensions.get('window');

export default function AlbumDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { albums, addPhotoToAlbum } = useAppState();

  const album = useMemo(() => albums.find(a => a.id === id), [albums, id]);

  useEffect(() => {
    if (!album) return;
  }, [album]);

  const addFromLibrary = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission requise', 'Autorisez l\'accès à la galerie pour ajouter des photos.');
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        allowsMultipleSelection: true,
        quality: 0.9,
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        selectionLimit: 10,
      });
      if (res.canceled) return;
      const assets = (res as any).assets ?? [];
      for (const asset of assets) {
        if (asset.uri && album) {
          await addPhotoToAlbum(album.id, asset.uri);
        }
      }
    } catch (e) {
      Alert.alert('Erreur', 'Impossible d\'ajouter les photos.');
    }
  };

  if (!album) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#000000', '#0B0B0D', '#131417']} style={StyleSheet.absoluteFillObject} />
        <Text style={styles.loadingText}>Album introuvable</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#000000', '#0B0B0D', '#131417']} style={StyleSheet.absoluteFillObject} />

      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()} testID="back-btn">
          <ArrowLeft color="#FFD700" size={24} />
        </Pressable>
        <Text style={styles.headerTitle}>{album.name}</Text>
        <Pressable style={styles.addBtn} onPress={addFromLibrary} testID="add-photos">
          <Plus color="#000" size={20} />
          <Text style={styles.addText}>Ajouter des photos</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
        {album.photos.length === 0 ? (
          <View style={styles.empty}>
            <Camera color={Colors.palette.taupe} size={48} />
            <Text style={styles.emptyText}>Aucune photo pour le moment</Text>
            <Pressable style={styles.primaryBtn} onPress={addFromLibrary} testID="empty-add">
              <Text style={styles.primaryText}>Importer depuis la galerie</Text>
            </Pressable>
          </View>
        ) : (
          album.photos.map((uri, idx) => (
            <Pressable key={`${uri}-${idx}`} style={styles.photoCard} testID={`photo-${idx}`} onPress={() => router.push(`/photo/${idx}`)}>
              <Image source={{ uri }} style={styles.photo} contentFit="cover" />
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  loadingText: { color: '#fff', textAlign: 'center', marginTop: '50%' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFD700', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12 },
  addText: { color: '#000', fontWeight: '800' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 2, padding: 2, paddingBottom: 120 },
  photoCard: { width: (screenWidth - 8) / 3, height: (screenWidth - 8) / 3, backgroundColor: 'rgba(255,255,255,0.06)' },
  photo: { width: '100%', height: '100%' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingTop: 80 },
  emptyText: { color: Colors.palette.taupe, fontSize: 14 },
  primaryBtn: { backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12 },
  primaryText: { color: '#fff', fontWeight: '700' },
});