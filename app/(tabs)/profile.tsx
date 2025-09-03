import React, { useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, Text, ScrollView, Pressable, Alert, TextInput, KeyboardAvoidingView, Platform, Share, Image, FlatList, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { User2, Settings, Edit3, Save, X, MoreHorizontal, Download } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useAppState } from '@/providers/AppStateProvider';
import ImagePickerComponent from '@/components/ImagePicker';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';

const { width: screenWidth } = Dimensions.get('window');

export default function ProfileScreen() {
  const router = useRouter();
  const { displayName, profileAvatar, albums, groups, photos, updateProfile, points } = useAppState();
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editName, setEditName] = useState<string>('Emma Martin');
  const [editAvatar, setEditAvatar] = useState<string | undefined>('https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&h=400&fit=crop&crop=face');

  const handleHapticFeedback = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      console.log('[haptics] selection');
    }
  }, []);

  const handleSaveProfile = useCallback(() => {
    console.log('[profile] save profile');
    handleHapticFeedback();
    updateProfile(editName, editAvatar);
    setIsEditing(false);
    Alert.alert('Profil mis à jour', 'Vos modifications ont été sauvegardées.');
  }, [editName, editAvatar, updateProfile, handleHapticFeedback]);

  const handleCancelEdit = useCallback(() => {
    console.log('[profile] cancel edit');
    handleHapticFeedback();
    setEditName(displayName);
    setEditAvatar(profileAvatar);
    setIsEditing(false);
  }, [displayName, profileAvatar, handleHapticFeedback]);

  const handleOpenSettings = useCallback(() => {
    console.log('[profile] open settings');
    handleHapticFeedback();
    router.push('/notification-settings');
  }, [router, handleHapticFeedback]);

  const stats = useMemo(() => {
    return { totalPhotos: 127, totalAlbums: 45, totalGroups: 8 };
  }, []);

  const latestPhotos = useMemo(() => {
    return [
      { id: '1', uri: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=400&fit=crop' },
      { id: '2', uri: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&h=400&fit=crop' },
      { id: '3', uri: 'https://images.unsplash.com/photo-1529258283598-8d6fe60b27f4?w=400&h=400&fit=crop' },
      { id: '4', uri: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=400&fit=crop' },
      { id: '5', uri: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&h=400&fit=crop' },
      { id: '6', uri: 'https://images.unsplash.com/photo-1529258283598-8d6fe60b27f4?w=400&h=400&fit=crop' }
    ];
  }, []);

  const gridItemSize = useMemo(() => {
    const horizontalPadding = 20 * 2; // container paddings
    const gap = 10; // between tiles
    return (screenWidth - horizontalPadding - gap) / 2;
  }, []);

  return (
    <View style={styles.container} testID="profile-screen">
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.content} testID="profile-scroll">
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Profil</Text>
              <View style={styles.headerActions}>
                <Pressable testID="settings-button" accessibilityRole="button" style={styles.iconButton} onPress={handleOpenSettings}>
                  <Settings color={Colors.palette.taupe} size={22} />
                </Pressable>
                <Pressable testID="more-button" accessibilityRole="button" style={styles.iconButton} onPress={() => {}}>
                  <MoreHorizontal color={Colors.palette.taupe} size={22} />
                </Pressable>
              </View>
            </View>

            <View style={styles.card} testID="profile-card">
              <View style={styles.cardContent}>
                <View style={styles.profileSection}>
                  <View style={styles.avatar}>
                    <Image source={{ uri: editAvatar }} style={styles.avatarImage} />
                  </View>
                  
                  <View style={styles.profileInfo}>
                    <Text style={styles.nameText}>Emma Martin</Text>
                    <Text style={styles.subtitle}>Créatrice de souvenirs authentiques</Text>
                  </View>
                </View>

                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>127</Text>
                    <Text style={styles.statLabel}>Photos</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>45</Text>
                    <Text style={styles.statLabel}>Albums</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>8</Text>
                    <Text style={styles.statLabel}>Groupes</Text>
                  </View>
                </View>

                <View style={styles.actionButtons}>
                  <Pressable style={styles.modifyButton} onPress={() => {}}>
                    <Text style={styles.modifyButtonText}>Modifier profil</Text>
                  </Pressable>
                  <Pressable style={styles.saveButton} onPress={() => {}}>
                    <Text style={styles.saveButtonText}>Sauvegarde</Text>
                  </Pressable>
                </View>
              </View>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Mes derniers souvenirs</Text>
              <Pressable onPress={() => router.push('/albums')} testID="see-more">
                <Text style={styles.seeMore}>Voir plus</Text>
              </Pressable>
            </View>

            <View style={styles.photosGrid}>
              {latestPhotos.map((photo, index) => (
                <View key={photo.id} style={styles.photoItem}>
                  <Image source={{ uri: photo.uri }} style={styles.photoImage} />
                </View>
              ))}
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
    backgroundColor: '#F8F6F2',
  },
  safeArea: {
    flex: 1,
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
    paddingTop: 16,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2C2C2C',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  card: {
    marginHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardContent: {
    padding: 20,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 16,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  profileInfo: {
    flex: 1,
  },
  nameText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2C2C2C',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#8B7355',
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2C2C2C',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#8B7355',
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modifyButton: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: 'center',
  },
  modifyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C2C2C',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#D4AF37',
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C2C2C',
  },
  seeMore: {
    fontSize: 14,
    color: '#8B7355',
    fontWeight: '500',
  },
  photosGrid: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  photoItem: {
    width: (screenWidth - 56) / 3,
    height: (screenWidth - 56) / 3,
    borderRadius: 12,
    overflow: 'hidden',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
});
