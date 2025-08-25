import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Platform, Modal, TextInput, Alert, Share, Linking, KeyboardAvoidingView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Users, Plus, Settings, Share2, QrCode, Mail, MessageSquare, Camera, UserPlus, UserMinus, Crown, Shield, Heart, Download } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as MediaLibrary from 'expo-media-library';

import { useAppState } from '@/providers/AppStateProvider';
import QRCodeGenerator from '@/components/QRCodeGenerator';
import ImagePickerComponent from '@/components/ImagePicker';
import { GroupPermissions, GroupMember, UserRole } from '@/components/GroupPermissions';

interface Member {
  id: string;
  name: string;
  avatar: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: Date;
}

interface CommentItem { id: string; text: string; author: string; createdAt: Date }

interface Photo {
  id: string;
  uri: string;
  albumId: string;
  albumName: string;
  uploadedBy: string;
  uploadedAt: Date;
  likes: string[];
  comments: CommentItem[];
}

export default function GroupDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const id = params.id;
  const { groups, albums, createAlbum, updateGroupCover } = useAppState();

  const group = useMemo(() => groups.find(g => g.id === id) ?? null, [groups, id]);

  const baseMembers = useMemo<Member[]>(() => {
    if (!group) return [] as Member[];
    return group.members.map((name: string, idx: number) => ({
      id: String(idx + 1),
      name,
      avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
      role: idx === 0 ? 'owner' : 'member',
      joinedAt: new Date(),
    }));
  }, [group]);

  const [members, setMembers] = useState<Member[]>([]);
  React.useEffect(() => {
    if (baseMembers.length > 0) {
      setMembers(baseMembers);
    }
  }, [baseMembers.length, group?.id]);

  const basePhotos = useMemo<Photo[]>(() => {
    if (!group) return [] as Photo[];
    const groupAlbums = albums.filter(a => a.groupId === group.id);
    const recent: Photo[] = [];
    groupAlbums.forEach(a => {
      a.photos.forEach((uri: string, pi: number) => {
        recent.unshift({
          id: `${a.id}-${pi}`,
          uri,
          albumId: a.id,
          albumName: a.name,
          uploadedBy: 'Membre',
          uploadedAt: new Date(),
          likes: [],
          comments: [],
        });
      });
    });
    return recent.slice(0, 30);
  }, [albums, group]);

  const [likesMap, setLikesMap] = useState<Record<string, string[]>>({});
  const [commentsMap, setCommentsMap] = useState<Record<string, CommentItem[]>>({});
  const [showInvite, setShowInvite] = useState<boolean>(false);
  const [showCreateAlbum, setShowCreateAlbum] = useState<boolean>(false);
  const [showQR, setShowQR] = useState<boolean>(false);
  const [showMembers, setShowMembers] = useState<boolean>(false);
  const [showPermissions, setShowPermissions] = useState<boolean>(false);
  const [newAlbumName, setNewAlbumName] = useState<string>('');
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  const [newComment, setNewComment] = useState<string>('');
  const [showChangeCover, setShowChangeCover] = useState<boolean>(false);

  const photos = useMemo<Photo[]>(() => {
    return basePhotos.map(p => ({
      ...p,
      likes: likesMap[p.id] ?? p.likes,
      comments: commentsMap[p.id] ?? p.comments,
    }));
  }, [basePhotos, likesMap, commentsMap]);

  const selectedPhoto = useMemo<Photo | null>(() => {
    if (!selectedPhotoId) return null;
    return photos.find(p => p.id === selectedPhotoId) ?? null;
  }, [selectedPhotoId, photos]);

  const handleHaptic = useCallback((style: 'light' | 'medium' | 'heavy' = 'medium') => {
    if (Platform.OS !== 'web') {
      const map = {
        light: (Haptics.ImpactFeedbackStyle as any).Light,
        medium: (Haptics.ImpactFeedbackStyle as any).Medium,
        heavy: (Haptics.ImpactFeedbackStyle as any).Heavy,
      } as const;
      Haptics.impactAsync(map[style]);
    }
  }, []);

  const handleShare = useCallback(async () => {
    handleHaptic('light');
    const inviteLink = `https://memoria.app/join/${group?.id}`;
    try {
      await Share.share({
        message: `Rejoins notre groupe "${group?.name}" sur Memoria ! ${inviteLink}`,
        url: inviteLink,
      });
    } catch (error) {
      console.log('Share error:', error);
    }
  }, [group, handleHaptic]);

  const handleInviteEmail = useCallback(async () => {
    const inviteLink = `https://memoria.app/join/${group?.id}`;
    const subject = `Invitation au groupe ${group?.name}`;
    const body = `Salut !\n\nTu es invité(e) à rejoindre notre groupe "${group?.name}" sur Memoria.\n\nClique sur ce lien pour nous rejoindre : ${inviteLink}\n\nÀ bientôt !`;
    try {
      await Linking.openURL(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
    } catch (error) {
      console.log('Email error:', error);
    }
  }, [group]);

  const handleRemoveMember = useCallback((memberId: string) => {
    Alert.alert(
      'Supprimer le membre',
      'Êtes-vous sûr de vouloir retirer ce membre du groupe ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            setMembers(prev => prev.filter(m => m.id !== memberId));
            handleHaptic('heavy');
          }
        }
      ]
    );
  }, [handleHaptic]);

  const handleLikePhoto = useCallback((photoId: string) => {
    handleHaptic('light');
    setLikesMap(prev => {
      const current = prev[photoId] ?? [];
      const isLiked = current.includes('current-user');
      const next = { ...prev, [photoId]: isLiked ? current.filter(i => i !== 'current-user') : [...current, 'current-user'] };
      return next;
    });
  }, [handleHaptic]);

  const handleAddComment = useCallback((photoId: string) => {
    if (!newComment.trim()) return;
    const comment: CommentItem = {
      id: Date.now().toString(),
      text: newComment.trim(),
      author: 'Vous',
      createdAt: new Date()
    };
    setCommentsMap(prev => {
      const list = prev[photoId] ?? [];
      return { ...prev, [photoId]: [...list, comment] };
    });
    setNewComment('');
    handleHaptic('light');
  }, [newComment, handleHaptic]);

  const handleSavePhoto = useCallback(async (photoUri: string) => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status === 'granted') {
        await MediaLibrary.saveToLibraryAsync(photoUri);
        Alert.alert('Succès', 'Photo sauvegardée dans votre galerie');
        handleHaptic('medium');
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de sauvegarder la photo');
    }
  }, [handleHaptic]);

  const handleExportAlbum = useCallback(async () => {
    Alert.alert(
      "Exporter l'album",
      'Toutes les photos de ce groupe seront sauvegardées dans votre galerie.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Exporter',
          onPress: async () => {
            try {
              const { status } = await MediaLibrary.requestPermissionsAsync();
              if (status === 'granted') {
                for (const photo of photos) {
                  await MediaLibrary.saveToLibraryAsync(photo.uri);
                }
                Alert.alert('Succès', `${photos.length} photos exportées dans votre galerie`);
                handleHaptic('medium');
              }
            } catch (error) {
              Alert.alert('Erreur', "Impossible d'exporter les photos");
            }
          }
        }
      ]
    );
  }, [photos, handleHaptic]);

  if (!group) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#000000', '#0B0B0D', '#131417']} style={StyleSheet.absoluteFillObject} />
        <SafeAreaView style={styles.safeArea}>
          <Text style={styles.errorText}>Groupe non trouvé</Text>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#000000', '#0B0B0D', '#131417']} style={StyleSheet.absoluteFillObject} />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()} testID="back-btn">
            <ArrowLeft color="#FFD700" size={24} />
          </Pressable>
          <Text style={styles.headerTitle}>{group.name}</Text>
          <Pressable style={styles.settingsBtn} onPress={() => setShowPermissions(true)} testID="permissions-btn">
            <Settings color="#FFD700" size={24} />
          </Pressable>
        </View>

        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.groupInfo}>
            <Image
              source={{ uri: group.coverImage || 'https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=1600&auto=format&fit=crop' }}
              style={styles.groupCover}
              contentFit="cover"
            />
            <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.coverOverlay} />
            <View style={styles.groupDetails}>
              <Text style={styles.groupName}>{group.name}</Text>
              <Text style={styles.groupDescription}>{group.description || 'Aucune description'}</Text>
              <Text style={styles.groupMeta}>{members.length} membres • {albums.filter(a => a.groupId === group.id).length} albums</Text>
            </View>
          </View>

          <View style={styles.actionRow}>
            <Pressable style={styles.actionBtn} onPress={() => setShowInvite(true)} testID="invite-btn">
              <UserPlus color="#FFD700" size={20} />
              <Text style={styles.actionText}>Inviter</Text>
            </Pressable>
            <Pressable style={styles.actionBtn} onPress={() => setShowQR(true)} testID="qr-btn">
              <QrCode color="#FFD700" size={20} />
              <Text style={styles.actionText}>QR Code</Text>
            </Pressable>
            <Pressable style={styles.actionBtn} onPress={() => setShowCreateAlbum(true)} testID="create-album-btn">
              <Plus color="#FFD700" size={20} />
              <Text style={styles.actionText}>Album</Text>
            </Pressable>
            <Pressable style={styles.actionBtn} onPress={() => setShowChangeCover(true)} testID="change-cover-btn">
              <Camera color="#FFD700" size={20} />
              <Text style={styles.actionText}>Couverture</Text>
            </Pressable>
            <Pressable style={styles.actionBtn} onPress={handleExportAlbum} testID="export-btn">
              <Download color="#FFD700" size={20} />
              <Text style={styles.actionText}>Exporter</Text>
            </Pressable>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Photos récentes</Text>
              <Pressable onPress={() => router.push('/(tabs)/capture')} testID="add-photo-btn">
                <Camera color="#FFD700" size={20} />
              </Pressable>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photosRow}>
              {photos.map(photo => (
                <Pressable key={photo.id} style={styles.photoCard} onPress={() => setSelectedPhotoId(photo.id)} testID={`photo-${photo.id}`}>
                  <Image source={{ uri: photo.uri }} style={styles.photoImage} contentFit="cover" />
                  <View style={styles.photoOverlay}>
                    <View style={styles.photoMeta}>
                      <Text style={styles.photoAlbum}>{photo.albumName}</Text>
                      <View style={styles.photoStats}>
                        <Heart color={photo.likes.includes('current-user') ? '#FF6B6B' : '#fff'} size={14} fill={photo.likes.includes('current-user') ? '#FF6B6B' : 'none'} />
                        <Text style={styles.photoStatsText}>{photo.likes.length}</Text>
                        <MessageSquare color="#fff" size={14} />
                        <Text style={styles.photoStatsText}>{photo.comments.length}</Text>
                      </View>
                    </View>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Membres ({members.length})</Text>
              <Pressable onPress={() => setShowMembers(true)} testID="view-members-btn">
                <Users color="#FFD700" size={20} />
              </Pressable>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.membersRow}>
              {members.slice(0, 6).map(member => (
                <View key={member.id} style={styles.memberCard}>
                  <Image source={{ uri: member.avatar }} style={styles.memberAvatar} contentFit="cover" />
                  <Text style={styles.memberName}>{member.name.split(' ')[0]}</Text>
                  {member.role === 'owner' && <Crown color="#FFD700" size={12} />}
                  {member.role === 'admin' && <Shield color="#E67E22" size={12} />}
                </View>
              ))}
            </ScrollView>
          </View>
        </ScrollView>

        <Modal visible={showInvite} transparent animationType="slide" onRequestClose={() => setShowInvite(false)}>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Inviter des membres</Text>
              <Text style={styles.modalSubtitle}>Partagez ce groupe avec vos proches</Text>
              <View style={styles.inviteOptions}>
                <Pressable style={styles.inviteOption} onPress={handleShare} testID="share-invite">
                  <Share2 color="#FFD700" size={24} />
                  <Text style={styles.inviteOptionText}>Partager le lien</Text>
                </Pressable>
                <Pressable style={styles.inviteOption} onPress={handleInviteEmail} testID="email-invite">
                  <Mail color="#FFD700" size={24} />
                  <Text style={styles.inviteOptionText}>Inviter par email</Text>
                </Pressable>
                <Pressable style={styles.inviteOption} onPress={() => { setShowInvite(false); setShowQR(true); }} testID="qr-invite">
                  <QrCode color="#FFD700" size={24} />
                  <Text style={styles.inviteOptionText}>Code QR</Text>
                </Pressable>
              </View>
              <Pressable style={styles.modalCloseBtn} onPress={() => setShowInvite(false)} testID="close-invite">
                <Text style={styles.modalCloseText}>Fermer</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        <Modal visible={showQR} transparent animationType="fade" onRequestClose={() => setShowQR(false)}>
          <View style={styles.modalBackdrop}>
            <View style={styles.qrModal}>
              <Text style={styles.modalTitle}>Code QR du groupe</Text>
              <QRCodeGenerator
                value={`https://memoria.app/join/${group.id}`}
                size={200}
                backgroundColor="#FFFFFF"
                color="#000000"
              />
              <Text style={styles.qrText}>Scannez pour rejoindre le groupe</Text>
              <Pressable style={styles.modalCloseBtn} onPress={() => setShowQR(false)} testID="close-qr">
                <Text style={styles.modalCloseText}>Fermer</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        <Modal visible={showCreateAlbum} transparent animationType="slide" onRequestClose={() => setShowCreateAlbum(false)}>
          <View style={styles.modalBackdrop}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
              <View style={styles.modalCard}>
                <Text style={styles.modalTitle}>Créer un album</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Nom de l'album"
                  placeholderTextColor="#A9AFBC"
                  value={newAlbumName}
                  onChangeText={setNewAlbumName}
                  testID="album-name-input"
                  returnKeyType="done"
                />
                <View style={styles.modalActions}>
                  <Pressable style={[styles.modalBtn, styles.cancelBtn]} onPress={() => setShowCreateAlbum(false)} testID="cancel-create-album">
                    <Text style={styles.cancelText}>Annuler</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.modalBtn, styles.createBtn]}
                    onPress={() => {
                      if (!newAlbumName.trim()) return;
                      const a = createAlbum(newAlbumName.trim(), group.id);
                      setShowCreateAlbum(false);
                      setNewAlbumName('');
                      handleHaptic('medium');
                      router.push(`/album/${(a as any).id}`);
                    }}
                    testID="confirm-create-album"
                  >
                    <Text style={styles.createText}>Créer</Text>
                  </Pressable>
                </View>
              </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>

        <Modal visible={showPermissions} transparent animationType="slide" onRequestClose={() => setShowPermissions(false)}>
          <View style={styles.modalBackdrop}>
            <View style={styles.permissionsModal}>
              <GroupPermissions
                groupId={group.id}
                members={members.map(member => ({
                  id: member.id,
                  name: member.name,
                  role: member.role as UserRole,
                  avatar: member.avatar,
                  joinedAt: member.joinedAt.toISOString(),
                  permissions: {
                    canAddPhotos: true,
                    canDeletePhotos: member.role === 'owner' || member.role === 'admin',
                    canModerate: member.role === 'owner' || member.role === 'admin',
                    canInvite: true,
                    canManageMembers: member.role === 'owner'
                  }
                } as GroupMember))}
                currentUserRole="owner"
                onUpdateMemberRole={(memberId, newRole) => {
                  setMembers(prev => prev.map(m =>
                    m.id === memberId ? { ...m, role: newRole as 'owner' | 'admin' | 'member' } : m
                  ));
                  handleHaptic('medium');
                }}
                onRemoveMember={(memberId) => {
                  setMembers(prev => prev.filter(m => m.id !== memberId));
                  handleHaptic('heavy');
                }}
                onUpdatePermissions={(memberId, permissions) => {
                  console.log('Updating permissions for', memberId, permissions);
                  handleHaptic('light');
                }}
              />
              <Pressable style={styles.modalCloseBtn} onPress={() => setShowPermissions(false)} testID="close-permissions">
                <Text style={styles.modalCloseText}>Fermer</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        <Modal visible={showMembers} transparent animationType="slide" onRequestClose={() => setShowMembers(false)}>
          <View style={styles.modalBackdrop}>
            <View style={styles.membersModal}>
              <Text style={styles.modalTitle}>Gestion des membres</Text>
              <ScrollView style={styles.membersList}>
                {members.map(member => (
                  <View key={member.id} style={styles.memberItem}>
                    <Image source={{ uri: member.avatar }} style={styles.memberItemAvatar} contentFit="cover" />
                    <View style={styles.memberItemInfo}>
                      <Text style={styles.memberItemName}>{member.name}</Text>
                      <Text style={styles.memberItemRole}>
                        {member.role === 'owner' ? 'Propriétaire' : member.role === 'admin' ? 'Administrateur' : 'Membre'}
                      </Text>
                      <Text style={styles.memberItemDate}>Rejoint le {member.joinedAt.toLocaleDateString('fr-FR')}</Text>
                    </View>
                    <View style={styles.memberItemActions}>
                      {member.role === 'owner' && <Crown color="#FFD700" size={16} />}
                      {member.role === 'admin' && <Shield color="#E67E22" size={16} />}
                      {member.role === 'member' && (
                        <Pressable
                          style={styles.removeBtn}
                          onPress={() => handleRemoveMember(member.id)}
                          testID={`remove-member-${member.id}`}
                        >
                          <UserMinus color="#FF6B6B" size={16} />
                        </Pressable>
                      )}
                    </View>
                  </View>
                ))}
              </ScrollView>
              <Pressable style={styles.modalCloseBtn} onPress={() => setShowMembers(false)} testID="close-members">
                <Text style={styles.modalCloseText}>Fermer</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        <Modal visible={!!selectedPhoto} transparent animationType="fade" onRequestClose={() => setSelectedPhotoId(null)}>
          {selectedPhoto && (
            <View style={styles.photoModal}>
              <View style={styles.photoModalHeader}>
                <Pressable style={styles.backButton} onPress={() => setSelectedPhotoId(null)} testID="close-photo">
                  <ArrowLeft color="#FFD700" size={24} />
                </Pressable>
                <Text style={styles.photoModalTitle}>Photo</Text>
                <View style={styles.photoModalActions}>
                  <Pressable
                    style={styles.photoModalAction}
                    onPress={() => handleLikePhoto(selectedPhoto.id)}
                    testID="like-photo"
                  >
                    <Heart
                      color={selectedPhoto.likes.includes('current-user') ? '#FF6B6B' : '#fff'}
                      size={20}
                      fill={selectedPhoto.likes.includes('current-user') ? '#FF6B6B' : 'none'}
                    />
                    <Text style={styles.photoModalActionText}>{selectedPhoto.likes.length}</Text>
                  </Pressable>
                  <Pressable
                    style={styles.photoModalAction}
                    onPress={() => handleSavePhoto(selectedPhoto.uri)}
                    testID="save-photo"
                  >
                    <Download color="#fff" size={20} />
                  </Pressable>
                </View>
              </View>
              <View style={styles.photoModalContent}>
                <Image source={{ uri: selectedPhoto.uri }} style={styles.photoModalImage} contentFit="contain" />
                <View style={styles.photoModalInfo}>
                  <Text style={styles.photoModalAlbum}>{selectedPhoto.albumName}</Text>
                  <Text style={styles.photoModalMeta}>Par {selectedPhoto.uploadedBy} • {selectedPhoto.uploadedAt.toLocaleDateString('fr-FR')}</Text>
                  <ScrollView style={styles.commentsList}>
                    {selectedPhoto.comments.map(comment => (
                      <View key={comment.id} style={styles.commentItem}>
                        <Text style={styles.commentAuthor}>{comment.author}</Text>
                        <Text style={styles.commentText}>{comment.text}</Text>
                        <Text style={styles.commentDate}>{comment.createdAt.toLocaleDateString('fr-FR')}</Text>
                      </View>
                    ))}
                  </ScrollView>
                  <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                    <View style={styles.addCommentRow}>
                      <TextInput
                        style={styles.commentInput}
                        placeholder="Ajouter un commentaire..."
                        placeholderTextColor="#A9AFBC"
                        value={newComment}
                        onChangeText={setNewComment}
                        testID="comment-input"
                      />
                      <Pressable
                        style={styles.sendCommentBtn}
                        onPress={() => handleAddComment(selectedPhoto.id)}
                        testID="send-comment"
                      >
                        <Text style={styles.sendCommentText}>Envoyer</Text>
                      </Pressable>
                    </View>
                  </KeyboardAvoidingView>
                </View>
              </View>
            </View>
          )}
        </Modal>

      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  safeArea: { flex: 1, paddingTop: 0 },
  errorText: { color: '#fff', textAlign: 'center', marginTop: 50 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '800', flex: 1, textAlign: 'center' },
  settingsBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  groupInfo: { position: 'relative', height: 200, marginHorizontal: 20, marginBottom: 20, borderRadius: 16, overflow: 'hidden' },
  groupCover: { width: '100%', height: '100%' },
  coverOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  groupDetails: { position: 'absolute', bottom: 16, left: 16, right: 16 },
  groupName: { color: '#fff', fontSize: 24, fontWeight: '800', marginBottom: 4 },
  groupDescription: { color: '#E8EAF0', fontSize: 14, marginBottom: 8 },
  groupMeta: { color: '#A9AFBC', fontSize: 12 },
  actionRow: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 24, gap: 12 },
  actionBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.06)', paddingVertical: 12, borderRadius: 12, gap: 4 },
  actionText: { color: '#FFD700', fontSize: 12, fontWeight: '700' },
  section: { marginBottom: 24, paddingHorizontal: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  photosRow: { gap: 12, paddingRight: 20 },
  photoCard: { width: 120, height: 120, borderRadius: 12, overflow: 'hidden', position: 'relative' },
  photoImage: { width: '100%', height: '100%' },
  photoOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.7)', padding: 8 },
  photoMeta: { gap: 4 },
  photoAlbum: { color: '#fff', fontSize: 10, fontWeight: '700' },
  photoStats: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  photoStatsText: { color: '#fff', fontSize: 10 },
  membersRow: { gap: 12, paddingRight: 20 },
  memberCard: { alignItems: 'center', gap: 4, width: 60 },
  memberAvatar: { width: 48, height: 48, borderRadius: 24 },
  memberName: { color: '#fff', fontSize: 12, fontWeight: '600', textAlign: 'center' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)' },
  keyboardView: { flex: 1, justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#0B0B0D', padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20, gap: 16, maxHeight: '80%' },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: '800', textAlign: 'center' },
  modalSubtitle: { color: '#A9AFBC', fontSize: 14, textAlign: 'center', marginBottom: 8 },
  inviteOptions: { gap: 12 },
  inviteOption: { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: 'rgba(255,255,255,0.06)', padding: 16, borderRadius: 12 },
  inviteOptionText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  modalCloseBtn: { backgroundColor: 'rgba(255,255,255,0.1)', paddingVertical: 12, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  modalCloseText: { color: '#fff', fontWeight: '700' },
  qrModal: { backgroundColor: '#0B0B0D', padding: 20, borderRadius: 20, alignItems: 'center', gap: 16, margin: 20 },
  qrText: { color: '#A9AFBC', fontSize: 14, textAlign: 'center' },
  input: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, color: '#fff', fontSize: 16 },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  cancelBtn: { backgroundColor: 'rgba(255,255,255,0.06)' },
  createBtn: { backgroundColor: '#FFD700' },
  cancelText: { color: '#fff', fontWeight: '700' },
  createText: { color: '#000', fontWeight: '800' },
  membersModal: { backgroundColor: '#0B0B0D', padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%' },
  permissionsModal: { backgroundColor: '#0B0B0D', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%', flex: 1 },
  membersList: { maxHeight: 400 },
  memberItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  memberItemAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
  memberItemInfo: { flex: 1 },
  memberItemName: { color: '#fff', fontSize: 16, fontWeight: '600' },
  memberItemRole: { color: '#FFD700', fontSize: 12, fontWeight: '600' },
  memberItemDate: { color: '#A9AFBC', fontSize: 11 },
  memberItemActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  removeBtn: { padding: 8 },
  photoModal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)' },
  photoModalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: 'rgba(0,0,0,0.8)' },
  photoModalTitle: { color: '#fff', fontSize: 18, fontWeight: '800', flex: 1, textAlign: 'center' },
  backButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  photoModalContent: { flex: 1, justifyContent: 'center' },
  photoModalImage: { flex: 1, maxHeight: '60%' },
  photoModalInfo: { backgroundColor: '#0B0B0D', padding: 20, gap: 12 },
  photoModalAlbum: { color: '#fff', fontSize: 18, fontWeight: '700' },
  photoModalActions: { flexDirection: 'row', gap: 16 },
  photoModalAction: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  photoModalActionText: { color: '#fff', fontSize: 14 },
  photoModalMeta: { color: '#A9AFBC', fontSize: 12 },
  commentsList: { maxHeight: 120 },
  commentItem: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  commentAuthor: { color: '#FFD700', fontSize: 12, fontWeight: '600' },
  commentText: { color: '#fff', fontSize: 14, marginVertical: 2 },
  commentDate: { color: '#A9AFBC', fontSize: 10 },
  addCommentRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  commentInput: { flex: 1, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, color: '#fff' },
  sendCommentBtn: { backgroundColor: '#FFD700', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
  sendCommentText: { color: '#000', fontWeight: '700' },
  coverPickerContainer: { alignItems: 'center', marginVertical: 16 },
});