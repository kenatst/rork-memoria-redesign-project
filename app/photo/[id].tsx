import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { View, StyleSheet, Text, Pressable, Alert, Platform, ScrollView, TextInput, KeyboardAvoidingView, Animated, Dimensions, Modal, Share } from 'react-native';
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
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Tag,
  Plus,
  X,
  ZoomIn
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useAppState } from '@/providers/AppStateProvider';
import UniversalComments from '@/components/UniversalComments';
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
  
  const { albums, comments, addComment, deleteComment, photos, addTagToPhoto, removeTagFromPhoto } = useAppState();
  
  const [likes, setLikes] = useState<PhotoLike[]>([]);
  const [isLiked, setIsLiked] = useState<boolean>(false);
  const [commentText, setCommentText] = useState<string>('');
  const [showComments, setShowComments] = useState<boolean>(false);
  const [slideshowMode, setSlideshowMode] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState<number>(0);
  const slideshowInterval = useRef<number | null>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const [showTagInput, setShowTagInput] = useState<boolean>(false);
  const [newTag, setNewTag] = useState<string>('');
  const [showUniversalComments, setShowUniversalComments] = useState<boolean>(false);
  const [showFullscreen, setShowFullscreen] = useState<boolean>(false);
  const [showActions, setShowActions] = useState<boolean>(true);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  
  const targetUri = useMemo(() => (id ? decodeURIComponent(id) : ''), [id]);
  
  // Trouver la photo dans les albums - memoized to prevent infinite loops
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
  
  // Current photo for slideshow - memoized to prevent re-renders
  const currentPhoto = useMemo(() => {
    if (!photo || !slideshowMode) return photo;
    return {
      ...photo,
      uri: photo.albumPhotos[currentPhotoIndex],
      index: currentPhotoIndex
    };
  }, [photo, slideshowMode, currentPhotoIndex]);
  
  const photoComments = useMemo(() => {
    if (!targetUri || !comments) return [];
    return comments.filter(c => c.photoId === targetUri);
  }, [comments, targetUri]);
  
  // Get photo tags - using useMemo to prevent infinite loops
  const photoTags = useMemo(() => {
    if (!targetUri || !photos || photos.length === 0) return [];
    const photoData = photos.find(p => p.uri === targetUri);
    return photoData?.tags ?? [];
  }, [photos, targetUri]);
  
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
    if (commentText.trim() && targetUri) {
      addComment(commentText.trim(), targetUri);
      setCommentText('');
      handleHapticFeedback('light');
    }
  }, [commentText, targetUri, addComment, handleHapticFeedback]);
  
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
  
  const startSlideshow = useCallback(() => {
    if (!photo) return;
    setSlideshowMode(true);
    setCurrentPhotoIndex(photo.index);
    setIsPlaying(true);
    handleHapticFeedback('medium');
  }, [photo, handleHapticFeedback]);
  
  const stopSlideshow = useCallback(() => {
    setSlideshowMode(false);
    setIsPlaying(false);
    if (slideshowInterval.current) {
      clearInterval(slideshowInterval.current);
      slideshowInterval.current = null;
    }
    handleHapticFeedback('light');
  }, [handleHapticFeedback]);
  
  const togglePlayPause = useCallback(() => {
    setIsPlaying(prev => !prev);
    handleHapticFeedback('light');
  }, [handleHapticFeedback]);
  
  const nextPhoto = useCallback(() => {
    if (!photo) return;
    const nextIndex = (currentPhotoIndex + 1) % photo.albumPhotos.length;
    
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true })
    ]).start();
    
    setCurrentPhotoIndex(nextIndex);
    handleHapticFeedback('light');
  }, [photo, currentPhotoIndex, fadeAnim, handleHapticFeedback]);
  
  const previousPhoto = useCallback(() => {
    if (!photo) return;
    const prevIndex = currentPhotoIndex === 0 ? photo.albumPhotos.length - 1 : currentPhotoIndex - 1;
    
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true })
    ]).start();
    
    setCurrentPhotoIndex(prevIndex);
    handleHapticFeedback('light');
  }, [photo, currentPhotoIndex, fadeAnim, handleHapticFeedback]);
  
  // Auto-play slideshow
  useEffect(() => {
    if (slideshowMode && isPlaying && photo) {
      if (slideshowInterval.current) {
        clearInterval(slideshowInterval.current);
        slideshowInterval.current = null;
      }
      const total = photo.albumPhotos.length;
      slideshowInterval.current = setInterval(() => {
        setCurrentPhotoIndex(prev => {
          const next = (prev + 1) % Math.max(total, 1);
          return next;
        });
      }, 3000) as unknown as number;
    } else if (slideshowInterval.current) {
      clearInterval(slideshowInterval.current);
      slideshowInterval.current = null;
    }
    
    return () => {
      if (slideshowInterval.current) {
        clearInterval(slideshowInterval.current);
      }
    };
  }, [slideshowMode, isPlaying, photo]);
  
  const handleAddTag = useCallback(() => {
    if (!newTag.trim() || !targetUri || !photos) return;
    const photoData = photos.find(p => p.uri === targetUri);
    if (photoData) {
      addTagToPhoto(photoData.id, newTag.trim());
      setNewTag('');
      setShowTagInput(false);
      handleHapticFeedback('light');
    }
  }, [newTag, targetUri, photos, addTagToPhoto, handleHapticFeedback]);
  
  const handleRemoveTag = useCallback((tag: string) => {
    if (!targetUri || !photos) return;
    const photoData = photos.find(p => p.uri === targetUri);
    if (photoData) {
      removeTagFromPhoto(photoData.id, tag);
      handleHapticFeedback('light');
    }
  }, [targetUri, photos, removeTagFromPhoto, handleHapticFeedback]);
  
  const toggleFullscreen = useCallback(() => {
    setShowFullscreen(prev => !prev);
    handleHapticFeedback('light');
  }, [handleHapticFeedback]);

  const toggleActions = useCallback(() => {
    setShowActions(prev => !prev);
  }, []);

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
                  <Text style={styles.photoIndex}>{(currentPhoto?.index || 0) + 1} / {albums.find(a => a.id === currentPhoto?.albumId)?.photos.length || 0}</Text>
                  {slideshowMode && (
                    <Text style={styles.slideshowIndicator}>Mode Diaporama</Text>
                  )}
                </View>
                <View style={styles.headerActions}>
                  <Pressable style={styles.headerButton} onPress={startSlideshow}>
                    <Play color="#FFFFFF" size={20} />
                  </Pressable>
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
                  <Text style={styles.photoIndex}>{(currentPhoto?.index || 0) + 1} / {albums.find(a => a.id === currentPhoto?.albumId)?.photos.length || 0}</Text>
                  {slideshowMode && (
                    <Text style={styles.slideshowIndicator}>Mode Diaporama</Text>
                  )}
                </View>
                <View style={styles.headerActions}>
                  <Pressable style={styles.headerButton} onPress={startSlideshow}>
                    <Play color="#FFFFFF" size={20} />
                  </Pressable>
                  <Pressable style={styles.headerButton} onPress={handleShare}>
                    <Share2 color="#FFFFFF" size={20} />
                  </Pressable>
                </View>
              </View>
            </View>
          )}
          </View>
        )}
        
        {/* Photo */}
        <Pressable 
          style={styles.photoContainer} 
          onPress={toggleActions}

        >
          <Animated.View style={[styles.photoWrapper, { opacity: fadeAnim }]}>
            <Pressable onPress={toggleFullscreen} style={styles.photoTouchable}>
              <Image 
                source={{ uri: currentPhoto?.uri || '' }} 
                style={styles.photo} 
                contentFit="contain"
                transition={300}
              />
              {!showFullscreen && (
                <View style={styles.zoomIndicator}>
                  <ZoomIn color="#FFFFFF" size={20} />
                </View>
              )}
            </Pressable>
          </Animated.View>
          
          {/* Slideshow Controls */}
          {slideshowMode && (
            <View style={styles.slideshowControls}>
              {Platform.OS !== 'web' ? (
                <BlurView intensity={30} style={styles.slideshowControlsBlur}>
                  <View style={styles.slideshowControlsContent}>
                    <Pressable style={styles.slideshowButton} onPress={previousPhoto}>
                      <SkipBack color="#FFFFFF" size={24} />
                    </Pressable>
                    
                    <Pressable style={styles.slideshowButton} onPress={togglePlayPause}>
                      {isPlaying ? (
                        <Pause color="#FFFFFF" size={28} />
                      ) : (
                        <Play color="#FFFFFF" size={28} />
                      )}
                    </Pressable>
                    
                    <Pressable style={styles.slideshowButton} onPress={nextPhoto}>
                      <SkipForward color="#FFFFFF" size={24} />
                    </Pressable>
                    
                    <Pressable style={styles.exitSlideshowButton} onPress={stopSlideshow}>
                      <Text style={styles.exitSlideshowText}>Quitter</Text>
                    </Pressable>
                  </View>
                </BlurView>
              ) : (
                <View style={[styles.slideshowControlsBlur, styles.webBlur]}>
                  <View style={styles.slideshowControlsContent}>
                    <Pressable style={styles.slideshowButton} onPress={previousPhoto}>
                      <SkipBack color="#FFFFFF" size={24} />
                    </Pressable>
                    
                    <Pressable style={styles.slideshowButton} onPress={togglePlayPause}>
                      {isPlaying ? (
                        <Pause color="#FFFFFF" size={28} />
                      ) : (
                        <Play color="#FFFFFF" size={28} />
                      )}
                    </Pressable>
                    
                    <Pressable style={styles.slideshowButton} onPress={nextPhoto}>
                      <SkipForward color="#FFFFFF" size={24} />
                    </Pressable>
                    
                    <Pressable style={styles.exitSlideshowButton} onPress={stopSlideshow}>
                      <Text style={styles.exitSlideshowText}>Quitter</Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </View>
          )}
        </Pressable>
        
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
                  
                  <Pressable style={styles.actionButton} onPress={() => {
                    setShowComments(!showComments);
                    if (Platform.OS !== 'web') {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                  }}>
                    <MessageCircle color="#FFFFFF" size={28} />
                    <Text style={styles.actionCount}>{photoComments.length}</Text>
                  </Pressable>
                  
                  <Pressable style={styles.actionButton} onPress={() => setShowTagInput(true)}>
                    <Tag color="#FFFFFF" size={28} />
                    <Text style={styles.actionCount}>{photoTags.length}</Text>
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
                  
                  <Pressable style={styles.actionButton} onPress={() => {
                    setShowComments(!showComments);
                    if (Platform.OS !== 'web') {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                  }}>
                    <MessageCircle color="#FFFFFF" size={28} />
                    <Text style={styles.actionCount}>{photoComments.length}</Text>
                  </Pressable>
                  
                  <Pressable style={styles.actionButton} onPress={() => setShowTagInput(true)}>
                    <Tag color="#FFFFFF" size={28} />
                    <Text style={styles.actionCount}>{photoTags.length}</Text>
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
        {showComments && !slideshowMode && showActions && (
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={[styles.commentsContainer, { paddingBottom: Platform.OS === 'ios' ? insets.bottom : 0 }]}
          >
            {Platform.OS !== 'web' ? (
              <BlurView intensity={40} style={styles.commentsBlur}>
                <View style={styles.commentsContent}>
                  <Text style={styles.commentsTitle}>Commentaires ({photoComments.length})</Text>
                  
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
                  <Text style={styles.commentsTitle}>Commentaires ({photoComments.length})</Text>
                  
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
        
        {/* Tags Section */}
        {photoTags.length > 0 && !slideshowMode && showActions && (
          <View style={styles.tagsContainer}>
            {Platform.OS !== 'web' ? (
              <BlurView intensity={20} style={styles.tagsBlur}>
                <View style={styles.tagsContent}>
                  <Text style={styles.tagsTitle}>Tags</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.tagsList}>
                      {photoTags.map((tag, index) => (
                        <Pressable 
                          key={index} 
                          style={styles.tagChip}
                          onPress={() => handleRemoveTag(tag)}
                        >
                          <Text style={styles.tagText}>#{tag}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              </BlurView>
            ) : (
              <View style={[styles.tagsBlur, styles.webBlur]}>
                <View style={styles.tagsContent}>
                  <Text style={styles.tagsTitle}>Tags</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.tagsList}>
                      {photoTags.map((tag, index) => (
                        <Pressable 
                          key={index} 
                          style={styles.tagChip}
                          onPress={() => handleRemoveTag(tag)}
                        >
                          <Text style={styles.tagText}>#{tag}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              </View>
            )}
          </View>
        )}
        
        {/* Tag Input Modal */}
        {showTagInput && (
          <View style={styles.tagInputOverlay}>
            {Platform.OS !== 'web' ? (
              <BlurView intensity={40} style={styles.tagInputBlur}>
                <View style={styles.tagInputContent}>
                  <Text style={styles.tagInputTitle}>Ajouter un tag</Text>
                  <View style={styles.tagInputRow}>
                    <TextInput
                      style={styles.tagInput}
                      placeholder="Nom du tag..."
                      placeholderTextColor="#A9AFBC"
                      value={newTag}
                      onChangeText={setNewTag}
                      autoFocus
                      maxLength={20}
                    />
                    <Pressable 
                      style={[styles.addTagButton, { opacity: newTag.trim() ? 1 : 0.5 }]}
                      onPress={handleAddTag}
                      disabled={!newTag.trim()}
                    >
                      <Plus color="#000000" size={20} />
                    </Pressable>
                  </View>
                  <Pressable style={styles.cancelTagButton} onPress={() => { setShowTagInput(false); setNewTag(''); }}>
                    <Text style={styles.cancelTagText}>Annuler</Text>
                  </Pressable>
                </View>
              </BlurView>
            ) : (
              <View style={[styles.tagInputBlur, styles.webBlur]}>
                <View style={styles.tagInputContent}>
                  <Text style={styles.tagInputTitle}>Ajouter un tag</Text>
                  <View style={styles.tagInputRow}>
                    <TextInput
                      style={styles.tagInput}
                      placeholder="Nom du tag..."
                      placeholderTextColor="#A9AFBC"
                      value={newTag}
                      onChangeText={setNewTag}
                      autoFocus
                      maxLength={20}
                    />
                    <Pressable 
                      style={[styles.addTagButton, { opacity: newTag.trim() ? 1 : 0.5 }]}
                      onPress={handleAddTag}
                      disabled={!newTag.trim()}
                    >
                      <Plus color="#000000" size={20} />
                    </Pressable>
                  </View>
                  <Pressable style={styles.cancelTagButton} onPress={() => { setShowTagInput(false); setNewTag(''); }}>
                    <Text style={styles.cancelTagText}>Annuler</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        )}
        
        {/* Fullscreen Modal */}
        <Modal
          visible={showFullscreen}
          animationType="fade"
          statusBarTranslucent
          onRequestClose={() => setShowFullscreen(false)}
        >
          <View style={styles.fullscreenContainer}>
            <LinearGradient colors={['#000000', '#000000']} style={StyleSheet.absoluteFillObject} />
            
            {/* Fullscreen Header */}
            <SafeAreaView style={[styles.fullscreenHeader, { paddingTop: Math.max(insets.top, 12) }]} edges={['top']}>
              <Pressable style={styles.fullscreenCloseButton} onPress={() => setShowFullscreen(false)} testID="close-fullscreen">
                <X color="#FFFFFF" size={24} />
              </Pressable>
            </SafeAreaView>
            
            {/* Fullscreen Photo */}
            <View style={styles.fullscreenPhotoContainer}>
              <Image 
                source={{ uri: currentPhoto?.uri || '' }} 
                style={styles.fullscreenPhoto} 
                contentFit="contain"
                transition={300}
              />
            </View>
            
            {/* Fullscreen Actions */}
            <SafeAreaView style={styles.fullscreenActions} edges={['bottom']}>
              <View style={styles.fullscreenActionsContent}>
                <Pressable style={styles.fullscreenActionButton} onPress={handleLike} testID="fs-like">
                  <Heart 
                    color={isLiked ? '#FF6B6B' : '#FFFFFF'} 
                    size={28} 
                    fill={isLiked ? '#FF6B6B' : 'transparent'}
                  />
                  <Text style={styles.fullscreenActionText}>{likes.length}</Text>
                </Pressable>
                
                <Pressable style={styles.fullscreenActionButton} onPress={() => setShowUniversalComments(true)} testID="fs-comments">
                  <MessageCircle color="#FFFFFF" size={28} />
                  <Text style={styles.fullscreenActionText}>{photoComments.length}</Text>
                </Pressable>
                
                <Pressable style={styles.fullscreenActionButton} onPress={handleShare} testID="fs-share">
                  <Share2 color="#FFFFFF" size={28} />
                  <Text style={styles.fullscreenActionText}>Partager</Text>
                </Pressable>
                
                <Pressable style={styles.fullscreenActionButton} onPress={handleSave} testID="fs-download">
                  <Download color="#FFFFFF" size={28} />
                  <Text style={styles.fullscreenActionText}>Sauver</Text>
                </Pressable>
              </View>
            </SafeAreaView>
          </View>
        </Modal>
        
        {/* Universal Comments Modal */}
        <UniversalComments
          visible={showUniversalComments}
          onClose={() => setShowUniversalComments(false)}
          photoId={targetUri}
          photoUri={currentPhoto?.uri}
        />
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
    position: 'relative',
  },
  zoomIndicator: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 20,
    padding: 8,
  },
  photo: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
    backgroundColor: '#000000',
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
  commentsContainer: {
    position: 'absolute',
    bottom: 140,
    left: 0,
    right: 0,
    maxHeight: '50%',
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
  commentsTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
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
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  slideshowIndicator: {
    color: '#FFD700',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  photoWrapper: {
    width: '100%',
    height: '100%',
  },
  slideshowControls: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    zIndex: 25,
  },
  slideshowControlsBlur: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  slideshowControlsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 20,
  },
  slideshowButton: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  exitSlideshowButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#FF3B30',
  },
  exitSlideshowText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  tagsContainer: {
    position: 'absolute',
    bottom: 200,
    left: 0,
    right: 0,
    zIndex: 15,
  },
  tagsBlur: {
    margin: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  tagsContent: {
    padding: 16,
  },
  tagsTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  tagsList: {
    flexDirection: 'row',
    gap: 8,
  },
  tagChip: {
    backgroundColor: 'rgba(255,215,0,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.3)',
  },
  tagText: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '600',
  },
  tagInputOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 30,
  },
  tagInputBlur: {
    borderRadius: 20,
    overflow: 'hidden',
    margin: 20,
  },
  tagInputContent: {
    padding: 24,
    alignItems: 'center',
    gap: 16,
  },
  tagInputTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  tagInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  tagInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#FFFFFF',
    fontSize: 16,
  },
  addTagButton: {
    backgroundColor: '#FFD700',
    padding: 12,
    borderRadius: 12,
  },
  cancelTagButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  cancelTagText: {
    color: '#A9AFBC',
    fontSize: 16,
    fontWeight: '600',
  },
  fullscreenContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  fullscreenHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  fullscreenCloseButton: {
    alignSelf: 'flex-end',
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.8)',
    marginTop: 8,
  },
  fullscreenPhotoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenPhoto: {
    width: screenWidth,
    height: screenHeight,
  },
  fullscreenActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  fullscreenActionsContent: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  fullscreenActionButton: {
    alignItems: 'center',
    gap: 8,
    padding: 12,
  },
  fullscreenActionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
  },
});