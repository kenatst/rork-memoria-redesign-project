import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, Text, ScrollView, Pressable, Platform, Modal, TextInput, KeyboardAvoidingView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, UserPlus, Edit3, MessageSquare, Eye, Wifi, WifiOff, Crown, Shield } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useToast } from '@/providers/ToastProvider';
import { useAccessibility } from '@/components/AccessibilityProvider';
import Colors from '@/constants/colors';

interface Collaborator {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: 'owner' | 'editor' | 'viewer';
  status: 'online' | 'offline' | 'editing';
  lastSeen: Date;
  permissions: {
    canEdit: boolean;
    canDelete: boolean;
    canInvite: boolean;
    canComment: boolean;
  };
}

interface RealtimeActivity {
  id: string;
  userId: string;
  userName: string;
  action: 'editing' | 'commenting' | 'viewing' | 'uploading';
  target: string;
  timestamp: Date;
}

export default function CollaborationScreen() {
  const router = useRouter();
  const { showError, showSuccess } = useToast();
  const { announceForAccessibility } = useAccessibility();

  const [collaborators, setCollaborators] = useState<Collaborator[]>([
    {
      id: '1',
      name: 'Marie Dubois',
      email: 'marie@example.com',
      avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?q=80&w=400&auto=format&fit=crop',
      role: 'editor',
      status: 'online',
      lastSeen: new Date(),
      permissions: { canEdit: true, canDelete: false, canInvite: false, canComment: true }
    },
    {
      id: '2',
      name: 'Thomas Martin',
      email: 'thomas@example.com',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=400&auto=format&fit=crop',
      role: 'viewer',
      status: 'editing',
      lastSeen: new Date(Date.now() - 5 * 60 * 1000),
      permissions: { canEdit: false, canDelete: false, canInvite: false, canComment: true }
    },
    {
      id: '3',
      name: 'Sophie Laurent',
      email: 'sophie@example.com',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=400&auto=format&fit=crop',
      role: 'editor',
      status: 'offline',
      lastSeen: new Date(Date.now() - 2 * 60 * 60 * 1000),
      permissions: { canEdit: true, canDelete: true, canInvite: true, canComment: true }
    }
  ]);

  const [realtimeActivities, setRealtimeActivities] = useState<RealtimeActivity[]>([
    {
      id: '1',
      userId: '2',
      userName: 'Thomas Martin',
      action: 'editing',
      target: 'Photo "Coucher de soleil"',
      timestamp: new Date(Date.now() - 30 * 1000)
    },
    {
      id: '2',
      userId: '1',
      userName: 'Marie Dubois',
      action: 'commenting',
      target: 'Album "Vacances été"',
      timestamp: new Date(Date.now() - 2 * 60 * 1000)
    },
    {
      id: '3',
      userId: '3',
      userName: 'Sophie Laurent',
      action: 'uploading',
      target: '3 nouvelles photos',
      timestamp: new Date(Date.now() - 5 * 60 * 1000)
    }
  ]);

  const [showInviteModal, setShowInviteModal] = useState<boolean>(false);
  const [inviteEmail, setInviteEmail] = useState<string>('');
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('viewer');
  const [isInviting, setIsInviting] = useState<boolean>(false);

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      // Update online status randomly
      setCollaborators(prev => prev.map(collab => ({
        ...collab,
        status: Math.random() > 0.7 ? 'editing' : collab.status === 'offline' ? 'offline' : 'online'
      })));

      // Add new activity occasionally
      if (Math.random() > 0.8) {
        const activities = ['viewing', 'commenting', 'editing'] as const;
        const targets = ['Photo "Sunset"', 'Album "Family"', 'Comment thread'];
        
        setRealtimeActivities(prev => [
          {
            id: Date.now().toString(),
            userId: collaborators[Math.floor(Math.random() * collaborators.length)].id,
            userName: collaborators[Math.floor(Math.random() * collaborators.length)].name,
            action: activities[Math.floor(Math.random() * activities.length)],
            target: targets[Math.floor(Math.random() * targets.length)],
            timestamp: new Date()
          },
          ...prev.slice(0, 4) // Keep only 5 most recent
        ]);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [collaborators]);

  const handleBack = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.back();
  }, [router]);

  const handleInviteCollaborator = useCallback(async () => {
    if (!inviteEmail.trim()) {
      showError('Email requis', 'Veuillez saisir une adresse email');
      return;
    }

    if (!inviteEmail.includes('@')) {
      showError('Email invalide', 'Veuillez saisir une adresse email valide');
      return;
    }

    setIsInviting(true);
    
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    try {
      // Simulate invitation process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Add new collaborator
      const newCollaborator: Collaborator = {
        id: Date.now().toString(),
        name: inviteEmail.split('@')[0],
        email: inviteEmail,
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=400&auto=format&fit=crop',
        role: inviteRole,
        status: 'offline',
        lastSeen: new Date(),
        permissions: {
          canEdit: inviteRole === 'editor',
          canDelete: false,
          canInvite: false,
          canComment: true
        }
      };

      setCollaborators(prev => [...prev, newCollaborator]);
      
      showSuccess(
        'Invitation envoyée',
        `${inviteEmail} a été invité comme ${inviteRole === 'editor' ? 'éditeur' : 'observateur'}`
      );
      
      announceForAccessibility(`Invitation envoyée à ${inviteEmail}`);
      
      // Reset form
      setShowInviteModal(false);
      setInviteEmail('');
      setInviteRole('viewer');
      
    } catch (error) {
      console.error('Error inviting collaborator:', error);
      showError('Erreur d\'invitation', 'Impossible d\'envoyer l\'invitation');
      announceForAccessibility('Erreur lors de l\'envoi de l\'invitation');
    } finally {
      setIsInviting(false);
    }
  }, [inviteEmail, inviteRole, showError, showSuccess, announceForAccessibility]);

  const handleRoleChange = useCallback(async (collaboratorId: string, newRole: 'editor' | 'viewer') => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    setCollaborators(prev => prev.map(collab => 
      collab.id === collaboratorId 
        ? {
            ...collab,
            role: newRole,
            permissions: {
              ...collab.permissions,
              canEdit: newRole === 'editor',
              canDelete: newRole === 'editor' && collab.role === 'owner'
            }
          }
        : collab
    ));

    const collaborator = collaborators.find(c => c.id === collaboratorId);
    showSuccess(
      'Rôle modifié',
      `${collaborator?.name} est maintenant ${newRole === 'editor' ? 'éditeur' : 'observateur'}`
    );
    
    announceForAccessibility(`Rôle de ${collaborator?.name} changé vers ${newRole === 'editor' ? 'éditeur' : 'observateur'}`);
  }, [collaborators, showSuccess, announceForAccessibility]);

  const getStatusIcon = (status: Collaborator['status']) => {
    switch (status) {
      case 'online': return <Wifi size={12} color="#2ECC71" />;
      case 'editing': return <Edit3 size={12} color="#F39C12" />;
      case 'offline': return <WifiOff size={12} color={Colors.palette.taupe} />;
    }
  };

  const getStatusColor = (status: Collaborator['status']) => {
    switch (status) {
      case 'online': return '#2ECC71';
      case 'editing': return '#F39C12';
      case 'offline': return Colors.palette.taupe;
    }
  };

  const getRoleIcon = (role: Collaborator['role']) => {
    switch (role) {
      case 'owner': return <Crown size={16} color={Colors.palette.accentGold} />;
      case 'editor': return <Edit3 size={16} color="#3498DB" />;
      case 'viewer': return <Eye size={16} color={Colors.palette.taupe} />;
    }
  };

  const getActivityIcon = (action: RealtimeActivity['action']) => {
    switch (action) {
      case 'editing': return <Edit3 size={16} color="#F39C12" />;
      case 'commenting': return <MessageSquare size={16} color="#9B59B6" />;
      case 'viewing': return <Eye size={16} color="#3498DB" />;
      case 'uploading': return <UserPlus size={16} color="#2ECC71" />;
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins}min`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    return `Il y a ${diffDays}j`;
  };

  const onlineCount = collaborators.filter(c => c.status === 'online' || c.status === 'editing').length;
  const editingCount = collaborators.filter(c => c.status === 'editing').length;

  return (
    <View style={styles.container}>
      <LinearGradient 
        colors={['#000000', '#0B0B0D', '#131417']} 
        style={StyleSheet.absoluteFillObject} 
        start={{ x: 0, y: 0 }} 
        end={{ x: 1, y: 1 }} 
      />
      
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable 
            style={styles.backButton}
            onPress={handleBack}
            accessibilityLabel="Retour"
            accessibilityRole="button"
            testID="back-button"
          >
            <ArrowLeft size={24} color={Colors.palette.taupeDeep} />
          </Pressable>
          
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Collaboration</Text>
            <Text style={styles.headerSubtitle}>
              {onlineCount} en ligne • {editingCount} en édition
            </Text>
          </View>
          
          <Pressable 
            style={styles.inviteButton}
            onPress={() => setShowInviteModal(true)}
            accessibilityLabel="Inviter un collaborateur"
            accessibilityRole="button"
            testID="invite-button"
          >
            <UserPlus size={20} color="#000000" />
          </Pressable>
        </View>

        <ScrollView 
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Real-time Status */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Activité en temps réel</Text>
            
            <View style={styles.statusGrid}>
              <View style={styles.statusCard}>
                <View style={[styles.statusIcon, { backgroundColor: 'rgba(46, 204, 113, 0.1)' }]}>
                  <Wifi size={20} color="#2ECC71" />
                </View>
                <Text style={styles.statusValue}>{onlineCount}</Text>
                <Text style={styles.statusLabel}>En ligne</Text>
              </View>
              
              <View style={styles.statusCard}>
                <View style={[styles.statusIcon, { backgroundColor: 'rgba(243, 156, 18, 0.1)' }]}>
                  <Edit3 size={20} color="#F39C12" />
                </View>
                <Text style={styles.statusValue}>{editingCount}</Text>
                <Text style={styles.statusLabel}>En édition</Text>
              </View>
              
              <View style={styles.statusCard}>
                <View style={[styles.statusIcon, { backgroundColor: 'rgba(155, 89, 182, 0.1)' }]}>
                  <MessageSquare size={20} color="#9B59B6" />
                </View>
                <Text style={styles.statusValue}>12</Text>
                <Text style={styles.statusLabel}>Commentaires</Text>
              </View>
            </View>
          </View>

          {/* Recent Activity */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Activité récente</Text>
            
            <View style={styles.activityList}>
              {realtimeActivities.map((activity) => (
                <View key={activity.id} style={styles.activityItem}>
                  <View style={styles.activityIcon}>
                    {getActivityIcon(activity.action)}
                  </View>
                  <View style={styles.activityContent}>
                    <Text style={styles.activityText}>
                      <Text style={styles.activityUser}>{activity.userName}</Text>
                      {' '}
                      {activity.action === 'editing' && 'modifie'}
                      {activity.action === 'commenting' && 'commente'}
                      {activity.action === 'viewing' && 'consulte'}
                      {activity.action === 'uploading' && 'ajoute'}
                      {' '}
                      <Text style={styles.activityTarget}>{activity.target}</Text>
                    </Text>
                    <Text style={styles.activityTime}>
                      {formatTimeAgo(activity.timestamp)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Collaborators */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Collaborateurs ({collaborators.length})</Text>
            
            <View style={styles.collaboratorsList}>
              {collaborators.map((collaborator) => (
                <View key={collaborator.id} style={styles.collaboratorItem}>
                  <View style={styles.collaboratorLeft}>
                    <View style={styles.avatarContainer}>
                      <View style={styles.avatar}>
                        <Text style={styles.avatarText}>
                          {collaborator.name.split(' ').map(n => n[0]).join('')}
                        </Text>
                      </View>
                      <View style={[styles.statusDot, { backgroundColor: getStatusColor(collaborator.status) }]} />
                    </View>
                    
                    <View style={styles.collaboratorInfo}>
                      <View style={styles.collaboratorHeader}>
                        <Text style={styles.collaboratorName}>{collaborator.name}</Text>
                        <View style={styles.roleContainer}>
                          {getRoleIcon(collaborator.role)}
                          <Text style={styles.roleText}>
                            {collaborator.role === 'owner' ? 'Propriétaire' : 
                             collaborator.role === 'editor' ? 'Éditeur' : 'Observateur'}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.collaboratorEmail}>{collaborator.email}</Text>
                      <View style={styles.collaboratorStatus}>
                        {getStatusIcon(collaborator.status)}
                        <Text style={[styles.statusText, { color: getStatusColor(collaborator.status) }]}>
                          {collaborator.status === 'online' && 'En ligne'}
                          {collaborator.status === 'editing' && 'En édition'}
                          {collaborator.status === 'offline' && `Vu ${formatTimeAgo(collaborator.lastSeen)}`}
                        </Text>
                      </View>
                    </View>
                  </View>
                  
                  {collaborator.role !== 'owner' && (
                    <View style={styles.collaboratorActions}>
                      <Pressable 
                        style={styles.roleButton}
                        onPress={() => handleRoleChange(
                          collaborator.id, 
                          collaborator.role === 'editor' ? 'viewer' : 'editor'
                        )}
                        accessibilityLabel={`Changer le rôle de ${collaborator.name}`}
                        accessibilityRole="button"
                        testID={`role-${collaborator.id}`}
                      >
                        <Shield size={16} color={Colors.palette.accentGold} />
                      </Pressable>
                    </View>
                  )}
                </View>
              ))}
            </View>
          </View>

          {/* Permissions Overview */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Permissions</Text>
            
            <View style={styles.permissionsCard}>
              <View style={styles.permissionRow}>
                <Edit3 size={16} color="#3498DB" />
                <Text style={styles.permissionText}>
                  {collaborators.filter(c => c.permissions.canEdit).length} peuvent éditer
                </Text>
              </View>
              <View style={styles.permissionRow}>
                <MessageSquare size={16} color="#9B59B6" />
                <Text style={styles.permissionText}>
                  {collaborators.filter(c => c.permissions.canComment).length} peuvent commenter
                </Text>
              </View>
              <View style={styles.permissionRow}>
                <UserPlus size={16} color="#2ECC71" />
                <Text style={styles.permissionText}>
                  {collaborators.filter(c => c.permissions.canInvite).length} peuvent inviter
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Invite Modal */}
        <Modal 
          visible={showInviteModal} 
          animationType="slide" 
          transparent 
          onRequestClose={() => setShowInviteModal(false)}
        >
          <KeyboardAvoidingView 
            style={styles.modalBackdrop} 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Inviter un collaborateur</Text>
              
              <TextInput
                style={styles.emailInput}
                placeholder="Adresse email"
                placeholderTextColor={Colors.palette.taupe}
                value={inviteEmail}
                onChangeText={setInviteEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                testID="invite-email-input"
              />
              
              <View style={styles.roleSelector}>
                <Text style={styles.roleSelectorTitle}>Rôle</Text>
                <View style={styles.roleOptions}>
                  {(['viewer', 'editor'] as const).map((role) => (
                    <Pressable
                      key={role}
                      style={[styles.roleOption, inviteRole === role && styles.roleOptionSelected]}
                      onPress={() => setInviteRole(role)}
                      testID={`role-${role}`}
                    >
                      <Text style={[styles.roleOptionText, inviteRole === role && styles.roleOptionTextSelected]}>
                        {role === 'editor' ? 'Éditeur' : 'Observateur'}
                      </Text>
                      <Text style={styles.roleOptionDescription}>
                        {role === 'editor' 
                          ? 'Peut modifier et ajouter du contenu'
                          : 'Peut seulement voir et commenter'
                        }
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
              
              <View style={styles.modalActions}>
                <Pressable 
                  style={styles.modalButton}
                  onPress={() => setShowInviteModal(false)}
                  testID="cancel-invite"
                >
                  <Text style={styles.modalButtonText}>Annuler</Text>
                </Pressable>
                <Pressable 
                  style={[styles.modalButton, styles.modalButtonPrimary]}
                  onPress={handleInviteCollaborator}
                  disabled={isInviting}
                  testID="send-invite"
                >
                  <Text style={[styles.modalButtonText, styles.modalButtonTextPrimary]}>
                    {isInviting ? 'Envoi...' : 'Inviter'}
                  </Text>
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: Colors.palette.taupe,
    fontSize: 14,
    marginTop: 2,
  },
  inviteButton: {
    backgroundColor: Colors.palette.accentGold,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    color: Colors.palette.taupeDeep,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  statusGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statusCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statusIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statusValue: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  statusLabel: {
    color: Colors.palette.taupe,
    fontSize: 12,
  },
  activityList: {
    gap: 12,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    color: Colors.palette.taupeDeep,
    fontSize: 14,
    lineHeight: 20,
  },
  activityUser: {
    fontWeight: '700',
  },
  activityTarget: {
    fontStyle: 'italic',
  },
  activityTime: {
    color: Colors.palette.taupe,
    fontSize: 12,
    marginTop: 4,
  },
  collaboratorsList: {
    gap: 16,
  },
  collaboratorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    padding: 16,
  },
  collaboratorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.palette.accentGold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '800',
  },
  statusDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#131417',
  },
  collaboratorInfo: {
    flex: 1,
  },
  collaboratorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  collaboratorName: {
    color: Colors.palette.taupeDeep,
    fontSize: 16,
    fontWeight: '700',
  },
  roleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  roleText: {
    color: Colors.palette.taupe,
    fontSize: 12,
    fontWeight: '600',
  },
  collaboratorEmail: {
    color: Colors.palette.taupe,
    fontSize: 14,
    marginBottom: 6,
  },
  collaboratorStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  collaboratorActions: {
    flexDirection: 'row',
    gap: 8,
  },
  roleButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,215,0,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionsCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  permissionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  permissionText: {
    color: Colors.palette.taupeDeep,
    fontSize: 14,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#0B0B0D',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 20,
  },
  emailInput: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    padding: 16,
    color: '#FFFFFF',
    fontSize: 16,
    marginBottom: 20,
  },
  roleSelector: {
    marginBottom: 20,
  },
  roleSelectorTitle: {
    color: Colors.palette.taupeDeep,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  roleOptions: {
    gap: 8,
  },
  roleOption: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    padding: 16,
  },
  roleOptionSelected: {
    backgroundColor: 'rgba(255,215,0,0.1)',
    borderWidth: 1,
    borderColor: Colors.palette.accentGold,
  },
  roleOptionText: {
    color: Colors.palette.taupeDeep,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  roleOptionTextSelected: {
    color: Colors.palette.accentGold,
  },
  roleOptionDescription: {
    color: Colors.palette.taupe,
    fontSize: 12,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
  },
  modalButtonPrimary: {
    backgroundColor: Colors.palette.accentGold,
  },
  modalButtonText: {
    color: Colors.palette.taupeDeep,
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonTextPrimary: {
    color: '#000000',
    fontWeight: '700',
  },
});