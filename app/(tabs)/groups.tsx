import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Platform, Animated, Modal, TextInput, KeyboardAvoidingView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { Users2, Plus, Shield, Crown } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppState } from '@/providers/AppStateProvider';
import Colors from '@/constants/colors';
import type { Group as PersistedGroup } from '@/providers/AppStateProvider';
import { useToast } from '@/providers/ToastProvider';
import { useAccessibility } from '@/components/AccessibilityProvider';
import * as Haptics from 'expo-haptics';
import { Dimensions } from 'react-native';

type UIGroup = { id: string; name: string; members: number; cover: string; role: 'owner' | 'admin' | 'member' };

export default function GroupsScreen() {
  const router = useRouter();
  const { groups: persistedGroups, createGroup, favoriteGroups, toggleFavoriteGroup } = useAppState();
  const { showError, showSuccess } = useToast();
  const { announceForAccessibility, getAccessibleLabel } = useAccessibility();
  const [groups, setGroups] = useState<UIGroup[]>([]);
  const [fadeAnim] = useState(() => new Animated.Value(0));
  const [slideAnim] = useState(() => new Animated.Value(40));
  const [showCreate, setShowCreate] = useState<boolean>(false);
  const [newName, setNewName] = useState<string>('');
  const [newDescription, setNewDescription] = useState<string>('');
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'family' | 'friends' | 'couple'>('all');

  useEffect(() => {
    const mockGroups: UIGroup[] = (persistedGroups as PersistedGroup[]).map((group: PersistedGroup) => ({
      id: group.id,
      name: group.name,
      members: group.members?.length ?? 0,
      cover: group.coverImage || 'https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=1600&auto=format&fit=crop',
      role: 'owner'
    }));
    setGroups(mockGroups);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 10, useNativeDriver: true }),
    ]).start();
  }, [persistedGroups]);

  return (
    <View style={styles.container}>
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: Colors.light.background }]} />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>

      <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        {Platform.OS !== 'web' ? (
          <BlurView intensity={20} style={styles.headerBlur}>
            <View style={styles.headerContent}>
              <Users2 color={Colors.palette.taupeDeep} size={24} />
              <Text style={styles.headerTitle}>Groupes</Text>
              <Pressable 
                style={styles.createBtn} 
                testID="create-group" 
                onPress={() => {
                  if (Platform.OS !== 'web') {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  }
                  setShowCreate(true);
                }}
                accessibilityLabel={getAccessibleLabel('Créer un nouveau groupe', 'Appuyez pour créer un nouveau groupe')}
                accessibilityRole="button"
              >
                <Plus color={Colors.palette.taupeDeep} size={18} />
                <Text style={styles.createText}>Nouveau</Text>
              </Pressable>
            </View>
          </BlurView>
        ) : (
          <View style={[styles.headerBlur, styles.webBlur]}>
            <View style={styles.headerContent}>
              <Users2 color={Colors.palette.taupeDeep} size={24} />
              <Text style={styles.headerTitle}>Groupes</Text>
              <Pressable 
                style={styles.createBtn} 
                testID="create-group" 
                onPress={() => {
                  if (Platform.OS !== 'web') {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  }
                  setShowCreate(true);
                }}
                accessibilityLabel={getAccessibleLabel('Créer un nouveau groupe', 'Appuyez pour créer un nouveau groupe')}
                accessibilityRole="button"
              >
                <Plus color={Colors.palette.taupeDeep} size={18} />
                <Text style={styles.createText}>Nouveau</Text>
              </Pressable>
            </View>
          </View>
        )}
      </Animated.View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.filtersRow}>
          {(['all','family','friends','couple'] as const).map((key) => {
            const active = activeFilter === key;
            return (
              <Pressable key={key} style={[styles.filterChip, active && styles.filterChipActive]} onPress={() => setActiveFilter(key)} testID={`group-chip-${key}`}>
                <Text style={[styles.filterText, active && styles.filterTextActive]}>
                  {key === 'all' ? 'Tous' : key === 'family' ? 'Famille' : key === 'friends' ? 'Amis' : 'Couple'}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable style={styles.createGroupCard} onPress={() => setShowCreate(true)} testID="inline-create-group">
          <LinearGradient colors={[Colors.palette.accentGoldLight, Colors.palette.accentGold]} style={styles.createGroupGradient}>
            <Plus color={Colors.palette.taupeDeep} size={20} />
            <View style={{ alignItems: 'flex-start' }}>
              <Text style={styles.createGroupTitle}>Créer un groupe</Text>
              <Text style={styles.createGroupSubtitle}>Invitez vos proches</Text>
            </View>
          </LinearGradient>
        </Pressable>

        {groups.map((g: UIGroup) => (
          <Pressable 
            key={g.id} 
            style={styles.card} 
            onPress={() => {
              if (Platform.OS !== 'web') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
              router.push(`/group/${g.id}`);
            }} 
            testID={`group-${g.id}`}
            accessibilityLabel={getAccessibleLabel(`Groupe ${g.name}`, `${g.members} membres, rôle: ${g.role}`)}
            accessibilityRole="button"
          >
            <Image source={{ uri: g.cover }} style={styles.cover} contentFit="cover" />
            <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.overlay} />
            <View style={styles.row}>
              <Text numberOfLines={1} style={styles.name}>{g.name}</Text>
              <View style={styles.badges}>
                {g.role === 'owner' && (
                  <View style={[styles.roleBadge, { backgroundColor: Colors.palette.accentGold }]}>
                    <Crown color="#000" size={12} />
                  </View>
                )}
                {g.role === 'admin' && (
                  <View style={[styles.roleBadge, { backgroundColor: '#E67E22' }]}>
                    <Shield color="#fff" size={12} />
                  </View>
                )}
              </View>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.meta}>{g.members} membres</Text>
              <Pressable 
                style={styles.pinBtn} 
                onPress={async () => {
                  try {
                    if (Platform.OS !== 'web') {
                      await Haptics.selectionAsync();
                    }
                    toggleFavoriteGroup(g.id);
                    const isFavorite = favoriteGroups?.includes(g.id);
                    const message = isFavorite ? 'Groupe désépinglé' : 'Groupe épinglé';
                    showSuccess(message, `${g.name} ${isFavorite ? 'retiré des' : 'ajouté aux'} favoris`);
                    announceForAccessibility(message);
                  } catch (error) {
                    console.error('Error toggling favorite group:', error);
                    showError('Erreur', 'Impossible de modifier les favoris');
                  }
                }} 
                testID={`pin-group-${g.id}`}
                accessibilityLabel={getAccessibleLabel(
                  favoriteGroups?.includes(g.id) ? 'Désépingler le groupe' : 'Épingler le groupe',
                  favoriteGroups?.includes(g.id) ? 'Retirer des favoris' : 'Ajouter aux favoris'
                )}
                accessibilityRole="button"
              >
                <Text style={styles.pinText}>{favoriteGroups?.includes(g.id) ? 'Épinglé' : 'Épingler'}</Text>
              </Pressable>
            </View>
          </Pressable>
        ))}
      </ScrollView>

      <Modal visible={showCreate} transparent animationType="slide" onRequestClose={() => setShowCreate(false)}>
        <View style={styles.modalBackdrop}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
            <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Nouveau groupe</Text>
            <TextInput style={styles.input} placeholder="Nom du groupe" placeholderTextColor="#A9AFBC" value={newName} onChangeText={setNewName} testID="group-name-input" />
            <TextInput style={styles.input} placeholder="Description (optionnel)" placeholderTextColor="#A9AFBC" value={newDescription} onChangeText={setNewDescription} testID="group-description-input" multiline numberOfLines={3} />
            <View style={styles.modalActions}>
              <Pressable style={[styles.modalBtn, styles.cancelBtn]} onPress={() => setShowCreate(false)}>
                <Text style={styles.cancelText}>Annuler</Text>
              </Pressable>
              <Pressable style={[styles.modalBtn, styles.createConfirmBtn, isCreating && styles.disabledBtn]} onPress={async () => {
                  if (isCreating) return;
                  if (!newName.trim()) { showError('Nom requis', 'Veuillez saisir un nom pour votre groupe'); return; }
                  setIsCreating(true);
                  try {
                    if (Platform.OS !== 'web') { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }
                    await createGroup(newName.trim(), newDescription.trim() || undefined);
                    setShowCreate(false);
                    setNewName('');
                    setNewDescription('');
                    showSuccess('Groupe créé', `Le groupe "${newName.trim()}" a été créé avec succès`);
                    announceForAccessibility(`Groupe ${newName.trim()} créé avec succès`);
                  } catch (error) {
                    console.error('Error creating group:', error);
                    showError('Erreur de création', 'Impossible de créer le groupe. Veuillez réessayer.');
                    announceForAccessibility('Erreur lors de la création du groupe');
                  } finally { setIsCreating(false); }
                }} testID="confirm-create-group" disabled={isCreating} accessibilityLabel={getAccessibleLabel('Créer le groupe', 'Confirmer la création du groupe')} accessibilityRole="button">
                <Text style={[styles.createConfirmText, isCreating && styles.disabledText]}>{isCreating ? 'Création...' : 'Créer'}</Text>
              </Pressable>
            </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.palette.beige },
  safeArea: { flex: 1, paddingTop: 0 },
  header: { paddingHorizontal: 20, paddingTop: 8 },
  headerBlur: { borderRadius: 16, overflow: 'hidden' },
  webBlur: { backgroundColor: 'transparent' },
  headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, backgroundColor: Colors.palette.card, borderWidth: 1, borderColor: Colors.palette.border, borderRadius: 16 },
  headerTitle: { color: Colors.palette.taupeDeep, fontSize: 22, fontWeight: '800' },
  createBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFFFFF', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: '#EBE3D8' },
  createText: { color: Colors.palette.taupeDeep, fontSize: 12, fontWeight: '800' },
  scroll: { flex: 1 },
  content: { padding: 20, gap: 16, paddingBottom: 140 },
  filtersRow: { flexDirection: 'row', gap: 10, paddingBottom: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(214,192,143,0.12)' },
  filterChipActive: { backgroundColor: 'rgba(214,192,143,0.25)' },
  filterText: { color: Colors.palette.taupe, fontWeight: '700' },
  filterTextActive: { color: Colors.palette.taupeDeep },
  createGroupCard: { borderRadius: 16, overflow: 'hidden' },
  createGroupGradient: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  createGroupTitle: { color: '#000', fontSize: 14, fontWeight: '800' },
  createGroupSubtitle: { color: '#1a1a1a', fontSize: 12, fontWeight: '600', marginTop: 2 },
  card: { borderRadius: 16, overflow: 'hidden', backgroundColor: Colors.palette.card, borderWidth: 1, borderColor: Colors.palette.border },
  cover: { width: '100%', height: 140 },
  overlay: { position: 'absolute', left: 0, right: 0, bottom: 0, top: 0 },
  row: { position: 'absolute', left: 12, right: 12, top: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name: { color: '#fff', fontWeight: '800', fontSize: 16, flex: 1 },
  badges: { flexDirection: 'row', gap: 8 },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 6, borderRadius: 10 },
  metaRow: { position: 'absolute', left: 12, right: 12, bottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  meta: { color: Colors.palette.taupe, fontSize: 12 },
  pinBtn: { backgroundColor: 'rgba(214,192,143,0.18)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  pinText: { color: Colors.palette.taupeDeep, fontSize: 12, fontWeight: '800' },
  noteBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.palette.accentGold, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10 },
  noteText: { color: '#000', fontSize: 12, fontWeight: '800' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  keyboardView: { flex: 1, justifyContent: 'flex-end' },
  modalCard: { backgroundColor: Colors.palette.beige, padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20, gap: 16, maxHeight: '80%' },
  modalTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '800', textAlign: 'center' },
  input: { backgroundColor: '#FFFFFF', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: Colors.palette.taupeDeep, borderWidth: 1, borderColor: '#EBE3D8' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 4 },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  cancelBtn: { backgroundColor: Colors.palette.card },
  createConfirmBtn: { backgroundColor: Colors.palette.accentGold },
  cancelText: { color: Colors.palette.taupeDeep, fontWeight: '700' },
  createConfirmText: { color: '#000', fontWeight: '800' },
  disabledBtn: { opacity: 0.6 },
  disabledText: { opacity: 0.7 },
});
