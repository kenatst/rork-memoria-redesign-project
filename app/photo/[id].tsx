import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { View, StyleSheet, Text, Pressable, Alert, Platform, ScrollView, TextInput, KeyboardAvoidingView, Animated, Dimensions, Modal, Share, PanResponder, GestureResponderEvent } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { 
  ArrowLeft, 
  Heart, 
  MessageCircle, 
  Download, 
  Share2, 
  Trash2,
  Send,
  X,
  ZoomIn,
  ChevronLeft,
  ChevronRight
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useAppState } from '@/providers/AppStateProvider';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as Clipboard from 'expo-clipboard';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface PhotoLike {
  id: string;
  userId: string;
  photoId: string;
  createdAt: string;
}

export default function PhotoDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const id = params.id;
  const insets = useSafeAreaInsets();
  
  const { albums, comments, addComment, deleteComment } = useAppState();
  
  const [likes, setLikes] = useState<PhotoLike[]>([]);
  const [isLiked, setIsLiked] = useState<boolean>(false);
  const [commentText, setCommentText] = useState<string>('');
  const [showComments, setShowComments] = useState<boolean>(false);
  const [showFullscreen, setShowFullscreen] = useState<boolean>(false);
  const [showActions, setShowActions] = useState<boolean>(true);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [swipeAnim] = useState(() => new Animated.Value(0));
  const [scaleAnim] = useState(() => new Animated.Value(1));
  const [translateXAnim] = useState(() => new Animated.Value(0));
  const [translateYAnim] = useState(() => new Animated.Value(0));
  
  const targetUri = useMemo(() => (id ? decodeURIComponent(id) : ''), [id]);
  
  // Trouver la photo dans les albums
  const photo = useMemo(() => {
    if (!targetUri || !albums || albums.length === 0) return null;
    
    for (const album of albums) {
      const photoIndex = album.photos.findIndex(p => p === targetUri);
      if (photoIndex !== -1) {
        return {
          uri: album.photos[photoIndex],
          albumId: album.id,
          albumName: album.name,
          index: photoIndex,
          albumPhotos: album.photos
        };
      }
    }
    return null;
  }, [albums, targetUri]);
  
  // Initialize current index when photo is found
  useEffect(() => {
    if (photo && currentIndex !== photo.index) {
      setCurrentIndex(photo.index);
    }
  }, [photo?.index]);
  
  // Current photo for swipe
  const currentPhoto = useMemo(() => {
    if (!photo) return photo;
    return {
      ...photo,
      uri: photo.albumPhotos[currentIndex],
      index: currentIndex
    };
  }, [photo, currentIndex]);
  
  const photoComments = useMemo(() => {
    if (!currentPhoto?.uri || !comments) return [];
    return comments.filter(c => c.photoId === currentPhoto.uri);
  }, [comments, currentPhoto?.uri]);
  
  const handleHapticFeedback = useCallback((style: 'light' | 'medium' | 'heavy' = 'medium') => {
    if (Platform.OS !== 'web') {
      const hapticStyle = style === 'light' ? Haptics.ImpactFeedbackStyle.Light :
                         style === 'heavy' ? Haptics.ImpactFeedbackStyle.Heavy :
                         Haptics.ImpactFeedbackStyle.Medium;
      Haptics.impactAsync(hapticStyle);
    }
  }, []);
  
  const handleLike = useCallback(() => {
    handleHapticFeedback('light');
    if (isLiked) {
      setLikes(prev => prev.filter(like => like.userId !== 'current-user'));
    } else {
      const newLike: PhotoLike = {
        id: Date.now().toString(),
        userId: 'current-user',
        photoId: id || '',
        createdAt: new Date().toISOString()
      };
      setLikes(prev => [...prev, newLike]);
    }
    setIsLiked(!isLiked);
  }, [isLiked, id, handleHapticFeedback]);
  
  const handleAddComment = useCallback(() => {
    if (commentText.trim() && currentPhoto?.uri) {
      addComment(commentText.trim(), currentPhoto.uri);
      setCommentText('');
      handleHapticFeedback('light');
    }
  }, [commentText, currentPhoto?.uri, addComment, handleHapticFeedback]);
  
  const handleDeleteComment = useCallback((commentId: string) => {
    Alert.alert(
      'Supprimer le commentaire',
      'Êtes-vous sûr de vouloir supprimer ce commentaire ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Supprimer', 
          style: 'destructive',
          onPress: () => {
            deleteComment(commentId);
            handleHapticFeedback('medium');
          }
        }
      ]
    );
  }, [deleteComment, handleHapticFeedback]);
  
  const handleSave = useCallback(async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    handleHapticFeedback('medium');
    
    try {
      if (!currentPhoto?.uri) {
        Alert.alert('Erreur', 'Aucune photo à télécharger');
        return;
      }

      if (Platform.OS === 'web') {
        try {
          const response = await fetch(currentPhoto.uri);
          const blob = await response.blob();
          const link = document.createElement('a');
          const url = URL.createObjectURL(blob);
          link.href = url;
          link.download = 'photo.jpg';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          Alert.alert('Téléchargé', 'Photo téléchargée');
        } catch (webError) {
          Alert.alert('Erreur', 'Téléchargement web indisponible');
        }
      } else {
        try {
          const fileUri = FileSystem.cacheDirectory + `photo_${Date.now()}.jpg`;
          const dl = await FileSystem.downloadAsync(currentPhoto.uri, fileUri);
          await MediaLibrary.requestPermissionsAsync();
          await MediaLibrary.saveToLibraryAsync(dl.uri);
          Alert.alert('Téléchargé', 'Photo enregistrée dans votre galerie');
        } catch (saveError) {
          console.error('Save error:', saveError);
          Alert.alert('Erreur', 'Impossible de sauvegarder la photo');
        }
      }
    } catch (error) {
      console.error('Save error:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder la photo');
    } finally {
      setIsDownloading(false);
    }
  }, [currentPhoto?.uri, handleHapticFeedback, isDownloading]);
  
  const handleShare = useCallback(async () => {
    handleHapticFeedback('medium');
    try {
      if (!currentPhoto?.uri) return;
      if (Platform.OS === 'web') {
        const canWebShare = typeof navigator !== 'undefined' && (navigator as any).share;
        if (canWebShare) {
          await (navigator as any).share({ title: 'Photo', url: currentPhoto.uri });
        } else {
          await Clipboard.setStringAsync(currentPhoto.uri);
          Alert.alert('Lien copié', 'Le lien de la photo a été copié');
        }
      } else {
        await Share.share({ message: currentPhoto.uri, url: currentPhoto.uri });
      }
    } catch (shareError) {
      Alert.alert('Erreur', 'Le partage a échoué');
    }
  }, [handleHapticFeedback, currentPhoto?.uri]);

  const toggleActions = useCallback(() => {
    setShowActions(prev => !prev);
  }, []);

  const navigatePhoto = useCallback((direction: 'prev' | 'next') => {
    if (!photo) return;
    
    const newIndex = direction === 'next' 
      ? Math.min(currentIndex + 1, photo.albumPhotos.length - 1)
      : Math.max(currentIndex - 1, 0);
    
    if (newIndex !== currentIndex) {
      setCurrentIndex(newIndex);
      handleHapticFeedback('light');
    }
  }, [photo, currentIndex, handleHapticFeedback]);
  
  // Swipe gesture handler
  const swipeGesture = useMemo(() => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 10;
      },
      onPanResponderGrant: () => {
        swipeAnim.setOffset((swipeAnim as any)._value);
        swipeAnim.setValue(0);
      },
      onPanResponderMove: (_, gestureState) => {
        swipeAnim.setValue(gestureState.dx);
      },
      onPanResponderRelease: (_, gestureState) => {
        swipeAnim.flattenOffset();
        
        if (Math.abs(gestureState.dx) > 100 && photo) {
          const direction = gestureState.dx > 0 ? -1 : 1; // Swipe right = previous, swipe left = next
          const newIndex = currentIndex + direction;
          
          if (newIndex >= 0 && newIndex < photo.albumPhotos.length) {
            // Animate to new position
            Animated.timing(swipeAnim, {
              toValue: direction * screenWidth,
              duration: 200,
              useNativeDriver: true,
            }).start(() => {
              setCurrentIndex(newIndex);
              swipeAnim.setValue(0);
              handleHapticFeedback('light');
            });
          } else {
            // Bounce back
            Animated.spring(swipeAnim, {
              toValue: 0,
              useNativeDriver: true,
            }).start();
          }
        } else {
          // Bounce back
          Animated.spring(swipeAnim, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    });
  }, [swipeAnim, currentIndex, photo, handleHapticFeedback]);

  // Pinch to zoom gesture
  const zoomGesture = useMemo(() => {
    let initialDistance = 0;
    let initialScale = 1;
    
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        const touches = (gestureState as any).touches;
        return touches && touches.length === 2;
      },
      onPanResponderGrant: (_, gestureState) => {
        const touches = (gestureState as any).touches;
        if (touches && touches.length === 2) {
          const dx = touches[0].pageX - touches[1].pageX;
          const dy = touches[0].pageY - touches[1].pageY;
          initialDistance = Math.sqrt(dx * dx + dy * dy);
          initialScale = (scaleAnim as any)._value;
        }
      },
      onPanResponderMove: (_, gestureState) => {
        const touches = (gestureState as any).touches;
        if (touches && touches.length === 2) {
          const dx = touches[0].pageX - touches[1].pageX;
          const dy = touches[0].pageY - touches[1].pageY;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const scale = Math.max(1, Math.min(3, initialScale * (distance / initialDistance)));
          scaleAnim.setValue(scale);
        }
      },
      onPanResponderRelease: () => {
        const currentScale = (scaleAnim as any)._value;
        if (currentScale < 1.2) {
          Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
          }).start();
          Animated.spring(translateXAnim, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
          Animated.spring(translateYAnim, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    });
  }, [scaleAnim, translateXAnim, translateYAnim]);

  if (!photo) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#000000', '#1a1a1a']} style={StyleSheet.absoluteFillObject} />
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
          <Stack.Screen options={{ headerShown: false }} />
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Photo introuvable</Text>
            <Pressable style={styles.backButton} onPress={() => router.back()}>
              <Text style={styles.backButtonText}>Retour</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <LinearGradient colors={['#000000', '#1a1a1a']} style={StyleSheet.absoluteFillObject} />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <Stack.Screen options={{ headerShown: false }} />
        
        {/* Header */}
        {showActions && (
          <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) + 8 }]}>
            {Platform.OS !== 'web' ? (
              <BlurView intensity={30} style={styles.headerBlur}>
                <View style={styles.headerContent}>
                  <Pressable style={styles.headerButton} onPress={() => router.back()}>
                    <ArrowLeft color="#FFFFFF" size={24} />
                  </Pressable>
                  <View style={styles.headerInfo}>
                    <Text style={styles.albumName}>{currentPhoto?.albumName}</Text>
                    <Text style={styles.photoIndex}>{(currentPhoto?.index || 0) + 1} / {photo.albumPhotos.length}</Text>
                  </View>
                  <View style={styles.headerActions}>
                    <Pressable style={styles.headerButton} onPress={handleShare}>
                      <Share2 color="#FFFFFF" size={20} />
                    </Pressable>
                  </View>
                </View>
              </BlurView>
            ) : (
              <View style={[styles.headerBlur, styles.webBlur]}>
                <View style={styles.headerContent}>
                  <Pressable style={styles.headerButton} onPress={() => router.back()}>
                    <ArrowLeft color="#FFFFFF" size={24} />
                  </Pressable>
                  <View style={styles.headerInfo}>
                    <Text style={styles.albumName}>{currentPhoto?.albumName}</Text>
                    <Text style={styles.photoIndex}>{(currentPhoto?.index || 0) + 1} / {photo.albumPhotos.length}</Text>
                  </View>
                  <View style={styles.headerActions}>
                    <Pressable style={styles.headerButton} onPress={handleShare}>
                      <Share2 color="#FFFFFF" size={20} />
                    </Pressable>
                  </View>
                </View>
              </View>
            )}
          </View>
        )}
        
        {/* Photo Container */}
        <View style={styles.photoContainer}>
          <Animated.View 
            style={[
              styles.photoWrapper, 
              { 
                transform: [
                  { translateX: swipeAnim },
                  { scale: scaleAnim },
                  { translateX: translateXAnim },
                  { translateY: translateYAnim }
                ]
              }
            ]}
            {...swipeGesture.panHandlers}
            {...zoomGesture.panHandlers}
          >
            <Pressable onPress={toggleActions} style={styles.photoTouchable}>
              <Image 
                source={{ uri: currentPhoto?.uri || '' }} 
                style={styles.photo} 
                contentFit="contain"
                transition={300}
              />
            </Pressable>
          </Animated.View>
          
          {/* Navigation arrows */}
          {photo.albumPhotos.length > 1 && showActions && (
            <>
              {currentIndex > 0 && (
                <Pressable 
                  style={[styles.navButton, styles.navButtonLeft]} 
                  onPress={() => navigatePhoto('prev')}
                >
                  <ChevronLeft color="#FFFFFF" size={32} />
                </Pressable>
              )}
              {currentIndex < photo.albumPhotos.length - 1 && (
                <Pressable 
                  style={[styles.navButton, styles.navButtonRight]} 
                  onPress={() => navigatePhoto('next')}
                >
                  <ChevronRight color="#FFFFFF" size={32} />
                </Pressable>
              )}
            </>
          )}
          
          {/* Swipe indicators */}
          {photo && photo.albumPhotos.length > 1 && showActions && (
            <View style={styles.swipeIndicators}>
              {photo.albumPhotos.map((_, index) => (
                <View 
                  key={index} 
                  style={[
                    styles.swipeIndicator, 
                    index === currentIndex && styles.activeSwipeIndicator
                  ]} 
                />
              ))}
            </View>
          )}
        </View>
        
        {/* Actions */}
        {showActions && (
          <View style={styles.actions}>
            {Platform.OS !== 'web' ? (
              <BlurView intensity={30} style={styles.actionsBlur}>
                <View style={styles.actionsContent}>
                  <View style={styles.leftActions}>
                    <Pressable style={styles.actionButton} onPress={handleLike}>
                      <Heart 
                        color={isLiked ? '#FF6B6B' : '#FFFFFF'} 
                        size={28} 
                        fill={isLiked ? '#FF6B6B' : 'transparent'}
                      />
                      <Text style={styles.actionCount}>{likes.length}</Text>
                    </Pressable>
                    
                    <Pressable style={styles.actionButton} onPress={() => setShowComments(!showComments)}>
                      <MessageCircle color="#FFFFFF" size={28} />
                      <Text style={styles.actionCount}>{photoComments.length}</Text>
                    </Pressable>
                  </View>
                  
                  <Pressable 
                    style={[styles.saveButton, isDownloading && styles.disabledButton]} 
                    onPress={handleSave}
                    disabled={isDownloading}
                  >
                    <Download color={isDownloading ? "#666666" : "#FFFFFF"} size={24} />
                  </Pressable>
                </View>
              </BlurView>
            ) : (
              <View style={[styles.actionsBlur, styles.webBlur]}>
                <View style={styles.actionsContent}>
                  <View style={styles.leftActions}>
                    <Pressable style={styles.actionButton} onPress={handleLike}>
                      <Heart 
                        color={isLiked ? '#FF6B6B' : '#FFFFFF'} 
                        size={28} 
                        fill={isLiked ? '#FF6B6B' : 'transparent'}
                      />
                      <Text style={styles.actionCount}>{likes.length}</Text>
                    </Pressable>
                    
                    <Pressable style={styles.actionButton} onPress={() => setShowComments(!showComments)}>
                      <MessageCircle color="#FFFFFF" size={28} />
                      <Text style={styles.actionCount}>{photoComments.length}</Text>
                    </Pressable>
                  </View>
                  
                  <Pressable 
                    style={[styles.saveButton, isDownloading && styles.disabledButton]} 
                    onPress={handleSave}
                    disabled={isDownloading}
                  >
                    <Download color={isDownloading ? "#666666" : "#FFFFFF"} size={24} />
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        )}
        
        {/* Comments Section */}
        {showComments && showActions && (
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={[styles.commentsContainer, { paddingBottom: Platform.OS === 'ios' ? insets.bottom : 0 }]}
          >
            {Platform.OS !== 'web' ? (
              <BlurView intensity={40} style={styles.commentsBlur}>
                <View style={styles.commentsContent}>
                  <View style={styles.commentsHeader}>
                    <Text style={styles.commentsTitle}>Commentaires ({photoComments.length})</Text>
                    <Pressable onPress={() => setShowComments(false)}>
                      <X color="#FFFFFF" size={20} />
                    </Pressable>
                  </View>
                  
                  <ScrollView style={styles.commentsList} showsVerticalScrollIndicator={false}>
                    {photoComments.map(comment => (
                      <View key={comment.id} style={styles.commentItem}>
                        <View style={styles.commentHeader}>
                          <Text style={styles.commentAuthor}>{comment.author}</Text>
                          <Text style={styles.commentDate}>
                            {new Date(comment.createdAt).toLocaleDateString('fr-FR')}
                          </Text>
                          <Pressable 
                            style={styles.deleteCommentButton}
                            onPress={() => handleDeleteComment(comment.id)}
                          >
                            <Trash2 color="#FF6B6B" size={16} />
                          </Pressable>
                        </View>
                        <Text style={styles.commentText}>{comment.text}</Text>
                      </View>
                    ))}
                  </ScrollView>
                  
                  <View style={styles.commentInput}>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Ajouter un commentaire..."
                      placeholderTextColor="#A9AFBC"
                      value={commentText}
                      onChangeText={setCommentText}
                      multiline
                      maxLength={500}
                      returnKeyType="send"
                      onSubmitEditing={handleAddComment}
                    />
                    <Pressable 
                      style={[styles.sendButton, { opacity: commentText.trim() ? 1 : 0.5 }]}
                      onPress={handleAddComment}
                      disabled={!commentText.trim()}
                    >
                      <Send color={Colors.palette.accentGold} size={20} />
                    </Pressable>
                  </View>
                </View>
              </BlurView>
            ) : (
              <View style={[styles.commentsBlur, styles.webBlur]}>
                <View style={styles.commentsContent}>
                  <View style={styles.commentsHeader}>
                    <Text style={styles.commentsTitle}>Commentaires ({photoComments.length})</Text>
                    <Pressable onPress={() => setShowComments(false)}>
                      <X color="#FFFFFF" size={20} />
                    </Pressable>
                  </View>
                  
                  <ScrollView style={styles.commentsList} showsVerticalScrollIndicator={false}>
                    {photoComments.map(comment => (
                      <View key={comment.id} style={styles.commentItem}>
                        <View style={styles.commentHeader}>
                          <Text style={styles.commentAuthor}>{comment.author}</Text>
                          <Text style={styles.commentDate}>
                            {new Date(comment.createdAt).toLocaleDateString('fr-FR')}
                          </Text>
                          <Pressable 
                            style={styles.deleteCommentButton}
                            onPress={() => handleDeleteComment(comment.id)}
                          >
                            <Trash2 color="#FF6B6B" size={16} />
                          </Pressable>
                        </View>
                        <Text style={styles.commentText}>{comment.text}</Text>
                      </View>
                    ))}
                  </ScrollView>
                  
                  <View style={styles.commentInput}>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Ajouter un commentaire..."
                      placeholderTextColor="#A9AFBC"
                      value={commentText}
                      onChangeText={setCommentText}
                      multiline
                      maxLength={500}
                      returnKeyType="send"
                      onSubmitEditing={handleAddComment}
                    />
                    <Pressable 
                      style={[styles.sendButton, { opacity: commentText.trim() ? 1 : 0.5 }]}
                      onPress={handleAddComment}
                      disabled={!commentText.trim()}
                    >
                      <Send color={Colors.palette.accentGold} size={20} />
                    </Pressable>
                  </View>
                </View>
              </View>
            )}
          </KeyboardAvoidingView>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    paddingHorizontal: 20,
  },
  headerBlur: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginHorizontal: 0,
  },
  webBlur: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    backdropFilter: 'blur(20px)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerButton: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  headerInfo: {
    alignItems: 'center',
  },
  albumName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  photoIndex: {
    color: '#A9AFBC',
    fontSize: 12,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  photoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
    paddingBottom: 140,
    paddingHorizontal: 10,
  },
  photoTouchable: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoWrapper: {
    width: '100%',
    height: '100%',
  },
  photo: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
    backgroundColor: '#000000',
  },
  navButton: {
    position: 'absolute',
    top: '50%',
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  navButtonLeft: {
    left: 20,
  },
  navButtonRight: {
    right: 20,
  },
  swipeIndicators: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    zIndex: 5,
  },
  swipeIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  activeSwipeIndicator: {
    backgroundColor: '#FFD700',
    width: 24,
  },
  actions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    paddingBottom: 12,
  },
  actionsBlur: {
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  actionsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftActions: {
    flexDirection: 'row',
    gap: 20,
  },
  actionButton: {
    alignItems: 'center',
    gap: 4,
  },
  actionCount: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  saveButton: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  disabledButton: {
    opacity: 0.5,
  },
  commentsContainer: {
    position: 'absolute',
    bottom: 140,
    left: 0,
    right: 0,
    maxHeight: '60%',
    zIndex: 15,
  },
  commentsBlur: {
    margin: 20,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.9)',
  },
  commentsContent: {
    padding: 20,
  },
  commentsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  commentsTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  commentsList: {
    maxHeight: 200,
    marginBottom: 16,
  },
  commentItem: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  commentAuthor: {
    color: Colors.palette.accentGold,
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  commentDate: {
    color: '#A9AFBC',
    fontSize: 12,
    marginRight: 8,
  },
  deleteCommentButton: {
    padding: 4,
  },
  commentText: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
  },
  commentInput: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.2)',
  },
  textInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    maxHeight: 80,
    paddingVertical: 4,
    lineHeight: 20,
  },
  sendButton: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,215,0,0.2)',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  backButton: {
    backgroundColor: Colors.palette.accentGold,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '700',
  },
});