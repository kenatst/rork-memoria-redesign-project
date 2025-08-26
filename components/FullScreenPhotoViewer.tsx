import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  PanResponder,
  Animated,
  Modal,
  Pressable,
  Platform,
  StatusBar,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Share, Download, Heart, MessageCircle, ChevronLeft, ChevronRight } from 'lucide-react-native';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';
import { useToast } from '@/providers/ToastProvider';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface Photo {
  id: string;
  uri: string;
  albumId: string;
  likes: string[];
  createdAt: string;
  metadata?: {
    timestamp: string;
    location?: { lat: number; lng: number };
    device?: string;
  };
  tags?: string[];
}

interface Comment {
  id: string;
  text: string;
  author: string;
  createdAt: string;
  photoId?: string;
  albumId?: string;
}

interface FullScreenPhotoViewerProps {
  visible: boolean;
  photos: Photo[];
  initialIndex: number;
  comments: Comment[];
  onClose: () => void;
  onLike: (photoId: string) => void;
  onUnlike: (photoId: string) => void;
  onAddComment: (photoId: string, text: string) => void;
  currentUser: string;
}

export default function FullScreenPhotoViewer({
  visible,
  photos,
  initialIndex,
  comments,
  onClose,
  onLike,
  onUnlike,
  onAddComment,
  currentUser,
}: FullScreenPhotoViewerProps) {
  const { showSuccess, showError } = useToast();
  const [currentIndex, setCurrentIndex] = useState<number>(initialIndex);
  const [showUI, setShowUI] = useState<boolean>(true);
  const [commentText, setCommentText] = useState<string>('');
  const [showComments, setShowComments] = useState<boolean>(false);
  
  // Animation values
  const scale = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const currentPhoto = photos[currentIndex];
  const photoComments = comments.filter(c => c.photoId === currentPhoto?.id);
  const isLiked = currentPhoto?.likes.includes(currentUser);

  // Reset animation values when photo changes
  React.useEffect(() => {
    scale.setValue(1);
    translateX.setValue(0);
    translateY.setValue(0);
    opacity.setValue(1);
  }, [currentIndex]);

  // Pan responder for gestures
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 10 || Math.abs(gestureState.dy) > 10;
      },
      onPanResponderGrant: () => {
        if (Platform.OS !== 'web') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      },
      onPanResponderMove: (_, gestureState) => {
        // Pinch to zoom (simplified)
        if (gestureState.numberActiveTouches === 2) {
          const newScale = Math.max(0.5, Math.min(3, 1 + gestureState.dy / 200));
          scale.setValue(newScale);
        } else {
          // Pan to move
          translateX.setValue(gestureState.dx);
          translateY.setValue(gestureState.dy);
          
          // Fade background when dragging down
          const dragOpacity = Math.max(0.3, 1 - Math.abs(gestureState.dy) / 300);
          opacity.setValue(dragOpacity);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        // Swipe to next/previous photo
        if (Math.abs(gestureState.dx) > 100 && Math.abs(gestureState.dy) < 100) {
          if (gestureState.dx > 0 && currentIndex > 0) {
            // Swipe right - previous photo
            setCurrentIndex(currentIndex - 1);
          } else if (gestureState.dx < 0 && currentIndex < photos.length - 1) {
            // Swipe left - next photo
            setCurrentIndex(currentIndex + 1);
          }
        }
        
        // Close on vertical swipe
        if (Math.abs(gestureState.dy) > 150) {
          onClose();
          return;
        }
        
        // Reset position
        Animated.parallel([
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true }),
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true }),
          Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
          Animated.spring(opacity, { toValue: 1, useNativeDriver: true }),
        ]).start();
      },
    })
  ).current;

  const handleShare = useCallback(async () => {
    if (!currentPhoto) return;
    
    try {
      if (Platform.OS !== 'web') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      if (Platform.OS === 'web') {
        // Web fallback
        if (navigator.share) {
          await navigator.share({
            title: 'Photo partagée',
            text: 'Découvrez cette photo !',
            url: currentPhoto.uri,
          });
        } else {
          // Copy to clipboard fallback
          await navigator.clipboard.writeText(currentPhoto.uri);
          showSuccess('Lien copié', 'Le lien de la photo a été copié dans le presse-papiers');
        }
      } else {
        // Mobile sharing
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(currentPhoto.uri, {
            mimeType: 'image/jpeg',
            dialogTitle: 'Partager cette photo',
          });
        } else {
          showError('Partage indisponible', 'Le partage n\'est pas disponible sur cet appareil');
        }
      }
    } catch (error) {
      console.error('Share error:', error);
      showError('Erreur de partage', 'Impossible de partager cette photo');
    }
  }, [currentPhoto, showSuccess, showError]);

  const handleDownload = useCallback(async () => {
    if (!currentPhoto) return;
    
    try {
      if (Platform.OS !== 'web') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      if (Platform.OS === 'web') {
        // Web download
        const link = document.createElement('a');
        link.href = currentPhoto.uri;
        link.download = `photo_${currentPhoto.id}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showSuccess('Téléchargement', 'Photo téléchargée avec succès');
      } else {
        // Mobile download
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status !== 'granted') {
          showError('Permission refusée', 'Permission d\'accès à la galerie requise');
          return;
        }

        const fileUri = FileSystem.documentDirectory + `photo_${currentPhoto.id}.jpg`;
        const downloadResult = await FileSystem.downloadAsync(currentPhoto.uri, fileUri);
        
        if (downloadResult.status === 200) {
          await MediaLibrary.saveToLibraryAsync(downloadResult.uri);
          showSuccess('Téléchargement', 'Photo sauvegardée dans la galerie');
        } else {
          throw new Error('Download failed');
        }
      }
    } catch (error) {
      console.error('Download error:', error);
      showError('Erreur de téléchargement', 'Impossible de télécharger cette photo');
    }
  }, [currentPhoto, showSuccess, showError]);

  const handleLike = useCallback(() => {
    if (!currentPhoto) return;
    
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    if (isLiked) {
      onUnlike(currentPhoto.id);
    } else {
      onLike(currentPhoto.id);
    }
  }, [currentPhoto, isLiked, onLike, onUnlike]);

  const toggleUI = useCallback(() => {
    setShowUI(!showUI);
  }, [showUI]);

  if (!visible || !currentPhoto) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <StatusBar hidden />
      <Animated.View style={[styles.container, { opacity }]}>
        <LinearGradient
          colors={['rgba(0,0,0,0.9)', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,0.9)']}
          style={StyleSheet.absoluteFillObject}
        />
        
        {/* Photo */}
        <Animated.View
          style={[
            styles.photoContainer,
            {
              transform: [
                { translateX },
                { translateY },
                { scale },
              ],
            },
          ]}
          {...panResponder.panHandlers}
        >
          <Pressable onPress={toggleUI} style={styles.photoTouchable}>
            <Image
              source={{ uri: currentPhoto.uri }}
              style={styles.photo}
              contentFit="contain"
              transition={200}
            />
          </Pressable>
        </Animated.View>

        {/* UI Overlay */}
        {showUI && (
          <>
            {/* Top Bar */}
            <SafeAreaView style={styles.topBar} edges={['top']}>
              <LinearGradient
                colors={['rgba(0,0,0,0.8)', 'transparent']}
                style={styles.topGradient}
              >
                <View style={styles.topContent}>
                  <Pressable onPress={onClose} style={styles.closeButton}>
                    <X size={24} color="#FFFFFF" />
                  </Pressable>
                  
                  <View style={styles.photoInfo}>
                    <Text style={styles.photoCounter}>
                      {currentIndex + 1} / {photos.length}
                    </Text>
                    {currentPhoto.metadata?.timestamp && (
                      <Text style={styles.photoDate}>
                        {new Date(currentPhoto.metadata.timestamp).toLocaleDateString()}
                      </Text>
                    )}
                  </View>
                  
                  <View style={styles.topActions}>
                    <Pressable onPress={handleShare} style={styles.actionButton}>
                      <Share size={20} color="#FFFFFF" />
                    </Pressable>
                    <Pressable onPress={handleDownload} style={styles.actionButton}>
                      <Download size={20} color="#FFFFFF" />
                    </Pressable>
                  </View>
                </View>
              </LinearGradient>
            </SafeAreaView>

            {/* Navigation Arrows */}
            {currentIndex > 0 && (
              <Pressable
                style={[styles.navButton, styles.navLeft]}
                onPress={() => setCurrentIndex(currentIndex - 1)}
              >
                <ChevronLeft size={32} color="#FFFFFF" />
              </Pressable>
            )}
            
            {currentIndex < photos.length - 1 && (
              <Pressable
                style={[styles.navButton, styles.navRight]}
                onPress={() => setCurrentIndex(currentIndex + 1)}
              >
                <ChevronRight size={32} color="#FFFFFF" />
              </Pressable>
            )}

            {/* Bottom Bar */}
            <SafeAreaView style={styles.bottomBar} edges={['bottom']}>
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.8)']}
                style={styles.bottomGradient}
              >
                <View style={styles.bottomContent}>
                  <View style={styles.bottomActions}>
                    <Pressable onPress={handleLike} style={styles.likeButton}>
                      <Heart
                        size={24}
                        color={isLiked ? '#FF6B6B' : '#FFFFFF'}
                        fill={isLiked ? '#FF6B6B' : 'transparent'}
                      />
                      <Text style={[styles.likeCount, isLiked && styles.likeCountActive]}>
                        {currentPhoto.likes.length}
                      </Text>
                    </Pressable>
                    
                    <Pressable
                      onPress={() => setShowComments(!showComments)}
                      style={styles.commentButton}
                    >
                      <MessageCircle size={24} color="#FFFFFF" />
                      <Text style={styles.commentCount}>
                        {photoComments.length}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </LinearGradient>
            </SafeAreaView>

            {/* Comments Panel */}
            {showComments && (
              <View style={styles.commentsPanel}>
                <LinearGradient
                  colors={['rgba(0,0,0,0.9)', 'rgba(0,0,0,0.8)']}
                  style={styles.commentsPanelGradient}
                >
                  <Text style={styles.commentsTitle}>
                    Commentaires ({photoComments.length})
                  </Text>
                  
                  {photoComments.map((comment) => (
                    <View key={comment.id} style={styles.commentItem}>
                      <Text style={styles.commentAuthor}>{comment.author}</Text>
                      <Text style={styles.commentText}>{comment.text}</Text>
                      <Text style={styles.commentDate}>
                        {new Date(comment.createdAt).toLocaleDateString()}
                      </Text>
                    </View>
                  ))}
                  
                  {photoComments.length === 0 && (
                    <Text style={styles.noComments}>Aucun commentaire</Text>
                  )}
                </LinearGradient>
              </View>
            )}
          </>
        )}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
  },
  photoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoTouchable: {
    width: screenWidth,
    height: screenHeight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photo: {
    width: screenWidth,
    height: screenHeight * 0.8,
    maxWidth: screenWidth,
    maxHeight: screenHeight * 0.8,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  topGradient: {
    paddingTop: 20,
    paddingBottom: 20,
  },
  topContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoInfo: {
    alignItems: 'center',
  },
  photoCounter: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  photoDate: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginTop: 2,
  },
  topActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButton: {
    position: 'absolute',
    top: '50%',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  navLeft: {
    left: 20,
  },
  navRight: {
    right: 20,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  bottomGradient: {
    paddingTop: 20,
    paddingBottom: 20,
  },
  bottomContent: {
    paddingHorizontal: 20,
  },
  bottomActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  likeCount: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  likeCountActive: {
    color: '#FF6B6B',
  },
  commentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  commentCount: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  commentsPanel: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    maxHeight: 200,
    borderRadius: 12,
    overflow: 'hidden',
  },
  commentsPanelGradient: {
    padding: 16,
  },
  commentsTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  commentItem: {
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  commentAuthor: {
    color: Colors.palette.taupeDeep,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  commentText: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  commentDate: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
  },
  noComments: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});