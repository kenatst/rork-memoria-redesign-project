import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, Text, ScrollView, Pressable, Platform, Dimensions, Alert, Modal } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { ArrowLeft, Camera, Plus, Search, MoreVertical, Share2, Download, Settings } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useAppState } from '@/providers/AppStateProvider';
import ImagePickerComponent from '@/components/ImagePicker';
import AdvancedSearch from '@/components/AdvancedSearch';
import BatchActions from '@/components/BatchActions';

const { width: screenWidth } = Dimensions.get('window');

export default function AlbumDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { 
    albums, 
    addPhotoToAlbum, 
    updateAlbumCover, 
    selectedPhotos, 
    batchSelectPhotos, 
    clearSelection,
    exportAlbum 
  } = useAppState();

  const album = useMemo(() => albums.find(a => a.id === id), [albums, id]);
  const [showSearch, setShowSearch] = useState<boolean>(false);
  const [showBatchActions, setShowBatchActions] = useState<boolean>(false);
  const [showChangeCover, setShowChangeCover] = useState<boolean>(false);
  const [showOptions, setShowOptions] = useState<boolean>(false);
  const [selectionMode, setSelectionMode] = useState<boolean>(false);

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
        selectionLimit: 20,
      });
      if (res.canceled) return;
      const assets = (res as any).assets ?? [];
      for (const asset of assets) {
        if (asset.uri && album) {
          await addPhotoToAlbum(album.id, asset.uri);
        }
      }
      Alert.alert('Succès', `${assets.length} photo(s) ajoutée(s) à l'album`);
      
      // Haptic feedback
      if (Platform.OS !== 'web') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (e) {
      Alert.alert('Erreur', 'Impossible d\'ajouter les photos.');
    }
  };

  const handlePhotoPress = (uri: string, idx: number) => {
    if (selectionMode) {
      const photoId = `${album?.id}-${idx}`;
      batchSelectPhotos([photoId]);
      
      // Haptic feedback
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } else {
      router.push(`/photo/${idx}`);
    }
  };

  const toggleSelectionMode = () => {
    if (selectionMode) {
      clearSelection();
    }
    setSelectionMode(!selectionMode);
    
    // Haptic feedback
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const handleExportAlbum = async () => {
    if (!album) return;
    
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission requise', 'Autorisez l\'accès à la galerie pour exporter l\'album.');
        return;
      }
      
      await exportAlbum(album.id);
      Alert.alert('Export terminé', `L'album "${album.name}" a été exporté vers votre galerie.`);
      
      // Haptic feedback
      if (Platform.OS !== 'web') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'exporter l\'album.');
    }
  };

  const handleSearchResults = (results: { albums: any[]; photos: any[] }) => {
    console.log('Search results:', results);
    setShowSearch(false);
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
        <View style={styles.headerActions}>
          <Pressable style={styles.actionBtn} onPress={() => setShowSearch(true)} testID="search-btn">
            <Search color="#FFD700" size={20} />
          </Pressable>
          <Pressable style={styles.actionBtn} onPress={toggleSelectionMode} testID="select-btn">
            <Text style={[styles.actionText, selectionMode && styles.activeActionText]}>
              {selectionMode ? 'Annuler' : 'Sélectionner'}
            </Text>
          </Pressable>
          <Pressable style={styles.actionBtn} onPress={() => setShowOptions(true)} testID="options-btn">
            <MoreVertical color="#FFD700" size={20} />
          </Pressable>
        </View>
      </View>

      {/* Selection Bar */}
      {selectionMode && selectedPhotos.length > 0 && (
        <View style={styles.selectionBar}>
          <Text style={styles.selectionText}>{selectedPhotos.length} sélectionnée(s)</Text>
          <Pressable 
            style={styles.batchActionBtn} 
            onPress={() => setShowBatchActions(true)}
            testID="batch-actions-btn"
          >
            <Text style={styles.batchActionText}>Actions</Text>
          </Pressable>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
        {album.photos.length === 0 ? (
          <View style={styles.empty}>
            <Camera color={Colors.palette.taupe} size={48} />
            <Text style={styles.emptyText}>Aucune photo pour le moment</Text>
            <View style={styles.emptyActions}>
              <Pressable style={styles.primaryBtn} onPress={addFromLibrary} testID="empty-add">
                <Text style={styles.primaryText}>Importer depuis la galerie</Text>
              </Pressable>
              <Pressable style={styles.secondaryBtn} onPress={() => router.push('/(tabs)/capture')} testID="empty-camera">
                <Camera color="#FFD700" size={16} />
                <Text style={styles.secondaryText}>Prendre une photo</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          album.photos.map((uri, idx) => {
            const photoId = `${album.id}-${idx}`;
            const isSelected = selectedPhotos.includes(photoId);
            return (
              <Pressable 
                key={`${uri}-${idx}`} 
                style={[styles.photoCard, isSelected && styles.selectedPhoto]} 
                testID={`photo-${idx}`} 
                onPress={() => handlePhotoPress(uri, idx)}
                onLongPress={() => {
                  if (!selectionMode) {
                    setSelectionMode(true);
                  }
                  batchSelectPhotos([photoId]);
                  
                  // Haptic feedback
                  if (Platform.OS !== 'web') {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                  }
                }}
              >
                <Image source={{ uri }} style={styles.photo} contentFit="cover" />
                {selectionMode && (
                  <View style={[styles.selectionOverlay, isSelected && styles.selectedOverlay]}>
                    {isSelected && (
                      <View style={styles.checkmark}>
                        <Text style={styles.checkmarkText}>✓</Text>
                      </View>
                    )}
                  </View>
                )}
              </Pressable>
            );
          })
        )}
      </ScrollView>

      {/* Floating Add Button */}
      {!selectionMode && (
        <Pressable style={styles.floatingAddBtn} onPress={addFromLibrary} testID="floating-add">
          <LinearGradient colors={['#FFD700', '#FFA500']} style={styles.floatingBtnGradient}>
            <Plus color="#000" size={24} />
          </LinearGradient>
        </Pressable>
      )}

      {/* Search Modal */}
      <Modal visible={showSearch} animationType="slide" onRequestClose={() => setShowSearch(false)}>
        <AdvancedSearch onClose={() => setShowSearch(false)} onResults={handleSearchResults} />
      </Modal>

      {/* Batch Actions Modal */}
      <BatchActions 
        visible={showBatchActions} 
        onClose={() => setShowBatchActions(false)} 
        selectedPhotos={selectedPhotos} 
      />

      {/* Options Modal */}
      <Modal visible={showOptions} transparent animationType="slide" onRequestClose={() => setShowOptions(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.optionsModal}>
            <Text style={styles.optionsTitle}>Options de l'album</Text>
            
            <Pressable style={styles.optionItem} onPress={() => { setShowOptions(false); setShowChangeCover(true); }}>
              <Camera color="#FFD700" size={20} />
              <Text style={styles.optionText}>Changer la couverture</Text>
            </Pressable>
            
            <Pressable style={styles.optionItem} onPress={() => { setShowOptions(false); handleExportAlbum(); }}>
              <Download color="#4CAF50" size={20} />
              <Text style={styles.optionText}>Exporter l'album</Text>
            </Pressable>
            
            <Pressable style={styles.optionItem}>
              <Share2 color="#2196F3" size={20} />
              <Text style={styles.optionText}>Partager l'album</Text>
            </Pressable>
            
            <Pressable style={styles.optionItem}>
              <Settings color={Colors.palette.taupe} size={20} />
              <Text style={styles.optionText}>Paramètres</Text>
            </Pressable>
            
            <Pressable style={styles.optionCancel} onPress={() => setShowOptions(false)}>
              <Text style={styles.optionCancelText}>Annuler</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Change Cover Modal */}
      <Modal visible={showChangeCover} transparent animationType="slide" onRequestClose={() => setShowChangeCover(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.changeCoverModal}>
            <Text style={styles.changeCoverTitle}>Changer la couverture</Text>
            <Text style={styles.changeCoverSubtitle}>Sélectionnez une nouvelle image de couverture</Text>
            
            <View style={styles.coverPickerContainer}>
              <ImagePickerComponent
                currentImage={album?.coverImage}
                onImageSelected={(uri) => {
                  if (album) {
                    updateAlbumCover(album.id, uri);
                    setShowChangeCover(false);
                    
                    // Haptic feedback
                    if (Platform.OS !== 'web') {
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    }
                  }
                }}
                size={200}
                placeholder="Sélectionner une couverture"
              />
            </View>
            
            <Pressable style={styles.changeCoverCancel} onPress={() => setShowChangeCover(false)}>
              <Text style={styles.changeCoverCancelText}>Annuler</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  loadingText: { color: '#fff', textAlign: 'center', marginTop: '50%' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '800', flex: 1, marginLeft: 12 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actionBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.1)' },
  actionText: { color: '#FFD700', fontSize: 12, fontWeight: '700' },
  activeActionText: { color: '#FF4444' },
  selectionBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: 'rgba(255,215,0,0.1)' },
  selectionText: { color: '#FFD700', fontSize: 14, fontWeight: '700' },
  batchActionBtn: { backgroundColor: '#FFD700', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  batchActionText: { color: '#000', fontSize: 14, fontWeight: '800' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 2, padding: 2, paddingBottom: 120 },
  photoCard: { width: (screenWidth - 8) / 3, height: (screenWidth - 8) / 3, backgroundColor: 'rgba(255,255,255,0.06)', position: 'relative' },
  selectedPhoto: { borderWidth: 3, borderColor: '#FFD700' },
  photo: { width: '100%', height: '100%' },
  selectionOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center' },
  selectedOverlay: { backgroundColor: 'rgba(255,215,0,0.3)' },
  checkmark: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#FFD700', alignItems: 'center', justifyContent: 'center' },
  checkmarkText: { color: '#000', fontSize: 14, fontWeight: '800' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingTop: 80 },
  emptyText: { color: Colors.palette.taupe, fontSize: 14 },
  emptyActions: { gap: 12, alignItems: 'center' },
  primaryBtn: { backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12 },
  primaryText: { color: '#fff', fontWeight: '700' },
  secondaryBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,215,0,0.1)', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12 },
  secondaryText: { color: '#FFD700', fontWeight: '700' },
  floatingAddBtn: { position: 'absolute', bottom: 20, right: 20, borderRadius: 28, overflow: 'hidden', elevation: 8, shadowColor: '#FFD700', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  floatingBtnGradient: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  optionsModal: { backgroundColor: '#0B0B0D', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, gap: 4 },
  optionsTitle: { color: '#fff', fontSize: 18, fontWeight: '800', textAlign: 'center', marginBottom: 16 },
  optionItem: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 16, paddingHorizontal: 16, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.06)' },
  optionText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  optionCancel: { marginTop: 12, paddingVertical: 16, alignItems: 'center' },
  optionCancelText: { color: Colors.palette.taupe, fontSize: 16, fontWeight: '600' },
  changeCoverModal: { backgroundColor: '#0B0B0D', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, alignItems: 'center', gap: 16 },
  changeCoverTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  changeCoverSubtitle: { color: Colors.palette.taupe, fontSize: 14, textAlign: 'center' },
  coverPickerContainer: { marginVertical: 16 },
  changeCoverCancel: { marginTop: 16, paddingVertical: 12, paddingHorizontal: 24 },
  changeCoverCancelText: { color: Colors.palette.taupe, fontSize: 16, fontWeight: '600' },
});