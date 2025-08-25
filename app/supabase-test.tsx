import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, ScrollView, Alert, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  Database, 
  Users, 
  Image as ImageIcon, 
  MessageCircle,
  Heart,
  CheckCircle,
  XCircle,
  Loader,
  LogIn,
  LogOut,
  UserPlus
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useSupabase } from '@/providers/SupabaseProvider';
import { useAlbums, usePhotos, useGroups, useComments } from '@/lib/supabase-hooks';

export default function SupabaseTestScreen() {
  const { user, loading: authLoading, signIn, signUp, signOut } = useSupabase();
  const { albums, loading: albumsLoading, createAlbum } = useAlbums();
  const { photos, loading: photosLoading, addPhoto } = usePhotos();
  const { groups, loading: groupsLoading, createGroup, joinGroup } = useGroups();
  const { comments, loading: commentsLoading, addComment } = useComments();

  const [email, setEmail] = useState('test@memoria.app');
  const [password, setPassword] = useState('testpassword123');
  const [displayName, setDisplayName] = useState('Test User');
  const [albumName, setAlbumName] = useState('Mon Album Test');
  const [groupName, setGroupName] = useState('Mon Groupe Test');
  const [inviteCode, setInviteCode] = useState('');
  const [commentText, setCommentText] = useState('Super photo !');

  const [testResults, setTestResults] = useState<Record<string, 'idle' | 'loading' | 'success' | 'error'>>({
    auth: 'idle',
    albums: 'idle',
    photos: 'idle',
    groups: 'idle',
    comments: 'idle',
  });

  const updateTestResult = (test: string, status: 'idle' | 'loading' | 'success' | 'error') => {
    setTestResults(prev => ({ ...prev, [test]: status }));
  };

  const handleSignUp = async () => {
    updateTestResult('auth', 'loading');
    try {
      const { error } = await signUp(email, password, displayName);
      if (error) throw error;
      updateTestResult('auth', 'success');
      Alert.alert('✅ Inscription', 'Compte créé avec succès !');
    } catch (error) {
      updateTestResult('auth', 'error');
      Alert.alert('❌ Erreur', error instanceof Error ? error.message : 'Erreur inconnue');
    }
  };

  const handleSignIn = async () => {
    updateTestResult('auth', 'loading');
    try {
      const { error } = await signIn(email, password);
      if (error) throw error;
      updateTestResult('auth', 'success');
      Alert.alert('✅ Connexion', 'Connecté avec succès !');
    } catch (error) {
      updateTestResult('auth', 'error');
      Alert.alert('❌ Erreur', error instanceof Error ? error.message : 'Erreur de connexion');
    }
  };

  const handleSignOut = async () => {
    try {
      const { error } = await signOut();
      if (error) throw error;
      Alert.alert('✅ Déconnexion', 'Déconnecté avec succès !');
    } catch (error) {
      Alert.alert('❌ Erreur', error instanceof Error ? error.message : 'Erreur de déconnexion');
    }
  };

  const handleCreateAlbum = async () => {
    if (!user) {
      Alert.alert('Erreur', 'Vous devez être connecté');
      return;
    }

    updateTestResult('albums', 'loading');
    try {
      await createAlbum({
        name: albumName,
        description: 'Album créé depuis le test Supabase',
        is_public: false,
      });
      updateTestResult('albums', 'success');
      Alert.alert('✅ Album', 'Album créé avec succès !');
    } catch (error) {
      updateTestResult('albums', 'error');
      Alert.alert('❌ Erreur', error instanceof Error ? error.message : 'Erreur création album');
    }
  };

  const handleAddPhoto = async () => {
    if (!user || albums.length === 0) {
      Alert.alert('Erreur', 'Vous devez être connecté et avoir au moins un album');
      return;
    }

    updateTestResult('photos', 'loading');
    try {
      await addPhoto({
        uri: 'https://picsum.photos/800/600',
        album_id: albums[0].id,
        metadata: {
          timestamp: new Date().toISOString(),
          source: 'supabase-test'
        },
        tags: ['test', 'supabase']
      });
      updateTestResult('photos', 'success');
      Alert.alert('✅ Photo', 'Photo ajoutée avec succès !');
    } catch (error) {
      updateTestResult('photos', 'error');
      Alert.alert('❌ Erreur', error instanceof Error ? error.message : 'Erreur ajout photo');
    }
  };

  const handleCreateGroup = async () => {
    if (!user) {
      Alert.alert('Erreur', 'Vous devez être connecté');
      return;
    }

    updateTestResult('groups', 'loading');
    try {
      const group = await createGroup({
        name: groupName,
        description: 'Groupe créé depuis le test Supabase',
        invite_code: Math.random().toString(36).substring(2, 8).toUpperCase(),
      });
      updateTestResult('groups', 'success');
      Alert.alert('✅ Groupe', `Groupe créé avec succès !\nCode d'invitation: ${group.invite_code}`);
    } catch (error) {
      updateTestResult('groups', 'error');
      Alert.alert('❌ Erreur', error instanceof Error ? error.message : 'Erreur création groupe');
    }
  };

  const handleJoinGroup = async () => {
    if (!user || !inviteCode.trim()) {
      Alert.alert('Erreur', 'Vous devez être connecté et saisir un code d\'invitation');
      return;
    }

    updateTestResult('groups', 'loading');
    try {
      const group = await joinGroup(inviteCode.trim().toUpperCase());
      updateTestResult('groups', 'success');
      Alert.alert('✅ Groupe', `Vous avez rejoint le groupe "${group.name}" !`);
    } catch (error) {
      updateTestResult('groups', 'error');
      Alert.alert('❌ Erreur', error instanceof Error ? error.message : 'Code d\'invitation invalide');
    }
  };

  const handleAddComment = async () => {
    if (!user || (albums.length === 0 && photos.length === 0)) {
      Alert.alert('Erreur', 'Vous devez être connecté et avoir au moins un album ou une photo');
      return;
    }

    updateTestResult('comments', 'loading');
    try {
      // Commenter sur le premier album s'il existe
      if (albums.length > 0) {
        await addComment(commentText);
        updateTestResult('comments', 'success');
        Alert.alert('✅ Commentaire', 'Commentaire ajouté avec succès !');
      }
    } catch (error) {
      updateTestResult('comments', 'error');
      Alert.alert('❌ Erreur', error instanceof Error ? error.message : 'Erreur ajout commentaire');
    }
  };

  const getStatusIcon = (status: 'idle' | 'loading' | 'success' | 'error') => {
    switch (status) {
      case 'loading':
        return <Loader color={Colors.palette.accentGold} size={20} />;
      case 'success':
        return <CheckCircle color="#4CAF50" size={20} />;
      case 'error':
        return <XCircle color="#F44336" size={20} />;
      default:
        return <View style={styles.idleIcon} />;
    }
  };

  const getStatusColor = (status: 'idle' | 'loading' | 'success' | 'error') => {
    switch (status) {
      case 'loading':
        return Colors.palette.accentGold;
      case 'success':
        return '#4CAF50';
      case 'error':
        return '#F44336';
      default:
        return Colors.palette.taupe;
    }
  };

  if (authLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={['#000000', '#1a1a1a']} style={StyleSheet.absoluteFillObject} />
        <View style={styles.loadingContainer}>
          <Loader color={Colors.palette.accentGold} size={32} />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#000000', '#1a1a1a']} style={StyleSheet.absoluteFillObject} />
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Database color={Colors.palette.accentGold} size={32} />
          </View>
          <Text style={styles.title}>Test Supabase</Text>
          <Text style={styles.subtitle}>
            Testez toutes les fonctionnalités de la base de données
          </Text>
        </View>

        {/* User Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👤 Statut utilisateur</Text>
          {user ? (
            <View style={styles.userCard}>
              <Text style={styles.userText}>Connecté en tant que:</Text>
              <Text style={styles.userEmail}>{user.email}</Text>
              <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
                <LogOut color="#FFFFFF" size={16} />
                <Text style={styles.signOutButtonText}>Se déconnecter</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.authCard}>
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor={Colors.palette.taupe}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <TextInput
                style={styles.input}
                placeholder="Mot de passe"
                placeholderTextColor={Colors.palette.taupe}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
              <TextInput
                style={styles.input}
                placeholder="Nom d'affichage"
                placeholderTextColor={Colors.palette.taupe}
                value={displayName}
                onChangeText={setDisplayName}
              />
              <View style={styles.authButtons}>
                <TouchableOpacity style={styles.authButton} onPress={handleSignIn}>
                  <LogIn color="#000000" size={16} />
                  <Text style={styles.authButtonText}>Se connecter</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.authButton} onPress={handleSignUp}>
                  <UserPlus color="#000000" size={16} />
                  <Text style={styles.authButtonText}>S'inscrire</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {user && (
          <>
            {/* Albums Test */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>📁 Albums ({albums.length})</Text>
                {getStatusIcon(testResults.albums)}
              </View>
              <TextInput
                style={styles.input}
                placeholder="Nom de l'album"
                placeholderTextColor={Colors.palette.taupe}
                value={albumName}
                onChangeText={setAlbumName}
              />
              <TouchableOpacity 
                style={styles.testButton} 
                onPress={handleCreateAlbum}
                disabled={albumsLoading}
              >
                <Text style={styles.testButtonText}>
                  {albumsLoading ? 'Création...' : 'Créer un album'}
                </Text>
              </TouchableOpacity>
              {albums.length > 0 && (
                <View style={styles.dataList}>
                  {albums.slice(0, 3).map(album => (
                    <Text key={album.id} style={styles.dataItem}>
                      • {album.name} ({album.created_at.split('T')[0]})
                    </Text>
                  ))}
                </View>
              )}
            </View>

            {/* Photos Test */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>📸 Photos ({photos.length})</Text>
                {getStatusIcon(testResults.photos)}
              </View>
              <TouchableOpacity 
                style={[styles.testButton, albums.length === 0 && styles.disabledButton]} 
                onPress={handleAddPhoto}
                disabled={photosLoading || albums.length === 0}
              >
                <Text style={styles.testButtonText}>
                  {photosLoading ? 'Ajout...' : 'Ajouter une photo'}
                </Text>
              </TouchableOpacity>
              {albums.length === 0 && (
                <Text style={styles.warningText}>Créez d'abord un album</Text>
              )}
            </View>

            {/* Groups Test */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>👥 Groupes ({groups.length})</Text>
                {getStatusIcon(testResults.groups)}
              </View>
              <TextInput
                style={styles.input}
                placeholder="Nom du groupe"
                placeholderTextColor={Colors.palette.taupe}
                value={groupName}
                onChangeText={setGroupName}
              />
              <TouchableOpacity 
                style={styles.testButton} 
                onPress={handleCreateGroup}
                disabled={groupsLoading}
              >
                <Text style={styles.testButtonText}>
                  {groupsLoading ? 'Création...' : 'Créer un groupe'}
                </Text>
              </TouchableOpacity>
              
              <View style={styles.divider} />
              
              <TextInput
                style={styles.input}
                placeholder="Code d'invitation"
                placeholderTextColor={Colors.palette.taupe}
                value={inviteCode}
                onChangeText={setInviteCode}
                autoCapitalize="characters"
              />
              <TouchableOpacity 
                style={styles.testButton} 
                onPress={handleJoinGroup}
                disabled={groupsLoading}
              >
                <Text style={styles.testButtonText}>Rejoindre un groupe</Text>
              </TouchableOpacity>
            </View>

            {/* Comments Test */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>💬 Commentaires ({comments.length})</Text>
                {getStatusIcon(testResults.comments)}
              </View>
              <TextInput
                style={styles.input}
                placeholder="Votre commentaire"
                placeholderTextColor={Colors.palette.taupe}
                value={commentText}
                onChangeText={setCommentText}
              />
              <TouchableOpacity 
                style={[styles.testButton, albums.length === 0 && styles.disabledButton]} 
                onPress={handleAddComment}
                disabled={commentsLoading || albums.length === 0}
              >
                <Text style={styles.testButtonText}>
                  {commentsLoading ? 'Ajout...' : 'Ajouter un commentaire'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Database Status */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📊 État de la base de données</Text>
              <View style={styles.statusList}>
                <View style={styles.statusItem}>
                  <Users color={Colors.palette.accentGold} size={20} />
                  <Text style={styles.statusText}>Profil utilisateur</Text>
                  <Text style={styles.statusValue}>Actif</Text>
                </View>
                <View style={styles.statusItem}>
                  <ImageIcon color={Colors.palette.accentGold} size={20} />
                  <Text style={styles.statusText}>Albums</Text>
                  <Text style={styles.statusValue}>{albums.length}</Text>
                </View>
                <View style={styles.statusItem}>
                  <ImageIcon color={Colors.palette.accentGold} size={20} />
                  <Text style={styles.statusText}>Photos</Text>
                  <Text style={styles.statusValue}>{photos.length}</Text>
                </View>
                <View style={styles.statusItem}>
                  <Users color={Colors.palette.accentGold} size={20} />
                  <Text style={styles.statusText}>Groupes</Text>
                  <Text style={styles.statusValue}>{groups.length}</Text>
                </View>
                <View style={styles.statusItem}>
                  <MessageCircle color={Colors.palette.accentGold} size={20} />
                  <Text style={styles.statusText}>Commentaires</Text>
                  <Text style={styles.statusValue}>{comments.length}</Text>
                </View>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    color: Colors.palette.taupe,
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
  },
  userCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  userText: {
    color: Colors.palette.taupe,
    fontSize: 14,
    marginBottom: 4,
  },
  userEmail: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF5252',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  signOutButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  authCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 12,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#FFFFFF',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  authButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  authButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.palette.accentGold,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  authButtonText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '600',
  },
  testButton: {
    backgroundColor: Colors.palette.accentGold,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  disabledButton: {
    backgroundColor: 'rgba(255, 215, 0, 0.3)',
  },
  testButtonText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '600',
  },
  warningText: {
    color: '#FF9800',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 16,
  },
  dataList: {
    marginTop: 12,
    gap: 4,
  },
  dataItem: {
    color: Colors.palette.taupe,
    fontSize: 12,
  },
  statusList: {
    gap: 12,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
    marginLeft: 12,
  },
  statusValue: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '600',
  },
  idleIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.palette.taupe,
  },
});