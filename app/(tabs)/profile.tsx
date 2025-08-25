import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Text, ScrollView, Pressable, Alert, TextInput, KeyboardAvoidingView, Platform, Share, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { User2, Settings, Camera, Heart, Share2, Download, Trash2, Edit3, Save, X } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useAppState } from '@/providers/AppStateProvider';
import ImagePickerComponent from '@/components/ImagePicker';
import * as Haptics from 'expo-haptics';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { useRouter } from 'expo-router';

export default function ProfileScreen() {
  const router = useRouter();
  const { displayName, profileAvatar, albums, groups, photos, updateProfile, points } = useAppState();
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editName, setEditName] = useState<string>(displayName);
  const [editAvatar, setEditAvatar] = useState<string | undefined>(profileAvatar);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const handleHapticFeedback = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, []);

  const handleSaveProfile = useCallback(() => {
    handleHapticFeedback();
    updateProfile(editName, editAvatar);
    setIsEditing(false);
    Alert.alert('Profil mis à jour', 'Vos modifications ont été sauvegardées.');
  }, [editName, editAvatar, updateProfile, handleHapticFeedback]);

  const handleCancelEdit = useCallback(() => {
    handleHapticFeedback();
    setEditName(displayName);
    setEditAvatar(profileAvatar);
    setIsEditing(false);
  }, [displayName, profileAvatar, handleHapticFeedback]);

  const handleExportData = useCallback(async () => {
    handleHapticFeedback();
    setIsExporting(true);
    
    try {
      // Create export data
      const exportData = {
        profile: {
          name: displayName,
          avatar: profileAvatar,
          points,
          exportDate: new Date().toISOString()
        },
        albums: albums.map(album => ({
          id: album.id,
          name: album.name,
          createdAt: album.createdAt,
          photoCount: album.photos.length,
          photos: album.photos.map((photo, index) => ({
            id: `${album.id}-${index}`,
            uri: typeof photo === 'string' ? photo : photo,
            timestamp: new Date().toISOString()
          }))
        })),
        groups: groups.map(group => ({
          id: group.id,
          name: group.name,
          memberCount: group.members.length
        })),
        totalPhotos: photos.length,
        totalAlbums: albums.length,
        totalGroups: groups.length
      };

      const jsonData = JSON.stringify(exportData, null, 2);
      const fileName = `memoria-export-${new Date().toISOString().split('T')[0]}.json`;
      
      if (Platform.OS === 'web') {
        // Web download
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        // Mobile save to documents
        const fileUri = FileSystem.documentDirectory + fileName;
        await FileSystem.writeAsStringAsync(fileUri, jsonData);
        
        // Request media library permissions and save
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status === 'granted') {
          await MediaLibrary.saveToLibraryAsync(fileUri);
        }
        
        Alert.alert(
          'Export terminé',
          `Vos données ont été exportées vers ${fileName}`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Erreur', 'Impossible d\'exporter les données');
    } finally {
      setIsExporting(false);
    }
  }, [displayName, profileAvatar, points, albums, groups, photos, handleHapticFeedback]);

  const handleShareProfile = useCallback(async () => {
    handleHapticFeedback();
    
    const profileUrl = `https://memoria.app/profile/${displayName.toLowerCase().replace(/\s+/g, '-')}`;
    const shareContent = {
      message: `Découvrez mon profil Memoria ! J'ai ${albums.length} albums et ${photos.length} photos partagées. ${profileUrl}`,
      url: profileUrl,
      title: `Profil de ${displayName} sur Memoria`
    };

    try {
      if (Platform.OS === 'web') {
        if (navigator.share) {
          await navigator.share(shareContent);
        } else {
          // Fallback for web
          await navigator.clipboard.writeText(shareContent.message);
          Alert.alert('Lien copié', 'Le lien de votre profil a été copié dans le presse-papiers');
        }
      } else {
        // Native sharing with haptic feedback
        await Share.share({
          message: shareContent.message,
          url: shareContent.url,
          title: shareContent.title
        });
        
        // Additional haptic feedback on successful share
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error('Share error:', error);
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      Alert.alert('Erreur', 'Impossible de partager le profil');
    }
  }, [displayName, albums.length, photos.length, handleHapticFeedback]);

  const handleOpenSettings = useCallback(() => {
    handleHapticFeedback();
    router.push('/notification-settings');
  }, [router, handleHapticFeedback]);

  const totalPhotos = albums?.reduce((sum, album) => sum + (album.photos?.length || 0), 0) || 0;
  const totalLikes = albums?.reduce((sum, album) => sum + (album.likes?.length || 0), 0) || 0;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#000000', '#0B0B0D', '#131417']}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
            
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerContent}>
                <Text style={styles.headerTitle}>Profil</Text>
                <Pressable 
                  style={styles.editButton} 
                  onPress={() => {
                    handleHapticFeedback();
                    setIsEditing(!isEditing);
                  }}
                >
                  {isEditing ? (
                    <X color={Colors.palette.accentGold} size={24} />
                  ) : (
                    <Edit3 color={Colors.palette.accentGold} size={24} />
                  )}
                </Pressable>
              </View>
            </View>

            {/* Profile Card */}
            <View style={styles.profileCard}>
              <LinearGradient
                colors={['#1a1a1a', '#2d2d2d']}
                style={styles.profileGradient}
              >
                <View style={styles.profileHeader}>
                  <View style={styles.avatarContainer}>
                    {isEditing ? (
                      <ImagePickerComponent
                        currentImage={editAvatar}
                        onImageSelected={setEditAvatar}
                        onRemove={() => setEditAvatar(undefined)}
                        size={100}
                        placeholder="Avatar"
                      />
                    ) : (
                      <View style={styles.avatar}>
                        {editAvatar ? (
                          <ImagePickerComponent
                            currentImage={editAvatar}
                            onImageSelected={() => {}}
                            size={100}
                          />
                        ) : (
                          <View style={styles.defaultAvatar}>
                            <User2 color={Colors.palette.accentGold} size={40} />
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                  
                  <View style={styles.profileInfo}>
                    {isEditing ? (
                      <TextInput
                        style={styles.nameInput}
                        value={editName}
                        onChangeText={setEditName}
                        placeholder="Votre nom"
                        placeholderTextColor={Colors.palette.taupe}
                        maxLength={30}
                      />
                    ) : (
                      <Text style={styles.profileName}>{displayName}</Text>
                    )}
                    <Text style={styles.profileSubtitle}>Membre Memoria</Text>
                    <View style={styles.pointsBadge}>
                      <Text style={styles.pointsText}>{points} points</Text>
                    </View>
                  </View>
                </View>

                {isEditing && (
                  <View style={styles.editActions}>
                    <Pressable style={styles.cancelButton} onPress={handleCancelEdit}>
                      <Text style={styles.cancelText}>Annuler</Text>
                    </Pressable>
                    <Pressable style={styles.saveButton} onPress={handleSaveProfile}>
                      <LinearGradient colors={['#FFD700', '#FFA500']} style={styles.saveGradient}>
                        <Save color="#000000" size={16} />
                        <Text style={styles.saveText}>Sauvegarder</Text>
                      </LinearGradient>
                    </Pressable>
                  </View>
                )}
              </LinearGradient>
            </View>

            {/* Stats */}
            <View style={styles.statsContainer}>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{albums.length}</Text>
                <Text style={styles.statLabel}>Albums</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{totalPhotos}</Text>
                <Text style={styles.statLabel}>Photos</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{groups.length}</Text>
                <Text style={styles.statLabel}>Groupes</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{totalLikes}</Text>
                <Text style={styles.statLabel}>Likes</Text>
              </View>
            </View>

            {/* Actions */}
            <View style={styles.actionsContainer}>
              <Pressable style={styles.actionCard} onPress={handleExportData} disabled={isExporting}>
                <LinearGradient colors={['#131417', '#2A2D34']} style={styles.actionGradient}>
                  <Download color={Colors.palette.accentGold} size={24} />
                  <Text style={styles.actionTitle}>{isExporting ? 'Export en cours...' : 'Exporter mes données'}</Text>
                  <Text style={styles.actionSubtitle}>Télécharger toutes vos données</Text>
                </LinearGradient>
              </Pressable>

              <Pressable style={styles.actionCard} onPress={handleShareProfile}>
                <LinearGradient colors={['#131417', '#2A2D34']} style={styles.actionGradient}>
                  <Share2 color={Colors.palette.taupeDeep} size={24} />
                  <Text style={styles.actionTitle}>Partager mon profil</Text>
                  <Text style={styles.actionSubtitle}>Inviter des amis</Text>
                </LinearGradient>
              </Pressable>

              <Pressable style={styles.actionCard} onPress={handleOpenSettings}>
                <LinearGradient colors={['#131417', '#2A2D34']} style={styles.actionGradient}>
                  <Settings color={Colors.palette.taupe} size={24} />
                  <Text style={styles.actionTitle}>Paramètres</Text>
                  <Text style={styles.actionSubtitle}>Confidentialité et sécurité</Text>
                </LinearGradient>
              </Pressable>

              <Pressable style={styles.actionCard} onPress={() => {
                handleHapticFeedback();
                Alert.alert(
                  'Supprimer le compte',
                  'Êtes-vous sûr de vouloir supprimer votre compte ? Cette action est irréversible.',
                  [
                    { text: 'Annuler', style: 'cancel' },
                    { text: 'Supprimer', style: 'destructive', onPress: () => {
                      Alert.alert('Fonctionnalité', 'Suppression de compte bientôt disponible');
                    }}
                  ]
                );
              }}>
                <LinearGradient colors={['#2A1A1A', '#3A2A2A']} style={styles.actionGradient}>
                  <Trash2 color="#FF4444" size={24} />
                  <Text style={[styles.actionTitle, { color: '#FF4444' }]}>Supprimer le compte</Text>
                  <Text style={styles.actionSubtitle}>Action irréversible</Text>
                </LinearGradient>
              </Pressable>
            </View>

          </ScrollView>
        </KeyboardAvoidingView>
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
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingBottom: 120,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: Colors.palette.taupeDeep,
  },
  editButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255,215,0,0.1)',
  },
  profileCard: {
    marginHorizontal: 20,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 24,
  },
  profileGradient: {
    padding: 24,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
  },
  defaultAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,215,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,215,0,0.3)',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.palette.taupeDeep,
    marginBottom: 4,
  },
  nameInput: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.palette.taupeDeep,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 4,
  },
  profileSubtitle: {
    fontSize: 14,
    color: Colors.palette.taupe,
    marginBottom: 12,
  },
  pointsBadge: {
    backgroundColor: 'rgba(255,215,0,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  pointsText: {
    color: Colors.palette.accentGold,
    fontSize: 12,
    fontWeight: '700',
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  cancelText: {
    color: Colors.palette.taupe,
    fontWeight: '600',
  },
  saveButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  saveGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  saveText: {
    color: '#000000',
    fontWeight: '700',
  },
  statsContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 24,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.palette.accentGold,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.palette.taupe,
    fontWeight: '600',
  },
  actionsContainer: {
    marginHorizontal: 20,
    gap: 12,
  },
  actionCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  actionGradient: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  actionTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: Colors.palette.taupeDeep,
  },
  actionSubtitle: {
    fontSize: 12,
    color: Colors.palette.taupe,
    position: 'absolute',
    right: 20,
    bottom: 20,
  },
});