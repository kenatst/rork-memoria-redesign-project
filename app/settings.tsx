import React, { useCallback } from 'react';
import { View, StyleSheet, Text, ScrollView, Pressable, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, User, Bell, Shield, Palette, Globe, HelpCircle, LogOut, Settings as SettingsIcon, BarChart3, Share2, UserPlus } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/providers/AuthProvider';
import { useToast } from '@/providers/ToastProvider';
import { useAccessibility } from '@/components/AccessibilityProvider';
import Colors from '@/constants/colors';

interface SettingItem {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  color: string;
  route?: string;
  action?: () => void;
}

export default function SettingsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { showError, showSuccess } = useToast();
  const { announceForAccessibility, getAccessibleLabel } = useAccessibility();

  const settings: SettingItem[] = [
    {
      id: 'profile',
      title: 'Profil',
      description: 'Informations personnelles et avatar',
      icon: User,
      color: '#3498DB',
      route: '/profile'
    },
    {
      id: 'notifications',
      title: 'Notifications',
      description: 'Gérer les alertes et rappels',
      icon: Bell,
      color: '#F39C12',
      route: '/notification-settings'
    },
    {
      id: 'analytics',
      title: 'Analytics & Insights',
      description: 'Statistiques d\'usage et rapports',
      icon: BarChart3,
      color: '#3498DB',
      route: '/analytics'
    },
    {
      id: 'social_share',
      title: 'Partage Social',
      description: 'Instagram, TikTok, Stories avancées',
      icon: Share2,
      color: '#E4405F',
      route: '/social-share'
    },
    {
      id: 'collaboration',
      title: 'Collaboration',
      description: 'Édition temps réel et permissions',
      icon: UserPlus,
      color: '#9B59B6',
      route: '/collaboration'
    },
    {
      id: 'privacy',
      title: 'Confidentialité',
      description: 'Contrôle des données et sécurité',
      icon: Shield,
      color: '#2ECC71',
      route: '/privacy'
    },
    {
      id: 'appearance',
      title: 'Apparence',
      description: 'Thème et personnalisation',
      icon: Palette,
      color: '#E67E22',
      route: '/appearance'
    },
    {
      id: 'language',
      title: 'Langue',
      description: 'Français, English, Español',
      icon: Globe,
      color: '#1ABC9C',
      route: '/language'
    },
    {
      id: 'help',
      title: 'Aide & Support',
      description: 'FAQ, contact et tutoriels',
      icon: HelpCircle,
      color: '#95A5A6',
      route: '/help'
    }
  ];

  const handleBack = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.back();
  }, [router]);

  const handleSettingPress = useCallback((setting: SettingItem) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    if (setting.route) {
      router.push(setting.route as any);
    } else if (setting.action) {
      setting.action();
    }

    announceForAccessibility(`Navigation vers ${setting.title}`);
  }, [router, announceForAccessibility]);

  const handleLogout = useCallback(async () => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }

    try {
      // Simulate logout
      showSuccess('Déconnexion', 'Vous avez été déconnecté avec succès');
      announceForAccessibility('Déconnexion réussie');
      router.push('/');
    } catch (error) {
      console.error('Error logging out:', error);
      showError('Erreur', 'Impossible de se déconnecter');
      announceForAccessibility('Erreur lors de la déconnexion');
    }
  }, [showSuccess, showError, announceForAccessibility, router]);

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
            <Text style={styles.headerTitle}>Paramètres</Text>
            <Text style={styles.headerSubtitle}>
              Personnalisez votre expérience
            </Text>
          </View>
          
          <View style={styles.headerIcon}>
            <SettingsIcon size={24} color={Colors.palette.accentGold} />
          </View>
        </View>

        <ScrollView 
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* User Info */}
          <View style={styles.userSection}>
            <View style={styles.userAvatar}>
              <Text style={styles.userAvatarText}>
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{user?.email || 'Utilisateur'}</Text>
              <Text style={styles.userStatus}>Compte actif</Text>
            </View>
          </View>

          {/* Settings List */}
          <View style={styles.settingsList}>
            {settings.map((setting) => {
              const IconComponent = setting.icon;
              return (
                <Pressable
                  key={setting.id}
                  style={styles.settingItem}
                  onPress={() => handleSettingPress(setting)}
                  accessibilityLabel={getAccessibleLabel(
                    setting.title,
                    setting.description
                  )}
                  accessibilityRole="button"
                  testID={`setting-${setting.id}`}
                >
                  <View style={styles.settingLeft}>
                    <View style={[styles.settingIcon, { backgroundColor: `${setting.color}20` }]}>
                      <IconComponent size={20} color={setting.color} />
                    </View>
                    <View style={styles.settingText}>
                      <Text style={styles.settingTitle}>{setting.title}</Text>
                      <Text style={styles.settingDescription}>{setting.description}</Text>
                    </View>
                  </View>
                  <View style={styles.settingArrow}>
                    <Text style={styles.arrowText}>›</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          {/* Logout Button */}
          <Pressable 
            style={styles.logoutButton}
            onPress={handleLogout}
            accessibilityLabel="Se déconnecter"
            accessibilityRole="button"
            testID="logout-button"
          >
            <View style={styles.logoutContent}>
              <LogOut size={20} color="#E74C3C" />
              <Text style={styles.logoutText}>Se déconnecter</Text>
            </View>
          </Pressable>

          {/* App Info */}
          <View style={styles.appInfo}>
            <Text style={styles.appInfoText}>Memoria v1.0.0</Text>
            <Text style={styles.appInfoText}>© 2024 Memoria App</Text>
          </View>
        </ScrollView>
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
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,215,0,0.1)',
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
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
    gap: 16,
  },
  userAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.palette.accentGold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: {
    color: '#000000',
    fontSize: 24,
    fontWeight: '800',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    color: Colors.palette.taupeDeep,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  userStatus: {
    color: Colors.palette.taupe,
    fontSize: 14,
  },
  settingsList: {
    gap: 12,
    marginBottom: 32,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    padding: 16,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 16,
  },
  settingIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    color: Colors.palette.taupeDeep,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  settingDescription: {
    color: Colors.palette.taupe,
    fontSize: 14,
  },
  settingArrow: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowText: {
    color: Colors.palette.taupe,
    fontSize: 18,
    fontWeight: '300',
  },
  logoutButton: {
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  logoutContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  logoutText: {
    color: '#E74C3C',
    fontSize: 16,
    fontWeight: '600',
  },
  appInfo: {
    alignItems: 'center',
    gap: 4,
  },
  appInfoText: {
    color: Colors.palette.taupe,
    fontSize: 12,
  },
});