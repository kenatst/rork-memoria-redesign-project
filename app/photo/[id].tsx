import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, StyleSheet, Text, Pressable, Alert, Platform, ScrollView, TextInput, KeyboardAvoidingView, Animated } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
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
  Plus
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useAppState } from '@/providers/AppStateProvider';
import UniversalComments from '@/components/UniversalComments';

interface PhotoLike {
  id: string;
  userId: string;
  photoId: string;
  createdAt: string;
}

export default function PhotoDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { albums, comments, addComment, deleteComment, photos, addTagToPhoto, removeTagFromPhoto } = useAppState();
  
  const [likes, setLikes] = useState<PhotoLike[]>([]);
  const [isLiked, setIsLiked] = useState<boolean>(false);
  const [commentText, setCommentText] = useState<string>('');
  const [showComments, setShowComments] = useState<boolean>(true);
  const [slideshowMode, setSlideshowMode] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState<number>(0);
  const slideshowInterval = useRef<number | null>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const [showTagInput, setShowTagInput] = useState<boolean>(false);
  const [newTag, setNewTag] = useState<string>('');
  const [photoTags, setPhotoTags] = useState<string[]>([]);
  const [showUniversalComments, setShowUniversalComments] = useState<boolean>(false);
  
  const targetUri = React.useMemo(() => (id ? decodeURIComponent(id) : ''), [id]);
  
  // Trouver la photo dans les albums
  const photo = React.useMemo(() => {
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
  
  // Current photo for slideshow
  const currentPhoto = React.useMemo(() => {
    if (!photo || !slideshowMode) return photo;
    return {
      ...photo,
      uri: photo.albumPhotos[currentPhotoIndex],
      index: currentPhotoIndex
    };
  }, [photo, slideshowMode, currentPhotoIndex]);
  
  const photoComments = React.useMemo(() => 
    comments.filter(c => c.photoId === targetUri),
    [comments, targetUri]
  );
  
  // Get photo tags
  useEffect(() => {
    const photoData = photos.find(p => p.uri === targetUri);
    if (photoData?.tags) {
      setPhotoTags(photoData.tags);
    }
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
  
  const handleSave = useCallback(() => {
    handleHapticFeedback('medium');
    Alert.alert('Sauvegardé', 'Photo sauvegardée dans votre galerie');
  }, [handleHapticFeedback]);
  
  const handleShare = useCallback(() => {
    handleHapticFeedback('medium');
    Alert.alert('Partager', 'Fonctionnalité de partage à venir');
  }, [handleHapticFeedback]);
  
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
    setIsPlaying(!isPlaying);
    handleHapticFeedback('light');
  }, [isPlaying, handleHapticFeedback]);
  
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
      slideshowInterval.current = setInterval(() => {
        nextPhoto();
      }, 3000) as unknown as number; // Change photo every 3 seconds
    } else if (slideshowInterval.current) {
      clearInterval(slideshowInterval.current);
      slideshowInterval.current = null;
    }
    
    return () => {
      if (slideshowInterval.current) {
        clearInterval(slideshowInterval.current);
      }
    };
  }, [slideshowMode, isPlaying, nextPhoto, photo]);
  
  const handleAddTag = useCallback(() => {
    if (!newTag.trim() || !targetUri) return;
    const photoData = photos.find(p => p.uri === targetUri);
    if (photoData) {
      addTagToPhoto(photoData.id, newTag.trim());
      setPhotoTags(prev => [...prev, newTag.trim()]);
      setNewTag('');
      setShowTagInput(false);
      handleHapticFeedback('light');
    }
  }, [newTag, targetUri, photos, addTagToPhoto, handleHapticFeedback]);
  
  const handleRemoveTag = useCallback((tag: string) => {
    const photoData = photos.find(p => p.uri === targetUri);
    if (photoData) {
      removeTagFromPhoto(photoData.id, tag);
      setPhotoTags(prev => prev.filter(t => t !== tag));
      handleHapticFeedback('light');
    }
  }, [targetUri, photos, removeTagFromPhoto, handleHapticFeedback]);
  
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
        <View style={styles.header}>
          {Platform.OS !== 'web' ? (
            <BlurView intensity={20} style={styles.headerBlur}>
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
        
        {/* Photo */}
        <View style={styles.photoContainer}>
          <Animated.View style={[styles.photoWrapper, { opacity: fadeAnim }]}>
            <Image 
              source={{ uri: currentPhoto?.uri || '' }} 
              style={styles.photo} 
              contentFit="contain"
              transition={300}
            />
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
        </View>
        
        {/* Actions */}
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
                  
                  <Pressable style={styles.actionButton} onPress={() => setShowUniversalComments(true)}>
                    <MessageCircle color="#FFFFFF" size={28} />
                    <Text style={styles.actionCount}>{photoComments.length}</Text>
                  </Pressable>
                  
                  <Pressable style={styles.actionButton} onPress={() => setShowTagInput(true)}>
                    <Tag color="#FFFFFF" size={28} />
                    <Text style={styles.actionCount}>{photoTags.length}</Text>
                  </Pressable>
                </View>
                
                <Pressable style={styles.saveButton} onPress={handleSave}>
                  <Download color="#FFFFFF" size={24} />
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
                  
                  <Pressable style={styles.actionButton} onPress={() => setShowUniversalComments(true)}>
                    <MessageCircle color="#FFFFFF" size={28} />
                    <Text style={styles.actionCount}>{photoComments.length}</Text>
                  </Pressable>
                  
                  <Pressable style={styles.actionButton} onPress={() => setShowTagInput(true)}>
                    <Tag color="#FFFFFF" size={28} />
                    <Text style={styles.actionCount}>{photoTags.length}</Text>
                  </Pressable>
                </View>
                
                <Pressable style={styles.saveButton} onPress={handleSave}>
                  <Download color="#FFFFFF" size={24} />
                </Pressable>
              </View>
            </View>
          )}
        </View>
        
        {/* Comments Section */}
        {showComments && !slideshowMode && (
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.commentsContainer}
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
        {photoTags.length > 0 && !slideshowMode && (
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
    paddingTop: 0,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    paddingTop: 50,
  },
  headerBlur: {
    paddingVertical: 12,
    paddingHorizontal: 20,
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
    paddingBottom: 120,
  },
  photo: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  actions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    paddingBottom: 40,
  },
  actionsBlur: {
    paddingVertical: 16,
    paddingHorizontal: 20,
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
    bottom: 100,
    left: 0,
    right: 0,
    maxHeight: '50%',
    zIndex: 15,
  },
  commentsBlur: {
    margin: 20,
    borderRadius: 16,
    overflow: 'hidden',
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
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  textInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    maxHeight: 100,
    paddingVertical: 8,
  },
  sendButton: {
    padding: 8,
    borderRadius: 8,
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
});