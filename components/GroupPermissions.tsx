import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import { Shield, UserCheck, UserX, Crown, Settings, Trash2, Eye, EyeOff } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { useAppState } from '@/providers/AppStateProvider';

export type UserRole = 'owner' | 'admin' | 'member' | 'viewer';

export interface GroupMember {
  id: string;
  name: string;
  role: UserRole;
  avatar?: string;
  joinedAt: string;
  permissions: {
    canAddPhotos: boolean;
    canDeletePhotos: boolean;
    canModerate: boolean;
    canInvite: boolean;
    canManageMembers: boolean;
  };
}

interface GroupPermissionsProps {
  groupId: string;
  members: GroupMember[];
  currentUserRole: UserRole;
  onUpdateMemberRole: (memberId: string, newRole: UserRole) => void;
  onRemoveMember: (memberId: string) => void;
  onUpdatePermissions: (memberId: string, permissions: Partial<GroupMember['permissions']>) => void;
}

const ROLE_HIERARCHY: Record<UserRole, number> = {
  owner: 4,
  admin: 3,
  member: 2,
  viewer: 1,
};

const ROLE_COLORS: Record<UserRole, string> = {
  owner: '#FFD700',
  admin: '#FF6B35',
  member: '#4ECDC4',
  viewer: '#95A5A6',
};

const ROLE_ICONS: Record<UserRole, any> = {
  owner: Crown,
  admin: Shield,
  member: UserCheck,
  viewer: Eye,
};

export function GroupPermissions({ 
  groupId, 
  members, 
  currentUserRole, 
  onUpdateMemberRole, 
  onRemoveMember,
  onUpdatePermissions 
}: GroupPermissionsProps) {
  const [selectedMember, setSelectedMember] = useState<GroupMember | null>(null);
  const { displayName } = useAppState();

  const canManageRole = (targetRole: UserRole): boolean => {
    return ROLE_HIERARCHY[currentUserRole] > ROLE_HIERARCHY[targetRole];
  };

  const canManageMember = (member: GroupMember): boolean => {
    if (member.name === displayName) return false; // Can't manage yourself
    return ROLE_HIERARCHY[currentUserRole] > ROLE_HIERARCHY[member.role];
  };

  const handleRoleChange = (member: GroupMember, newRole: UserRole) => {
    if (!canManageRole(newRole)) {
      Alert.alert('Permission refusée', 'Vous ne pouvez pas attribuer ce rôle.');
      return;
    }

    Alert.alert(
      'Changer le rôle',
      `Voulez-vous vraiment changer le rôle de ${member.name} en ${getRoleDisplayName(newRole)} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Confirmer', 
          onPress: () => onUpdateMemberRole(member.id, newRole),
          style: 'destructive'
        }
      ]
    );
  };

  const handleRemoveMember = (member: GroupMember) => {
    if (!canManageMember(member)) {
      Alert.alert('Permission refusée', 'Vous ne pouvez pas supprimer ce membre.');
      return;
    }

    Alert.alert(
      'Supprimer le membre',
      `Voulez-vous vraiment supprimer ${member.name} du groupe ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Supprimer', 
          onPress: () => onRemoveMember(member.id),
          style: 'destructive'
        }
      ]
    );
  };

  const getRoleDisplayName = (role: UserRole): string => {
    const names = {
      owner: 'Propriétaire',
      admin: 'Administrateur',
      member: 'Membre',
      viewer: 'Observateur'
    };
    return names[role];
  };

  const getDefaultPermissions = (role: UserRole): GroupMember['permissions'] => {
    switch (role) {
      case 'owner':
        return {
          canAddPhotos: true,
          canDeletePhotos: true,
          canModerate: true,
          canInvite: true,
          canManageMembers: true,
        };
      case 'admin':
        return {
          canAddPhotos: true,
          canDeletePhotos: true,
          canModerate: true,
          canInvite: true,
          canManageMembers: false,
        };
      case 'member':
        return {
          canAddPhotos: true,
          canDeletePhotos: false,
          canModerate: false,
          canInvite: false,
          canManageMembers: false,
        };
      case 'viewer':
        return {
          canAddPhotos: false,
          canDeletePhotos: false,
          canModerate: false,
          canInvite: false,
          canManageMembers: false,
        };
    }
  };

  const togglePermission = (member: GroupMember, permission: keyof GroupMember['permissions']) => {
    if (!canManageMember(member)) return;

    const newPermissions = {
      ...member.permissions,
      [permission]: !member.permissions[permission]
    };

    onUpdatePermissions(member.id, newPermissions);
  };

  const renderMemberCard = (member: GroupMember) => {
    const RoleIcon = ROLE_ICONS[member.role];
    const isCurrentUser = member.name === displayName;
    const canManage = canManageMember(member);

    return (
      <View key={member.id} style={styles.memberCard}>
        {Platform.OS !== 'web' ? (
          <BlurView intensity={20} style={styles.memberCardBlur}>
            <MemberCardContent />
          </BlurView>
        ) : (
          <View style={[styles.memberCardBlur, styles.webBlur]}>
            <MemberCardContent />
          </View>
        )}
      </View>
    );

    function MemberCardContent() {
      return (
        <>
          <View style={styles.memberHeader}>
            <View style={styles.memberInfo}>
              <View style={[styles.roleIcon, { backgroundColor: ROLE_COLORS[member.role] }]}>
                <RoleIcon size={16} color="#FFFFFF" />
              </View>
              <View>
                <Text style={styles.memberName}>
                  {member.name} {isCurrentUser && '(Vous)'}
                </Text>
                <Text style={styles.memberRole}>{getRoleDisplayName(member.role)}</Text>
              </View>
            </View>

            {canManage && (
              <View style={styles.memberActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => setSelectedMember(selectedMember?.id === member.id ? null : member)}
                >
                  <Settings size={16} color="#FFFFFF" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.dangerButton]}
                  onPress={() => handleRemoveMember(member)}
                >
                  <Trash2 size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {selectedMember?.id === member.id && (
            <View style={styles.memberDetails}>
              <Text style={styles.sectionTitle}>Permissions</Text>
              
              <View style={styles.permissionsGrid}>
                {Object.entries(member.permissions).map(([key, value]) => (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.permissionItem,
                      value && styles.permissionActive
                    ]}
                    onPress={() => togglePermission(member, key as keyof GroupMember['permissions'])}
                    disabled={!canManage}
                  >
                    {value ? (
                      <UserCheck size={16} color="#4ECDC4" />
                    ) : (
                      <UserX size={16} color="#95A5A6" />
                    )}
                    <Text style={[
                      styles.permissionText,
                      value && styles.permissionActiveText
                    ]}>
                      {getPermissionDisplayName(key)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {canManage && (
                <View style={styles.roleSelector}>
                  <Text style={styles.sectionTitle}>Changer le rôle</Text>
                  <View style={styles.roleButtons}>
                    {(['viewer', 'member', 'admin', 'owner'] as UserRole[]).map((role) => {
                      if (!canManageRole(role) && role !== member.role) return null;
                      
                      const RoleButtonIcon = ROLE_ICONS[role];
                      return (
                        <TouchableOpacity
                          key={role}
                          style={[
                            styles.roleButton,
                            member.role === role && styles.roleButtonActive,
                            { borderColor: ROLE_COLORS[role] }
                          ]}
                          onPress={() => handleRoleChange(member, role)}
                          disabled={role === member.role}
                        >
                          <RoleButtonIcon size={16} color={ROLE_COLORS[role]} />
                          <Text style={[styles.roleButtonText, { color: ROLE_COLORS[role] }]}>
                            {getRoleDisplayName(role)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}
            </View>
          )}
        </>
      );
    }
  };

  const getPermissionDisplayName = (permission: string): string => {
    const names: Record<string, string> = {
      canAddPhotos: 'Ajouter photos',
      canDeletePhotos: 'Supprimer photos',
      canModerate: 'Modérer',
      canInvite: 'Inviter',
      canManageMembers: 'Gérer membres'
    };
    return names[permission] || permission;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Shield size={24} color="#FFD700" />
        <Text style={styles.title}>Gestion des Permissions</Text>
      </View>

      <ScrollView style={styles.membersList} showsVerticalScrollIndicator={false}>
        {members.map(renderMemberCard)}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  membersList: {
    flex: 1,
  },
  memberCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  memberCardBlur: {
    padding: 16,
  },
  webBlur: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    backdropFilter: 'blur(20px)',
  },
  memberHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  roleIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  memberRole: {
    fontSize: 12,
    color: '#95A5A6',
  },
  memberActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dangerButton: {
    backgroundColor: 'rgba(255,59,48,0.2)',
  },
  memberDetails: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  permissionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    gap: 6,
  },
  permissionActive: {
    backgroundColor: 'rgba(78,205,196,0.2)',
  },
  permissionText: {
    fontSize: 12,
    color: '#95A5A6',
  },
  permissionActiveText: {
    color: '#4ECDC4',
  },
  roleSelector: {
    marginTop: 16,
  },
  roleButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  roleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    gap: 6,
  },
  roleButtonActive: {
    backgroundColor: 'rgba(255,215,0,0.2)',
  },
  roleButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
});