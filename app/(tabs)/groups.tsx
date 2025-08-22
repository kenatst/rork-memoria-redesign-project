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

type UIGroup = {
  id: string;
  name: string;
  members: number;
  cover: string;
  role: 'owner' | 'admin' | 'member';
};

export default function GroupsScreen() {
  const router = useRouter();
  const { groups: persistedGroups, createGroup, favoriteGroups, toggleFavoriteGroup } = useAppState();
  const [groups, setGroups] = useState<UIGroup[]>([]);
  const [fadeAnim] = useState(() => new Animated.Value(0));
  const [slideAnim] = useState(() => new Animated.Value(40));
  const [showCreate, setShowCreate] = useState<boolean>(false);
  const [newName, setNewName] = useState<string>('');
  const [newDescription, setNewDescription] = useState<string>('');

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
      <LinearGradient colors={['#000000', '#0B0B0D', '#131417']} style={StyleSheet.absoluteFillObject} />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>

      <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        {Platform.OS !== 'web' ? (
          <BlurView intensity={20} style={styles.headerBlur}>
            <View style={styles.headerContent}>
              <Users2 color="#FFD700" size={24} />
              <Text style={styles.headerTitle}>Groupes</Text>
              <Pressable style={styles.createBtn} testID="create-group" onPress={() => setShowCreate(true)}>
                <Plus color="#000" size={18} />
                <Text style={styles.createText}>Nouveau</Text>
              </Pressable>
            </View>
          </BlurView>
        ) : (
          <View style={[styles.headerBlur, styles.webBlur]}>
            <View style={styles.headerContent}>
              <Users2 color="#FFD700" size={24} />
              <Text style={styles.headerTitle}>Groupes</Text>
              <Pressable style={styles.createBtn} testID="create-group" onPress={() => setShowCreate(true)}>
                <Plus color="#000" size={18} />
                <Text style={styles.createText}>Nouveau</Text>
              </Pressable>
            </View>
          </View>
        )}
      </Animated.View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {groups.map((g: UIGroup) => (
          <Pressable key={g.id} style={styles.card} onPress={() => router.push(`/group/${g.id}`)} testID={`group-${g.id}`}>
            <Image source={{ uri: g.cover }} style={styles.cover} contentFit="cover" />
            <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.overlay} />
            <View style={styles.row}>
              <Text numberOfLines={1} style={styles.name}>{g.name}</Text>
              <View style={styles.badges}>
                {g.role === 'owner' && (
                  <View style={[styles.roleBadge, { backgroundColor: '#FFD700' }]}>
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
              <Pressable style={styles.pinBtn} onPress={() => toggleFavoriteGroup(g.id)} testID={`pin-group-${g.id}`}>
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
            <TextInput
              style={styles.input}
              placeholder="Nom du groupe"
              placeholderTextColor="#A9AFBC"
              value={newName}
              onChangeText={setNewName}
              testID="group-name-input"
            />
            <TextInput
              style={styles.input}
              placeholder="Description (optionnel)"
              placeholderTextColor="#A9AFBC"
              value={newDescription}
              onChangeText={setNewDescription}
              testID="group-description-input"
              multiline
              numberOfLines={3}
            />
            <View style={styles.modalActions}>
              <Pressable style={[styles.modalBtn, styles.cancelBtn]} onPress={() => setShowCreate(false)}>
                <Text style={styles.cancelText}>Annuler</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, styles.createConfirmBtn]}
                onPress={() => {
                  if (!newName.trim()) return;
                  // Utiliser le provider pour créer le groupe
                  createGroup(newName.trim(), newDescription.trim() || undefined);
                  setShowCreate(false);
                  setNewName('');
                  setNewDescription('');
                }}
                testID="confirm-create-group"
              >
                <Text style={styles.createConfirmText}>Créer</Text>
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
  container: { flex: 1, backgroundColor: '#000' },
  safeArea: { flex: 1, paddingTop: 0 },
  header: { paddingHorizontal: 20, paddingTop: 8 },
  headerBlur: { borderRadius: 16, overflow: 'hidden' },
  webBlur: { backgroundColor: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(20px)' as any },
  headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '800' },
  createBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFD700', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  createText: { color: '#000', fontSize: 12, fontWeight: '800' },
  scroll: { flex: 1 },
  content: { padding: 20, gap: 16, paddingBottom: 140 },
  card: { borderRadius: 16, overflow: 'hidden', backgroundColor: '#131417' },
  cover: { width: '100%', height: 140 },
  overlay: { position: 'absolute', left: 0, right: 0, bottom: 0, top: 0 },
  row: { position: 'absolute', left: 12, right: 12, top: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name: { color: '#fff', fontWeight: '800', fontSize: 16, flex: 1 },
  badges: { flexDirection: 'row', gap: 8 },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 6, borderRadius: 10 },
  metaRow: { position: 'absolute', left: 12, right: 12, bottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  meta: { color: '#E8EAF0', fontSize: 12 },
  pinBtn: { backgroundColor: 'rgba(255,215,0,0.15)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  pinText: { color: '#FFD700', fontSize: 12, fontWeight: '800' },
  noteBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFD700', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10 },
  noteText: { color: '#000', fontSize: 12, fontWeight: '800' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  keyboardView: { flex: 1, justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#0B0B0D', padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20, gap: 16, maxHeight: '80%' },
  modalTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '800', textAlign: 'center' },
  input: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: '#FFFFFF' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 4 },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  cancelBtn: { backgroundColor: 'rgba(255,255,255,0.06)' },
  createConfirmBtn: { backgroundColor: '#FFD700' },
  cancelText: { color: '#FFFFFF', fontWeight: '700' },
  createConfirmText: { color: '#000', fontWeight: '800' },
});
