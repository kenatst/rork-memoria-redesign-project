import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { View, StyleSheet, Text, ScrollView, Pressable, Platform, Dimensions, Alert, Modal, TextInput, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { AlbumExport } from '@/components/AlbumExport';
import { ArrowLeft, Camera, Plus, Search, MoreVertical, Share2, Download, Settings, Star, MessageCircle, Trash2, Send, Clapperboard, Link2, XCircle } from 'lucide-react-native';
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
  const params = useLocalSearchParams<{ id: string }>();
  const id = params.id;
  const insets = useSafeAreaInsets();
  const { 
    albums, 
    addPhotoToAlbum, 
    updateAlbumCover, 
    selectedPhotos, 
    batchSelectPhotos, 
    clearSelection,
    exportAlbum,
    comments,
    addComment,
    deleteComment,
    favoriteAlbums,
    toggleFavoriteAlbum,
    setAlbumCoverTransform,
    incrementAlbumView,
    createTemporaryShareLink,
    revokeShareLink
  } = useAppState();

  const album = useMemo(() => albums.find(a => a.id === id), [albums, id]);
  const [showSearch, setShowSearch] = useState<boolean>(false);
  const [showBatchActions, setShowBatchActions] = useState<boolean>(false);
  const [showChangeCover, setShowChangeCover] = useState<boolean>(false);
  const [showOptions, setShowOptions] = useState<boolean>(false);
  const [showExport, setShowExport] = useState<boolean>(false);
  const [selectionMode, setSelectionMode] = useState<boolean>(false);
  const [showAlbumComments, setShowAlbumComments] = useState<boolean>(false);
  const [albumCommentText, setAlbumCommentText] = useState<string>('');

  const hasIncrementedRef = useRef<boolean>(false);
  useEffect(() => {
    if (!album || hasIncrementedRef.current) return;
    hasIncrementedRef.current = true;
    incrementAlbumView(album.id);
  }, [album?.id]);

  const albumComments = useMemo(() => comments.filter(c => c.albumId === id), [comments, id]);
  const isFavorite = useMemo(() => Boolean(album && favoriteAlbums.includes(album.id)), [favoriteAlbums, album]);

  const handleToggleFavorite = useCallback(() => {
    if (!album) return;
    toggleFavoriteAlbum(album.id);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [album, toggleFavoriteAlbum]);

  const handleAddAlbumComment = useCallback(() => {
    if (!album) return;
    if (!albumCommentText.trim()) return;
    addComment(albumCommentText.trim(), undefined, album.id);
    setAlbumCommentText('');
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [albumCommentText, album, addComment]);

  const handleDeleteAlbumComment = useCallback((commentId: string) => {
    deleteComment(commentId);
  }, [deleteComment]);

  const [importing, setImporting] = useState<boolean>(false);

  const addFromLibrary = async () => {
    if (!album) {
      Alert.alert('Erreur', 'Album non trouvé');
      return;
    }

    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission requise', "Autorisez l'accès à la galerie pour ajouter des photos.");
        return;
      }
      
      const res = await ImagePicker.launchImageLibraryAsync({
        allowsMultipleSelection: true,
        quality: 0.9,
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        selectionLimit: 20,
      });
      
      if (res.canceled || !res.assets || res.assets.length === 0) {
        console.log('Selection cancelled or no assets');
        return;
      }
      
      console.log(`Selected ${res.assets.length} photos for import`);
      setImporting(true);
      
      let successCount = 0;
      let errorCount = 0;
      
      // Process photos in parallel for better performance
      const importPromises = res.assets.map(async (asset, index) => {
        try {
          if (asset.uri) {
            console.log(`Importing photo ${index + 1}/${res.assets.length}: ${asset.uri}`);
            await addPhotoToAlbum(album.id, asset.uri);
            successCount++;
            console.log(`Successfully imported photo ${index + 1}`);
          } else {
            console.warn(`Photo ${index + 1} has no URI`);
            errorCount++;
          }
        } catch (error) {
          console.error(`Failed to import photo ${index + 1}:`, error);
          errorCount++;
        }
      });
      
      await Promise.all(importPromises);
      setImporting(false);
      
      if (successCount > 0) {
        Alert.alert(
          'Import terminé', 
          `${successCount} photo(s) ajoutée(s) à l'album${errorCount > 0 ? ` (${errorCount} erreur(s))` : ''}`
        );
        
        if (Platform.OS !== 'web') {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } else {
        Alert.alert('Erreur', 'Aucune photo n\'a pu être importée');
      }
    } catch (error) {
      console.error('Import error:', error);
      setImporting(false);
      Alert.alert('Erreur', "Impossible d'ajouter les photos.");
    }
  };

  const handlePhotoPress = (uri: string, idx: number) => {
    if (selectionMode) {
      const photoId = `${album?.id}-${idx}`;
      batchSelectPhotos([photoId]);
      
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } else {
      const encoded = encodeURIComponent(uri);
      router.push(`/photo/${encoded}`);
    }
  };

  useEffect(() => {
    if (!album) return;
    const nextUris = album.photos.slice(0, 30);
    try {
      (Image as any).prefetch && (Image as any).prefetch(nextUris);
    } catch {}
  }, [album]);

  const toggleSelectionMode = () => {
    if (selectionMode) {
      clearSelection();
    }
    setSelectionMode(!selectionMode);
    
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const handleExportAlbum = async () => {
    if (!album) return;
    
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission requise', "Autorisez l'accès à la galerie pour exporter l'album.");
        return;
      }
      
      await exportAlbum(album.id);
      Alert.alert('Export terminé', `L'album "${album.name}" a été exporté vers votre galerie.`);
      
      if (Platform.OS !== 'web') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      Alert.alert('Erreur', "Impossible d'exporter l'album.");
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

      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) }]}>
        <View style={styles.headerContent}>
          <Pressable style={styles.backBtn} onPress={() => router.back()} testID="back-btn">
            <ArrowLeft color="#FFD700" size={24} />
          </Pressable>
          <Text style={styles.headerTitle}>{album.name}</Text>
          <View style={styles.headerActions}>
            <Pressable style={styles.actionBtn} onPress={handleToggleFavorite} testID="favorite-album-btn">
              <Star color={isFavorite ? '#000' : '#FFD700'} size={20} fill={isFavorite ? '#FFD700' : 'transparent'} />
            </Pressable>
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

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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
          <View style={styles.pinterestMasonry}>
            <View style={styles.pinterestColumn}>
              {album.photos.filter((_, idx) => idx % 2 === 0).map((uri, idx) => {
                const originalIdx = idx * 2;
                const photoId = `${album.id}-${originalIdx}`;
                const isSelected = selectedPhotos.includes(photoId);
                const height = 200 + (originalIdx % 4) * 80;
                const photoComments = comments.filter(c => c.photoId === `${album.id}-${originalIdx}`);
                
                return (
                  <View key={`${uri}-${originalIdx}`} style={[styles.pinterestCard, { height }]}>
                    <Pressable 
                      style={[styles.photoCard, isSelected && styles.selectedPhoto]} 
                      testID={`photo-${originalIdx}`} 
                      onPress={() => handlePhotoPress(uri, originalIdx)}
                      onLongPress={() => {
                        if (!selectionMode) {
                          setSelectionMode(true);
                        }
                        batchSelectPhotos([photoId]);
                        
                        if (Platform.OS !== 'web') {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                        }
                      }}
                    >
                      <Image source={{ uri }} style={[styles.photo, { height: height - 80 }]} contentFit="cover" cachePolicy="memory-disk" transition={200} />
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
                    
                    <View style={styles.photoComments}>
                      {photoComments.slice(0, 2).map(comment => (
                        <View key={comment.id} style={styles.commentPreview}>
                          <Text style={styles.commentAuthorSmall}>{comment.author}</Text>
                          <Text style={styles.commentTextSmall} numberOfLines={2}>{comment.text}</Text>
                        </View>
                      ))}
                      {photoComments.length > 2 && (
                        <Text style={styles.moreComments}>+{photoComments.length - 2} commentaires</Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
            
            <View style={styles.pinterestColumn}>
              {album.photos.filter((_, idx) => idx % 2 === 1).map((uri, idx) => {
                const originalIdx = idx * 2 + 1;
                const photoId = `${album.id}-${originalIdx}`;
                const isSelected = selectedPhotos.includes(photoId);
                const height = 180 + (originalIdx % 4) * 90;
                const photoComments = comments.filter(c => c.photoId === `${album.id}-${originalIdx}`);
                
                return (
                  <View key={`${uri}-${originalIdx}`} style={[styles.pinterestCard, { height }]}>
                    <Pressable 
                      style={[styles.photoCard, isSelected && styles.selectedPhoto]} 
                      testID={`photo-${originalIdx}`} 
                      onPress={() => handlePhotoPress(uri, originalIdx)}
                      onLongPress={() => {
                        if (!selectionMode) {
                          setSelectionMode(true);
                        }
                        batchSelectPhotos([photoId]);
                        
                        if (Platform.OS !== 'web') {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                        }
                      }}
                    >
                      <Image source={{ uri }} style={[styles.photo, { height: height - 80 }]} contentFit="cover" cachePolicy="memory-disk" transition={200} />
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
                    
                    <View style={styles.photoComments}>
                      {photoComments.slice(0, 2).map(comment => (
                        <View key={comment.id} style={styles.commentPreview}>
                          <Text style={styles.commentAuthorSmall}>{comment.author}</Text>
                          <Text style={styles.commentTextSmall} numberOfLines={2}>{comment.text}</Text>
                        </View>
                      ))}
                      {photoComments.length > 2 && (
                        <Text style={styles.moreComments}>+{photoComments.length - 2} commentaires</Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Floating Add Button */}
      {!selectionMode && (
        <Pressable style={styles.floatingAddBtn} onPress={addFromLibrary} testID="floating-add">
          <LinearGradient colors={['#FFD700', '#FFA500']} style={styles.floatingBtnGradient}>
            {importing ? <ActivityIndicator color="#000" /> : <Plus color="#000" size={24} />}
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

            <Pressable style={styles.optionItem} onPress={() => { setShowOptions(false); router.push(`/album/${id}/cover-editor`); }} testID="open-cover-editor">
              <Camera color="#4DB6AC" size={20} />
              <Text style={styles.optionText}>Éditeur de couverture (recadrage/zoom)</Text>
            </Pressable>

            <Pressable style={styles.optionItem} onPress={() => {
              if (!album) return;
              const link = createTemporaryShareLink(album.id, 24);
              if (link) {
                Alert.alert('Lien créé', `Expire le ${new Date(link.expiresAt).toLocaleString()}`, [
                  { text: 'OK' },
                  { text: 'Partager', onPress: () => {} }
                ]);
              }
            }}>
              <Link2 color="#2196F3" size={20} />
              <Text style={styles.optionText}>Lien de partage 24h</Text>
            </Pressable>

            <Pressable style={styles.optionItem} onPress={() => { if (album) revokeShareLink(album.id); }}>
              <XCircle color="#FF5252" size={20} />
              <Text style={styles.optionText}>Révoquer le lien</Text>
            </Pressable>
            
            <Pressable style={styles.optionItem} onPress={() => { setShowOptions(false); setShowExport(true); }}>
              <Download color="#4CAF50" size={20} />
              <Text style={styles.optionText}>Exporter l'album</Text>
            </Pressable>
            
            <Pressable style={styles.optionItem} onPress={() => { setShowOptions(false); setShowAlbumComments(true); }}>
              <MessageCircle color={Colors.palette.accentGold} size={20} />
              <Text style={styles.optionText}>Commentaires de l'album</Text>
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

      {/* Album Comments Modal */}
      <Modal visible={showAlbumComments} transparent animationType="slide" onRequestClose={() => setShowAlbumComments(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.albumCommentsModal}>
            <Text style={styles.changeCoverTitle}>Commentaires de l'album</Text>
            <Text style={styles.changeCoverSubtitle}>Visibles par tous les membres</Text>
            <ScrollView style={styles.albumCommentsList} showsVerticalScrollIndicator={false}>
              {albumComments.map(c => (
                <View key={c.id} style={styles.commentItem}>
                  <View style={styles.commentHeader}>
                    <Text style={styles.commentAuthor}>{c.author}</Text>
                    <Text style={styles.commentDate}>{new Date(c.createdAt).toLocaleDateString('fr-FR')}</Text>
                    <Pressable style={styles.deleteCommentButton} onPress={() => handleDeleteAlbumComment(c.id)}>
                      <Trash2 color="#FF6B6B" size={16} />
                    </Pressable>
                  </View>
                  <Text style={styles.commentText}>{c.text}</Text>
                </View>
              ))}
            </ScrollView>
            <View style={styles.commentInput}>
              <TextInput 
                style={styles.textInput}
                placeholder="Ajouter un commentaire..."
                placeholderTextColor="#A9AFBC"
                value={albumCommentText}
                onChangeText={setAlbumCommentText}
                multiline
                maxLength={500}
              />
              <Pressable style={[styles.sendButton, { opacity: albumCommentText.trim() ? 1 : 0.5 }]} onPress={handleAddAlbumComment} disabled={!albumCommentText.trim()}>
                <Send color={Colors.palette.accentGold} size={20} />
              </Pressable>
            </View>
            <Pressable style={styles.changeCoverCancel} onPress={() => setShowAlbumComments(false)}>
              <Text style={styles.changeCoverCancelText}>Fermer</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      <AlbumExport album={album} isVisible={showExport} onClose={() => setShowExport(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  loadingText: { color: '#fff', textAlign: 'center', marginTop: '50%' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12 },
  headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flex: 1 },
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
  scrollContent: { padding: 8, paddingBottom: 120 },
  pinterestMasonry: { flexDirection: 'row', gap: 8 },
  pinterestColumn: { flex: 1, gap: 8 },
  pinterestCard: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 5 },
  photoCard: { position: 'relative' },
  photoComments: { padding: 12, backgroundColor: 'rgba(0,0,0,0.9)' },
  commentPreview: { marginBottom: 4 },
  commentAuthorSmall: { color: '#FFD700', fontSize: 12, fontWeight: '700', marginBottom: 2 },
  commentTextSmall: { color: '#FFFFFF', fontSize: 11, lineHeight: 16 },
  moreComments: { color: '#A9AFBC', fontSize: 10, fontStyle: 'italic', marginTop: 4, textAlign: 'center' },
  selectedPhoto: { borderWidth: 3, borderColor: '#FFD700' },
  photo: { width: '100%', borderTopLeftRadius: 16, borderTopRightRadius: 16 },
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
  albumCommentsModal: { backgroundColor: '#0B0B0D', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, gap: 12 },
  albumCommentsList: { maxHeight: 260 },
  commentItem: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 12, marginBottom: 8 },
  commentHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  commentAuthor: { color: Colors.palette.accentGold, fontSize: 14, fontWeight: '600', flex: 1 },
  commentDate: { color: '#A9AFBC', fontSize: 12, marginRight: 8 },
  deleteCommentButton: { padding: 4 },
  commentText: { color: '#FFFFFF', fontSize: 14, lineHeight: 20 },
  commentInput: { flexDirection: 'row', alignItems: 'flex-end', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  textInput: { flex: 1, color: '#FFFFFF', fontSize: 16, maxHeight: 100, paddingVertical: 8 },
  sendButton: { padding: 8, borderRadius: 8 },
});