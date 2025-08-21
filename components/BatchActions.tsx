import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, ScrollView, Alert, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { 
  Trash2, 
  Move, 
  Share2, 
  Download, 
  Heart, 
  X, 
  Check,
  FolderOpen,
  Archive
} from 'lucide-react-native';
import { useAppState } from '@/providers/AppStateProvider';
import Colors from '@/constants/colors';
import { Image } from 'expo-image';

interface BatchActionsProps {
  visible: boolean;
  onClose: () => void;
  selectedPhotos: string[];
}

export default function BatchActions({ visible, onClose, selectedPhotos }: BatchActionsProps) {
  const { 
    albums, 
    photos, 
    batchDeletePhotos, 
    batchMovePhotos, 
    clearSelection,
    addNotification 
  } = useAppState();
  
  const [showMoveModal, setShowMoveModal] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const selectedPhotoObjects = photos.filter(photo => selectedPhotos.includes(photo.id));

  const handleDelete = useCallback(() => {
    Alert.alert(
      'Supprimer les photos',
      `Êtes-vous sûr de vouloir supprimer ${selectedPhotos.length} photo(s) ? Cette action est irréversible.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            setIsProcessing(true);
            batchDeletePhotos(selectedPhotos);
            addNotification({
              type: 'photo_added',
              title: 'Photos supprimées',
              message: `${selectedPhotos.length} photo(s) ont été supprimées`,
              read: false
            });
            setIsProcessing(false);
            onClose();
          }
        }
      ]
    );
  }, [selectedPhotos, batchDeletePhotos, addNotification, onClose]);

  const handleMove = useCallback((targetAlbumId: string) => {
    setIsProcessing(true);
    const targetAlbum = albums.find(a => a.id === targetAlbumId);
    
    batchMovePhotos(selectedPhotos, targetAlbumId);
    
    addNotification({
      type: 'photo_added',
      title: 'Photos déplacées',
      message: `${selectedPhotos.length} photo(s) ont été déplacées vers "${targetAlbum?.name}"`,
      read: false
    });
    
    setIsProcessing(false);
    setShowMoveModal(false);
    onClose();
  }, [selectedPhotos, albums, batchMovePhotos, addNotification, onClose]);

  const handleShare = useCallback(async () => {
    setIsProcessing(true);
    
    // Simulate sharing process
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    addNotification({
      type: 'photo_added',
      title: 'Partage préparé',
      message: `${selectedPhotos.length} photo(s) prêtes à être partagées`,
      read: false
    });
    
    setIsProcessing(false);
    onClose();
  }, [selectedPhotos, addNotification, onClose]);

  const handleDownload = useCallback(async () => {
    setIsProcessing(true);
    
    // Simulate download process
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    addNotification({
      type: 'photo_added',
      title: 'Téléchargement terminé',
      message: `${selectedPhotos.length} photo(s) téléchargées dans la galerie`,
      read: false
    });
    
    setIsProcessing(false);
    onClose();
  }, [selectedPhotos, addNotification, onClose]);

  const handleArchive = useCallback(() => {
    setIsProcessing(true);
    
    // Simulate archive process
    addNotification({
      type: 'photo_added',
      title: 'Photos archivées',
      message: `${selectedPhotos.length} photo(s) ont été archivées`,
      read: false
    });
    
    setIsProcessing(false);
    onClose();
  }, [selectedPhotos, addNotification, onClose]);

  return (
    <>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContainer}>
            <LinearGradient colors={['#0B0B0D', '#131417']} style={styles.modalGradient}>
              
              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.headerTitle}>
                  Actions sur {selectedPhotos.length} photo(s)
                </Text>
                <Pressable style={styles.closeButton} onPress={onClose}>
                  <X color="#FFFFFF" size={24} />
                </Pressable>
              </View>

              {/* Selected Photos Preview */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosPreview}>
                {selectedPhotoObjects.slice(0, 10).map(photo => (
                  <View key={photo.id} style={styles.photoPreview}>
                    <Image
                      source={{ uri: photo.uri }}
                      style={styles.photoPreviewImage}
                      contentFit="cover"
                    />
                    <View style={styles.photoPreviewCheck}>
                      <Check color="#000000" size={12} />
                    </View>
                  </View>
                ))}
                {selectedPhotoObjects.length > 10 && (
                  <View style={styles.morePhotos}>
                    <Text style={styles.morePhotosText}>+{selectedPhotoObjects.length - 10}</Text>
                  </View>
                )}
              </ScrollView>

              {/* Actions */}
              <View style={styles.actions}>
                
                {/* Move */}
                <Pressable 
                  style={[styles.actionButton, styles.primaryAction]}
                  onPress={() => setShowMoveModal(true)}
                  disabled={isProcessing}
                >
                  <LinearGradient colors={['#4CAF50', '#45a049']} style={styles.actionGradient}>
                    <Move color="#FFFFFF" size={20} />
                    <Text style={styles.actionText}>Déplacer</Text>
                  </LinearGradient>
                </Pressable>

                {/* Share */}
                <Pressable 
                  style={[styles.actionButton, styles.secondaryAction]}
                  onPress={handleShare}
                  disabled={isProcessing}
                >
                  <LinearGradient colors={['#2196F3', '#1976D2']} style={styles.actionGradient}>
                    <Share2 color="#FFFFFF" size={20} />
                    <Text style={styles.actionText}>Partager</Text>
                  </LinearGradient>
                </Pressable>

                {/* Download */}
                <Pressable 
                  style={[styles.actionButton, styles.tertiaryAction]}
                  onPress={handleDownload}
                  disabled={isProcessing}
                >
                  <LinearGradient colors={['#FF9800', '#F57C00']} style={styles.actionGradient}>
                    <Download color="#FFFFFF" size={20} />
                    <Text style={styles.actionText}>Télécharger</Text>
                  </LinearGradient>
                </Pressable>

                {/* Archive */}
                <Pressable 
                  style={[styles.actionButton, styles.quaternaryAction]}
                  onPress={handleArchive}
                  disabled={isProcessing}
                >
                  <LinearGradient colors={['#9C27B0', '#7B1FA2']} style={styles.actionGradient}>
                    <Archive color="#FFFFFF" size={20} />
                    <Text style={styles.actionText}>Archiver</Text>
                  </LinearGradient>
                </Pressable>

                {/* Delete */}
                <Pressable 
                  style={[styles.actionButton, styles.dangerAction]}
                  onPress={handleDelete}
                  disabled={isProcessing}
                >
                  <LinearGradient colors={['#F44336', '#D32F2F']} style={styles.actionGradient}>
                    <Trash2 color="#FFFFFF" size={20} />
                    <Text style={styles.actionText}>Supprimer</Text>
                  </LinearGradient>
                </Pressable>

              </View>

              {/* Cancel */}
              <Pressable style={styles.cancelButton} onPress={onClose}>
                <Text style={styles.cancelText}>Annuler</Text>
              </Pressable>

            </LinearGradient>
          </View>
        </View>
      </Modal>

      {/* Move Modal */}
      <Modal visible={showMoveModal} transparent animationType="fade" onRequestClose={() => setShowMoveModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.moveModalContainer}>
            {Platform.OS !== 'web' ? (
              <BlurView intensity={20} style={styles.moveModalBlur}>
                <View style={styles.moveModalContent}>
                  <Text style={styles.moveModalTitle}>Déplacer vers un album</Text>
                  
                  <ScrollView style={styles.albumsList} showsVerticalScrollIndicator={false}>
                    {albums.map(album => (
                      <Pressable
                        key={album.id}
                        style={styles.albumOption}
                        onPress={() => handleMove(album.id)}
                      >
                        <Image
                          source={{ uri: album.coverImage || 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?q=80&w=400&auto=format&fit=crop' }}
                          style={styles.albumOptionImage}
                          contentFit="cover"
                        />
                        <View style={styles.albumOptionInfo}>
                          <Text style={styles.albumOptionName}>{album.name}</Text>
                          <Text style={styles.albumOptionMeta}>{album.photos.length} photos</Text>
                        </View>
                        <FolderOpen color={Colors.palette.taupe} size={20} />
                      </Pressable>
                    ))}
                  </ScrollView>

                  <Pressable 
                    style={styles.moveModalCancel} 
                    onPress={() => setShowMoveModal(false)}
                  >
                    <Text style={styles.moveModalCancelText}>Annuler</Text>
                  </Pressable>
                </View>
              </BlurView>
            ) : (
              <View style={[styles.moveModalBlur, styles.webBlur]}>
                <View style={styles.moveModalContent}>
                  <Text style={styles.moveModalTitle}>Déplacer vers un album</Text>
                  
                  <ScrollView style={styles.albumsList} showsVerticalScrollIndicator={false}>
                    {albums.map(album => (
                      <Pressable
                        key={album.id}
                        style={styles.albumOption}
                        onPress={() => handleMove(album.id)}
                      >
                        <Image
                          source={{ uri: album.coverImage || 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?q=80&w=400&auto=format&fit=crop' }}
                          style={styles.albumOptionImage}
                          contentFit="cover"
                        />
                        <View style={styles.albumOptionInfo}>
                          <Text style={styles.albumOptionName}>{album.name}</Text>
                          <Text style={styles.albumOptionMeta}>{album.photos.length} photos</Text>
                        </View>
                        <FolderOpen color={Colors.palette.taupe} size={20} />
                      </Pressable>
                    ))}
                  </ScrollView>

                  <Pressable 
                    style={styles.moveModalCancel} 
                    onPress={() => setShowMoveModal(false)}
                  >
                    <Text style={styles.moveModalCancelText}>Annuler</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    maxHeight: '80%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  modalGradient: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
  closeButton: {
    padding: 8,
  },
  photosPreview: {
    marginBottom: 24,
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  photoPreview: {
    position: 'relative',
    marginRight: 12,
  },
  photoPreviewImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
  },
  photoPreviewCheck: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
  },
  morePhotos: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  morePhotosText: {
    color: Colors.palette.taupe,
    fontSize: 12,
    fontWeight: '600',
  },
  actions: {
    gap: 12,
  },
  actionButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  actionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  primaryAction: {},
  secondaryAction: {},
  tertiaryAction: {},
  quaternaryAction: {},
  dangerAction: {},
  cancelButton: {
    marginTop: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelText: {
    color: Colors.palette.taupe,
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Move Modal Styles
  moveModalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  moveModalBlur: {
    borderRadius: 20,
    overflow: 'hidden',
    width: '100%',
    maxWidth: 400,
    maxHeight: '70%',
  },
  webBlur: {
    backgroundColor: 'rgba(0,0,0,0.9)',
    backdropFilter: 'blur(20px)',
  },
  moveModalContent: {
    padding: 20,
  },
  moveModalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 20,
  },
  albumsList: {
    maxHeight: 300,
  },
  albumOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginBottom: 8,
  },
  albumOptionImage: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginRight: 12,
  },
  albumOptionInfo: {
    flex: 1,
  },
  albumOptionName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  albumOptionMeta: {
    color: Colors.palette.taupe,
    fontSize: 12,
  },
  moveModalCancel: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  moveModalCancelText: {
    color: Colors.palette.taupe,
    fontSize: 16,
    fontWeight: '600',
  },
});