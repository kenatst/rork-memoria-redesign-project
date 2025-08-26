import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Modal, TextInput, Alert, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { MessageCircle, Heart, X, Send, User, Clock } from 'lucide-react-native';
import { useAppState, Comment } from '@/providers/AppStateProvider';
import Colors from '@/constants/colors';
import { Image } from 'expo-image';

interface UniversalCommentsProps {
  visible: boolean;
  onClose: () => void;
  photoId?: string;
  albumId?: string;
  photoUri?: string;
}

export default function UniversalComments({ visible, onClose, photoId, albumId, photoUri }: UniversalCommentsProps) {
  const { comments, addComment, displayName, photos, albums } = useAppState();
  const [newComment, setNewComment] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Filter comments for this photo or album
  const relevantComments = comments.filter(comment => 
    (photoId && comment.photoId === photoId) || 
    (albumId && comment.albumId === albumId)
  );

  const handleSubmitComment = useCallback(async () => {
    if (!newComment.trim() || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      addComment(newComment.trim(), photoId, albumId);
      setNewComment('');
      
      // Show success feedback
      Alert.alert('Commentaire ajouté', 'Votre commentaire est maintenant visible par tous les utilisateurs.');
    } catch (error) {
      console.error('Error adding comment:', error);
      Alert.alert('Erreur', 'Impossible d\'ajouter le commentaire.');
    } finally {
      setIsSubmitting(false);
    }
  }, [newComment, isSubmitting, addComment, photoId, albumId]);

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'À l\'instant';
    if (diffInMinutes < 60) return `Il y a ${diffInMinutes}min`;
    if (diffInMinutes < 1440) return `Il y a ${Math.floor(diffInMinutes / 60)}h`;
    return `Il y a ${Math.floor(diffInMinutes / 1440)}j`;
  };

  const getContextInfo = () => {
    if (photoId) {
      const photo = photos.find(p => p.id === photoId);
      return {
        type: 'photo',
        title: 'Photo',
        subtitle: photo ? `Ajoutée ${formatTimeAgo(photo.createdAt)}` : ''
      };
    }
    if (albumId) {
      const album = albums.find(a => a.id === albumId);
      return {
        type: 'album',
        title: album?.name || 'Album',
        subtitle: album ? `${album.photos.length} photos` : ''
      };
    }
    return { type: 'unknown', title: 'Commentaires', subtitle: '' };
  };

  const contextInfo = getContextInfo();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalContainer}>
          {Platform.OS !== 'web' ? (
            <BlurView intensity={20} style={styles.modalBlur}>
              <View style={styles.modalContent}>
                {/* Header */}
                <View style={styles.header}>
                  <View style={styles.headerInfo}>
                    <MessageCircle color={Colors.palette.accentGold} size={24} />
                    <View style={styles.headerText}>
                      <Text style={styles.headerTitle}>Commentaires</Text>
                      <Text style={styles.headerSubtitle}>
                        {contextInfo.title} • {relevantComments.length} commentaire(s)
                      </Text>
                    </View>
                  </View>
                  <Pressable style={styles.closeButton} onPress={onClose}>
                    <X color="#FFFFFF" size={24} />
                  </Pressable>
                </View>

                {/* Photo preview if available */}
                {photoUri && (
                  <View style={styles.photoPreview}>
                    <Image
                      source={{ uri: photoUri }}
                      style={styles.previewImage}
                      contentFit="cover"
                    />
                    <LinearGradient
                      colors={['transparent', 'rgba(0,0,0,0.6)']}
                      style={styles.previewOverlay}
                    />
                  </View>
                )}

                {/* Comments List */}
                <ScrollView style={styles.commentsList} showsVerticalScrollIndicator={false}>
                  {relevantComments.length > 0 ? (
                    relevantComments
                      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                      .map((comment) => (
                        <View key={comment.id} style={styles.commentItem}>
                          <View style={styles.commentHeader}>
                            <View style={styles.commentAuthor}>
                              <View style={styles.authorAvatar}>
                                <User color={Colors.palette.taupe} size={16} />
                              </View>
                              <Text style={styles.authorName}>{comment.author}</Text>
                            </View>
                            <View style={styles.commentTime}>
                              <Clock color={Colors.palette.taupe} size={12} />
                              <Text style={styles.timeText}>{formatTimeAgo(comment.createdAt)}</Text>
                            </View>
                          </View>
                          <Text style={styles.commentText}>{comment.text}</Text>
                          <View style={styles.commentActions}>
                            <Pressable style={styles.likeButton}>
                              <Heart 
                                color={Colors.palette.taupe} 
                                size={16} 
                                fill={'none'}
                              />
                              <Text style={styles.likeCount}>0</Text>
                            </Pressable>
                          </View>
                        </View>
                      ))
                  ) : (
                    <View style={styles.emptyState}>
                      <MessageCircle color={Colors.palette.taupe} size={48} />
                      <Text style={styles.emptyTitle}>Aucun commentaire</Text>
                      <Text style={styles.emptySubtitle}>
                        Soyez le premier à commenter cette {contextInfo.type === 'photo' ? 'photo' : 'album'}
                      </Text>
                    </View>
                  )}
                </ScrollView>

                {/* Comment Input */}
                <View style={styles.inputSection}>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.commentInput}
                      placeholder="Ajouter un commentaire public..."
                      placeholderTextColor={Colors.palette.taupe}
                      value={newComment}
                      onChangeText={setNewComment}
                      multiline
                      maxLength={500}
                      editable={!isSubmitting}
                    />
                    <Pressable
                      style={[
                        styles.sendButton,
                        (!newComment.trim() || isSubmitting) && styles.sendButtonDisabled
                      ]}
                      onPress={handleSubmitComment}
                      disabled={!newComment.trim() || isSubmitting}
                    >
                      <LinearGradient
                        colors={newComment.trim() && !isSubmitting ? ['#FFD700', '#FFA500'] : ['#333', '#333']}
                        style={styles.sendGradient}
                      >
                        <Send color={newComment.trim() && !isSubmitting ? '#000000' : Colors.palette.taupe} size={16} />
                      </LinearGradient>
                    </Pressable>
                  </View>
                  <Text style={styles.inputHint}>
                    Les commentaires sont visibles par tous les utilisateurs
                  </Text>
                </View>
              </View>
            </BlurView>
          ) : (
            <View style={[styles.modalBlur, styles.webBlur]}>
              <View style={styles.modalContent}>
                {/* Header */}
                <View style={styles.header}>
                  <View style={styles.headerInfo}>
                    <MessageCircle color={Colors.palette.accentGold} size={24} />
                    <View style={styles.headerText}>
                      <Text style={styles.headerTitle}>Commentaires</Text>
                      <Text style={styles.headerSubtitle}>
                        {contextInfo.title} • {relevantComments.length} commentaire(s)
                      </Text>
                    </View>
                  </View>
                  <Pressable style={styles.closeButton} onPress={onClose}>
                    <X color="#FFFFFF" size={24} />
                  </Pressable>
                </View>

                {/* Photo preview if available */}
                {photoUri && (
                  <View style={styles.photoPreview}>
                    <Image
                      source={{ uri: photoUri }}
                      style={styles.previewImage}
                      contentFit="cover"
                    />
                    <LinearGradient
                      colors={['transparent', 'rgba(0,0,0,0.6)']}
                      style={styles.previewOverlay}
                    />
                  </View>
                )}

                {/* Comments List */}
                <ScrollView style={styles.commentsList} showsVerticalScrollIndicator={false}>
                  {relevantComments.length > 0 ? (
                    relevantComments
                      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                      .map((comment) => (
                        <View key={comment.id} style={styles.commentItem}>
                          <View style={styles.commentHeader}>
                            <View style={styles.commentAuthor}>
                              <View style={styles.authorAvatar}>
                                <User color={Colors.palette.taupe} size={16} />
                              </View>
                              <Text style={styles.authorName}>{comment.author}</Text>
                            </View>
                            <View style={styles.commentTime}>
                              <Clock color={Colors.palette.taupe} size={12} />
                              <Text style={styles.timeText}>{formatTimeAgo(comment.createdAt)}</Text>
                            </View>
                          </View>
                          <Text style={styles.commentText}>{comment.text}</Text>
                          <View style={styles.commentActions}>
                            <Pressable style={styles.likeButton}>
                              <Heart 
                                color={Colors.palette.taupe} 
                                size={16} 
                                fill={'none'}
                              />
                              <Text style={styles.likeCount}>0</Text>
                            </Pressable>
                          </View>
                        </View>
                      ))
                  ) : (
                    <View style={styles.emptyState}>
                      <MessageCircle color={Colors.palette.taupe} size={48} />
                      <Text style={styles.emptyTitle}>Aucun commentaire</Text>
                      <Text style={styles.emptySubtitle}>
                        Soyez le premier à commenter cette {contextInfo.type === 'photo' ? 'photo' : 'album'}
                      </Text>
                    </View>
                  )}
                </ScrollView>

                {/* Comment Input */}
                <View style={styles.inputSection}>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.commentInput}
                      placeholder="Ajouter un commentaire public..."
                      placeholderTextColor={Colors.palette.taupe}
                      value={newComment}
                      onChangeText={setNewComment}
                      multiline
                      maxLength={500}
                      editable={!isSubmitting}
                    />
                    <Pressable
                      style={[
                        styles.sendButton,
                        (!newComment.trim() || isSubmitting) && styles.sendButtonDisabled
                      ]}
                      onPress={handleSubmitComment}
                      disabled={!newComment.trim() || isSubmitting}
                    >
                      <LinearGradient
                        colors={newComment.trim() && !isSubmitting ? ['#FFD700', '#FFA500'] : ['#333', '#333']}
                        style={styles.sendGradient}
                      >
                        <Send color={newComment.trim() && !isSubmitting ? '#000000' : Colors.palette.taupe} size={16} />
                      </LinearGradient>
                    </Pressable>
                  </View>
                  <Text style={styles.inputHint}>
                    Les commentaires sont visibles par tous les utilisateurs
                  </Text>
                </View>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    maxHeight: '90%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    marginTop: 60,
  },
  modalBlur: {
    flex: 1,
  },
  webBlur: {
    backgroundColor: 'rgba(0,0,0,0.9)',
    backdropFilter: 'blur(20px)',
  },
  modalContent: {
    flex: 1,
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: Colors.palette.taupe,
    fontSize: 14,
    marginTop: 2,
  },
  closeButton: {
    padding: 8,
  },
  photoPreview: {
    height: 120,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  commentsList: {
    flex: 1,
    marginBottom: 20,
  },
  commentItem: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.1)',
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  commentAuthor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  authorAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,215,0,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.3)',
  },
  authorName: {
    color: Colors.palette.accentGold,
    fontSize: 15,
    fontWeight: '700',
  },
  commentTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    color: Colors.palette.taupe,
    fontSize: 12,
  },
  commentText: {
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 14,
    fontWeight: '400',
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  likeCount: {
    color: Colors.palette.taupe,
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 16,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptySubtitle: {
    color: Colors.palette.taupe,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  inputSection: {
    gap: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    padding: 16,
    borderWidth: 2,
    borderColor: 'rgba(255,215,0,0.2)',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  commentInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    maxHeight: 120,
    minHeight: 24,
    lineHeight: 22,
    paddingVertical: 4,
  },
  sendButton: {
    borderRadius: 22,
    overflow: 'hidden',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendGradient: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
  inputHint: {
    color: Colors.palette.taupe,
    fontSize: 12,
    textAlign: 'center',
    opacity: 0.8,
  },
});