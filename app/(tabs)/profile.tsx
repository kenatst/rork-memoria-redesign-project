import React, { useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, Text, ScrollView, Pressable, Alert, TextInput, KeyboardAvoidingView, Platform, Share, Image, FlatList, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { User2, Settings, Edit3, Save, X } from 'lucide-react-native';
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
  const [editName, setEditName] = useState<string>(displayName);
  const [editAvatar, setEditAvatar] = useState<string | undefined>(profileAvatar);

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
    const totalPhotos = albums?.reduce((sum, album) => sum + (album.photos?.length || 0), 0) || 0;
    const totalAlbums = albums.length;
    const totalGroups = groups.length;
    return { totalPhotos, totalAlbums, totalGroups };
  }, [albums, groups]);

  const latestPhotos = useMemo(() => {
    const sorted = [...photos].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return sorted.slice(0, 7);
  }, [photos]);

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
              <Pressable testID="settings-button" accessibilityRole="button" style={styles.iconButton} onPress={handleOpenSettings}>
                <Settings color={Colors.palette.taupe} size={22} />
              </Pressable>
            </View>

            <View style={styles.card} testID="profile-card">
              <LinearGradient colors={["#FFFFFF", "#F5EFE6"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cardGradient}>
                <View style={styles.profileTop}>
                  <View style={styles.avatarWrap}>
                    {isEditing ? (
                      <ImagePickerComponent
                        currentImage={editAvatar}
                        onImageSelected={setEditAvatar}
                        onRemove={() => setEditAvatar(undefined)}
                        size={88}
                        placeholder="Avatar"
                      />
                    ) : (
                      <View style={styles.avatar}>
                        {editAvatar ? (
                          <Image source={{ uri: editAvatar }} style={styles.avatarImage} />
                        ) : (
                          <View style={styles.defaultAvatar}>
                            <User2 color={Colors.palette.accentGold} size={36} />
                          </View>
                        )}
                      </View>
                    )}
                  </View>

                  <View style={styles.nameBlock}>
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
                      <Text style={styles.nameText}>{displayName}</Text>
                    )}
                    <Text style={styles.subtitle}>Créatrice de souvenirs authentiques</Text>
                  </View>

                  <Pressable testID="edit-toggle" style={styles.smallIconBtn} onPress={() => { handleHapticFeedback(); setIsEditing(!isEditing); }}>
                    {isEditing ? <X color={Colors.palette.taupe} size={20} /> : <Edit3 color={Colors.palette.taupe} size={20} />}
                  </Pressable>
                </View>

                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>{stats.totalPhotos}</Text>
                    <Text style={styles.statLabel}>Photos</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>{stats.totalAlbums}</Text>
                    <Text style={styles.statLabel}>Albums</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>{stats.totalGroups}</Text>
                    <Text style={styles.statLabel}>Groupes</Text>
                  </View>
                </View>

                {isEditing && (
                  <View style={styles.editActions}>
                    <Pressable style={styles.cancelBtn} onPress={handleCancelEdit} testID="cancel-edit">
                      <Text style={styles.cancelText}>Annuler</Text>
                    </Pressable>
                    <Pressable style={styles.saveBtn} onPress={handleSaveProfile} testID="save-profile">
                      <LinearGradient colors={["#D6C08F", "#BEA36A"]} style={styles.saveGradient}>
                        <Save color="#2C2C2C" size={16} />
                        <Text style={styles.saveText}>Sauvegarder</Text>
                      </LinearGradient>
                    </Pressable>
                  </View>
                )}
              </LinearGradient>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Mes derniers souvenirs</Text>
              <Pressable onPress={() => router.push('/albums')} testID="see-more">
                <Text style={styles.seeMore}>Voir plus</Text>
              </Pressable>
            </View>

            <View style={styles.gridWrap}>
              <FlatList
                testID="latest-grid"
                numColumns={2}
                data={latestPhotos}
                keyExtractor={(item) => item.id}
                columnWrapperStyle={styles.gridRow}
                scrollEnabled={false}
                renderItem={({ item, index }) => (
                  <View style={[styles.tile, { width: gridItemSize, height: gridItemSize }]}
                    testID={`tile-${index}`}>
                    <Image source={{ uri: item.uri }} style={styles.tileImage} resizeMode="cover" />
                  </View>
                )}
                ListEmptyComponent={<Text style={styles.emptyText}>Aucune photo récente</Text>}
              />
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
    backgroundColor: Colors.light.background,
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
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.palette.taupeDeep,
  },
  iconButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#F1ECE3',
  },
  card: {
    marginHorizontal: 20,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10,
    elevation: 2,
  },
  cardGradient: {
    padding: 20,
  },
  profileTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrap: {
    marginRight: 16,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    overflow: 'hidden',
    backgroundColor: '#EFE7DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 88,
    height: 88,
  },
  defaultAvatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#EFE7DB',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E5DCCB',
  },
  nameBlock: {
    flex: 1,
    paddingRight: 8,
  },
  nameText: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.palette.taupeDeep,
  },
  subtitle: {
    marginTop: 6,
    color: Colors.palette.taupe,
  },
  smallIconBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: '#F1ECE3',
    marginLeft: 8,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 18,
    gap: 12 as unknown as number,
  },
  statItem: {
    flex: 1,
    backgroundColor: '#F7F1E7',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.palette.taupeDeep,
  },
  statLabel: {
    marginTop: 2,
    color: Colors.palette.taupe,
    fontSize: 12,
    fontWeight: '600',
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12 as unknown as number,
    marginTop: 16,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#EEE7DB',
  },
  cancelText: {
    color: Colors.palette.taupe,
    fontWeight: '700',
  },
  saveBtn: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  saveGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8 as unknown as number,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  saveText: {
    color: '#2C2C2C',
    fontWeight: '800',
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.palette.taupeDeep,
  },
  seeMore: {
    color: Colors.palette.taupe,
    fontWeight: '700',
  },
  gridWrap: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  gridRow: {
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  tile: {
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#EDE6DA',
  },
  tileImage: {
    width: '100%',
    height: '100%',
  },
  emptyText: {
    color: Colors.palette.taupe,
    textAlign: 'center',
    marginTop: 8,
  },
  nameInput: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.palette.taupeDeep,
    backgroundColor: '#F4EEE4',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
});
