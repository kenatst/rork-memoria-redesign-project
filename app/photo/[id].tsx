import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Text, Pressable, Alert, Platform, ScrollView, TextInput, KeyboardAvoidingView } from 'react-native';
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
  Send
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useAppState } from '@/providers/AppStateProvider';

interface PhotoLike {
  id: string;
  userId: string;
  photoId: string;
  createdAt: string;
}

export default function PhotoDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { albums, comments, addComment, deleteComment } = useAppState();
  
  const [likes, setLikes] = useState<PhotoLike[]>([]);
  const [isLiked, setIsLiked] = useState<boolean>(false);
  const [commentText, setCommentText] = useState<string>('');
  const [showComments, setShowComments] = useState<boolean>(false);
  
  // Trouver la photo dans les albums
  const photo = React.useMemo(() => {
    for (const album of albums) {
      const photoIndex = album.photos.findIndex(p => p.includes(id || ''));
      if (photoIndex !== -1) {
        return {
          uri: album.photos[photoIndex],
          albumId: album.id,
          albumName: album.name,
          index: photoIndex
        };
      }
    }
    return null;
  }, [albums, id]);
  
  const photoComments = React.useMemo(() => 
    comments.filter(c => c.photoId === id),
    [comments, id]
  );
  
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
    if (commentText.trim() && id) {
      addComment(commentText.trim(), id);
      setCommentText('');
      handleHapticFeedback('light');
    }
  }, [commentText, id, addComment, handleHapticFeedback]);
  
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
  
  if (!photo) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#000000', '#1a1a1a']} style={StyleSheet.absoluteFillObject} />
        <SafeAreaView style={styles.safeArea}>
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
      <SafeAreaView style={styles.safeArea}>
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
                  <Text style={styles.albumName}>{photo.albumName}</Text>
                  <Text style={styles.photoIndex}>{photo.index + 1} / {albums.find(a => a.id === photo.albumId)?.photos.length || 0}</Text>
                </View>
                <Pressable style={styles.headerButton} onPress={handleShare}>
                  <Share2 color="#FFFFFF" size={24} />
                </Pressable>
              </View>
            </BlurView>
          ) : (
            <View style={[styles.headerBlur, styles.webBlur]}>
              <View style={styles.headerContent}>
                <Pressable style={styles.headerButton} onPress={() => router.back()}>
                  <ArrowLeft color="#FFFFFF" size={24} />
                </Pressable>
                <View style={styles.headerInfo}>
                  <Text style={styles.albumName}>{photo.albumName}</Text>
                  <Text style={styles.photoIndex}>{photo.index + 1} / {albums.find(a => a.id === photo.albumId)?.photos.length || 0}</Text>
                </View>
                <Pressable style={styles.headerButton} onPress={handleShare}>
                  <Share2 color="#FFFFFF" size={24} />
                </Pressable>
              </View>
            </View>
          )}
        </View>
        
        {/* Photo */}
        <View style={styles.photoContainer}>
          <Image 
            source={{ uri: photo.uri }} 
            style={styles.photo} 
            contentFit="contain"
            transition={300}
          />
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
                  
                  <Pressable style={styles.actionButton} onPress={() => setShowComments(!showComments)}>
                    <MessageCircle color="#FFFFFF" size={28} />
                    <Text style={styles.actionCount}>{photoComments.length}</Text>
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
                  
                  <Pressable style={styles.actionButton} onPress={() => setShowComments(!showComments)}>
                    <MessageCircle color="#FFFFFF" size={28} />
                    <Text style={styles.actionCount}>{photoComments.length}</Text>
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
        {showComments && (
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
});