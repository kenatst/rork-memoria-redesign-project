import React, { useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, Text, ScrollView, Pressable, Platform, Modal, TextInput, KeyboardAvoidingView, Share } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Share2, Instagram, MessageCircle, Link2, Copy, Download, Heart, Eye, Send } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useToast } from '@/providers/ToastProvider';
import { useAccessibility } from '@/components/AccessibilityProvider';
import { useAI } from '@/providers/AIProvider';
import Colors from '@/constants/colors';
import ProgressToast from '@/components/ProgressToast';

interface SocialPlatform {
  id: string;
  name: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  color: string;
  description: string;
  formats: string[];
}

interface ShareTemplate {
  id: string;
  name: string;
  description: string;
  preview: string;
  style: 'story' | 'post' | 'reel' | 'tiktok';
}

export default function SocialShareScreen() {
  const router = useRouter();
  const { showError, showSuccess } = useToast();
  const { announceForAccessibility, getAccessibleLabel } = useAccessibility();
  const { applyStyleTransfer, isProcessing, progress } = useAI();

  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [showCustomMessage, setShowCustomMessage] = useState<boolean>(false);
  const [customMessage, setCustomMessage] = useState<string>('');
  const [isSharing, setIsSharing] = useState<boolean>(false);

  const platforms = useMemo<SocialPlatform[]>(() => [
    {
      id: 'instagram',
      name: 'Instagram',
      icon: Instagram,
      color: '#E4405F',
      description: 'Stories, posts et reels',
      formats: ['1:1', '9:16', '4:5']
    },
    {
      id: 'tiktok',
      name: 'TikTok',
      icon: MessageCircle,
      color: '#000000',
      description: 'Vidéos courtes verticales',
      formats: ['9:16']
    },
    {
      id: 'whatsapp',
      name: 'WhatsApp',
      icon: MessageCircle,
      color: '#25D366',
      description: 'Partage direct avec contacts',
      formats: ['libre']
    },
    {
      id: 'universal',
      name: 'Lien universel',
      icon: Link2,
      color: Colors.palette.accentGold,
      description: 'Partage via lien',
      formats: ['web']
    }
  ], []);

  const templates = useMemo<ShareTemplate[]>(() => [
    {
      id: 'minimal',
      name: 'Minimal',
      description: 'Design épuré avec focus sur la photo',
      preview: '🖼️ Photo + texte simple',
      style: 'post'
    },
    {
      id: 'story',
      name: 'Story dynamique',
      description: 'Animations et stickers pour stories',
      preview: '✨ Effets + musique',
      style: 'story'
    },
    {
      id: 'collage',
      name: 'Collage',
      description: 'Plusieurs photos en mosaïque',
      preview: '🎨 Multi-photos',
      style: 'post'
    },
    {
      id: 'vintage',
      name: 'Vintage',
      description: 'Filtres rétro et bordures',
      preview: '📸 Style rétro',
      style: 'post'
    }
  ], []);

  const handleBack = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.back();
  }, [router]);

  const handlePlatformToggle = useCallback((platformId: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    setSelectedPlatforms(prev => {
      const isSelected = prev.includes(platformId);
      const newSelection = isSelected 
        ? prev.filter(id => id !== platformId)
        : [...prev, platformId];
      
      const platform = platforms.find(p => p.id === platformId);
      announceForAccessibility(
        `${platform?.name} ${isSelected ? 'désélectionné' : 'sélectionné'}`
      );
      
      return newSelection;
    });
  }, [platforms, announceForAccessibility]);

  const handleTemplateSelect = useCallback((templateId: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedTemplate(templateId);
    
    const template = templates.find(t => t.id === templateId);
    announceForAccessibility(`Template ${template?.name} sélectionné`);
  }, [templates, announceForAccessibility]);

  const handleCopyLink = useCallback(async () => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    try {
      const shareUrl = 'https://app.memoryshare.com/album/beach2024?ref=social';
      
      if (Platform.OS === 'web') {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const Clipboard = await import('expo-clipboard');
        await Clipboard.setStringAsync(shareUrl);
      }
      
      showSuccess('Lien copié', 'Le lien a été copié dans le presse-papiers');
      announceForAccessibility('Lien universel copié dans le presse-papiers');
    } catch (error) {
      console.error('Failed to copy link:', error);
      showError('Erreur', 'Impossible de copier le lien');
    }
  }, [showSuccess, showError, announceForAccessibility]);

  const handleNativeShare = useCallback(async () => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    try {
      if (Platform.OS === 'web') {
        if (navigator.share) {
          await navigator.share({
            title: 'Mes souvenirs - MemoryShare',
            text: 'Découvrez mes photos de l\'album "Soirée Plage 2024"',
            url: 'https://app.memoryshare.com/album/beach2024'
          });
        } else {
          await handleCopyLink();
        }
      } else {
        await Share.share({
          message: 'Découvrez mes photos de l\'album "Soirée Plage 2024" sur MemoryShare',
          url: 'https://app.memoryshare.com/album/beach2024'
        });
      }
      
      showSuccess('Partage réussi', 'Contenu partagé avec succès');
      announceForAccessibility('Partage natif réussi');
    } catch (error) {
      console.error('Native share error:', error);
      await handleCopyLink();
    }
  }, [handleCopyLink, showSuccess, announceForAccessibility]);

  const handleShare = useCallback(async () => {
    if (selectedPlatforms.length === 0) {
      showError('Sélection requise', 'Veuillez sélectionner au moins une plateforme');
      return;
    }

    if (!selectedTemplate) {
      showError('Template requis', 'Veuillez choisir un style de partage');
      return;
    }

    setIsSharing(true);
    
    if (Platform.OS !== 'web') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    try {
      // Simulate sharing process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Apply style transfer if needed
      if (selectedTemplate === 'vintage') {
        await applyStyleTransfer('sample_photo.jpg', 'vintage');
      }

      const platformNames = selectedPlatforms
        .map(id => platforms.find(p => p.id === id)?.name)
        .filter(Boolean)
        .join(', ');

      showSuccess(
        'Partage réussi',
        `Votre contenu a été partagé sur ${platformNames}`
      );
      
      announceForAccessibility(`Partage réussi sur ${platformNames}`);
      
      // Close modal and reset
      setShowCustomMessage(false);
      setCustomMessage('');
      
    } catch (error) {
      console.error('Error sharing:', error);
      showError('Erreur de partage', 'Impossible de partager le contenu');
      announceForAccessibility('Erreur lors du partage');
    } finally {
      setIsSharing(false);
    }
  }, [selectedPlatforms, selectedTemplate, platforms, applyStyleTransfer, showError, showSuccess, announceForAccessibility]);

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
            <Text style={styles.headerTitle}>Partage Social</Text>
            <Text style={styles.headerSubtitle}>
              Partagez vos souvenirs avec style
            </Text>
          </View>
          
          <View style={styles.headerIcon}>
            <Share2 size={24} color={Colors.palette.accentGold} />
          </View>
        </View>

        <ScrollView 
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Platform Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Plateformes</Text>
            <Text style={styles.sectionDescription}>
              Sélectionnez où vous souhaitez partager
            </Text>
            
            <View style={styles.platformsGrid}>
              {platforms.map((platform) => {
                const IconComponent = platform.icon;
                const isSelected = selectedPlatforms.includes(platform.id);
                
                return (
                  <Pressable
                    key={platform.id}
                    style={[styles.platformCard, isSelected && styles.platformCardSelected]}
                    onPress={() => handlePlatformToggle(platform.id)}
                    accessibilityLabel={getAccessibleLabel(
                      platform.name,
                      isSelected ? 'Sélectionné' : 'Appuyez pour sélectionner'
                    )}
                    accessibilityRole="button"
                    testID={`platform-${platform.id}`}
                  >
                    <LinearGradient
                      colors={isSelected 
                        ? [`${platform.color}20`, `${platform.color}10`]
                        : ['rgba(255,255,255,0.04)', 'rgba(255,255,255,0.02)']
                      }
                      style={styles.platformCardGradient}
                    >
                      <View style={[styles.platformIcon, { backgroundColor: `${platform.color}20` }]}>
                        <IconComponent size={24} color={platform.color} />
                      </View>
                      <Text style={[styles.platformName, isSelected && { color: platform.color }]}>
                        {platform.name}
                      </Text>
                      <Text style={styles.platformDescription}>
                        {platform.description}
                      </Text>
                      <View style={styles.platformFormats}>
                        {platform.formats.map((format, index) => (
                          <Text key={index} style={styles.formatTag}>
                            {format}
                          </Text>
                        ))}
                      </View>
                    </LinearGradient>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Template Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Style de partage</Text>
            <Text style={styles.sectionDescription}>
              Choisissez un template pour votre contenu
            </Text>
            
            <View style={styles.templatesGrid}>
              {templates.map((template) => {
                const isSelected = selectedTemplate === template.id;
                
                return (
                  <Pressable
                    key={template.id}
                    style={[styles.templateCard, isSelected && styles.templateCardSelected]}
                    onPress={() => handleTemplateSelect(template.id)}
                    accessibilityLabel={getAccessibleLabel(
                      template.name,
                      isSelected ? 'Sélectionné' : 'Appuyez pour sélectionner'
                    )}
                    accessibilityRole="button"
                    testID={`template-${template.id}`}
                  >
                    <View style={styles.templatePreview}>
                      <Text style={styles.templatePreviewText}>{template.preview}</Text>
                    </View>
                    <Text style={[styles.templateName, isSelected && styles.templateNameSelected]}>
                      {template.name}
                    </Text>
                    <Text style={styles.templateDescription}>
                      {template.description}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Quick Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Actions rapides</Text>
            
            <View style={styles.quickActions}>
              <Pressable 
                style={styles.quickActionCard}
                onPress={handleCopyLink}
                accessibilityLabel="Copier le lien universel"
                accessibilityRole="button"
                testID="copy-link"
              >
                <View style={styles.quickActionIcon}>
                  <Copy size={20} color={Colors.palette.accentGold} />
                </View>
                <Text style={styles.quickActionText}>Copier le lien</Text>
              </Pressable>
              
              <Pressable 
                style={styles.quickActionCard}
                onPress={() => setShowCustomMessage(true)}
                accessibilityLabel="Ajouter un message personnalisé"
                accessibilityRole="button"
                testID="custom-message"
              >
                <View style={styles.quickActionIcon}>
                  <MessageCircle size={20} color={Colors.palette.accentGold} />
                </View>
                <Text style={styles.quickActionText}>Message perso</Text>
              </Pressable>
              
              <Pressable 
                style={styles.quickActionCard}
                onPress={handleNativeShare}
                accessibilityLabel="Partage natif"
                accessibilityRole="button"
                testID="native-share"
              >
                <View style={styles.quickActionIcon}>
                  <Download size={20} color={Colors.palette.accentGold} />
                </View>
                <Text style={styles.quickActionText}>Partage natif</Text>
              </Pressable>
            </View>
          </View>

          {/* Share Stats */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Statistiques de partage</Text>
            
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <View style={styles.statIcon}>
                  <Eye size={20} color="#3498DB" />
                </View>
                <Text style={styles.statValue}>1.2k</Text>
                <Text style={styles.statLabel}>Vues</Text>
              </View>
              
              <View style={styles.statCard}>
                <View style={styles.statIcon}>
                  <Heart size={20} color="#E91E63" />
                </View>
                <Text style={styles.statValue}>89</Text>
                <Text style={styles.statLabel}>J&apos;aime</Text>
              </View>
              
              <View style={styles.statCard}>
                <View style={styles.statIcon}>
                  <Share2 size={20} color="#2ECC71" />
                </View>
                <Text style={styles.statValue}>23</Text>
                <Text style={styles.statLabel}>Partages</Text>
              </View>
            </View>
          </View>

          {/* Share Button */}
          <Pressable 
            style={[styles.shareButton, (!selectedPlatforms.length || !selectedTemplate) && styles.shareButtonDisabled]}
            onPress={handleShare}
            disabled={!selectedPlatforms.length || !selectedTemplate || isSharing}
            accessibilityLabel={getAccessibleLabel(
              'Partager maintenant',
              selectedPlatforms.length && selectedTemplate 
                ? 'Appuyez pour partager votre contenu'
                : 'Sélectionnez une plateforme et un template pour continuer'
            )}
            accessibilityRole="button"
            testID="share-button"
          >
            <LinearGradient
              colors={selectedPlatforms.length && selectedTemplate 
                ? [Colors.palette.accentGold, '#E6B800']
                : ['rgba(255,215,0,0.3)', 'rgba(255,215,0,0.1)']
              }
              style={styles.shareButtonGradient}
            >
              <Send size={20} color={selectedPlatforms.length && selectedTemplate ? '#000000' : Colors.palette.taupe} />
              <Text style={[styles.shareButtonText, (!selectedPlatforms.length || !selectedTemplate) && styles.shareButtonTextDisabled]}>
                {isSharing ? 'Partage en cours...' : 'Partager maintenant'}
              </Text>
            </LinearGradient>
          </Pressable>
        </ScrollView>

        {/* Custom Message Modal */}
        <Modal 
          visible={showCustomMessage} 
          animationType="slide" 
          transparent 
          onRequestClose={() => setShowCustomMessage(false)}
        >
          <KeyboardAvoidingView 
            style={styles.modalBackdrop} 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Message personnalisé</Text>
              <TextInput
                style={styles.messageInput}
                placeholder="Ajoutez votre message..."
                placeholderTextColor={Colors.palette.taupe}
                value={customMessage}
                onChangeText={setCustomMessage}
                multiline
                numberOfLines={4}
                testID="custom-message-input"
              />
              <View style={styles.modalActions}>
                <Pressable 
                  style={styles.modalButton}
                  onPress={() => setShowCustomMessage(false)}
                  testID="cancel-message"
                >
                  <Text style={styles.modalButtonText}>Annuler</Text>
                </Pressable>
                <Pressable 
                  style={[styles.modalButton, styles.modalButtonPrimary]}
                  onPress={() => {
                    setShowCustomMessage(false);
                    showSuccess('Message ajouté', 'Votre message personnalisé a été ajouté');
                  }}
                  testID="save-message"
                >
                  <Text style={[styles.modalButtonText, styles.modalButtonTextPrimary]}>
                    Ajouter
                  </Text>
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </SafeAreaView>
      
      <ProgressToast 
        visible={isProcessing} 
        label="Application du style..." 
        progress={progress} 
      />
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
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    color: Colors.palette.taupeDeep,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  sectionDescription: {
    color: Colors.palette.taupe,
    fontSize: 14,
    marginBottom: 16,
  },
  platformsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  platformCard: {
    width: '48%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  platformCardSelected: {
    borderWidth: 2,
    borderColor: Colors.palette.accentGold,
  },
  platformCardGradient: {
    padding: 16,
  },
  platformIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  platformName: {
    color: Colors.palette.taupeDeep,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  platformDescription: {
    color: Colors.palette.taupe,
    fontSize: 12,
    marginBottom: 8,
  },
  platformFormats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  formatTag: {
    color: Colors.palette.taupe,
    fontSize: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  templatesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  templateCard: {
    width: '48%',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    padding: 16,
  },
  templateCardSelected: {
    borderWidth: 2,
    borderColor: Colors.palette.accentGold,
    backgroundColor: 'rgba(255,215,0,0.1)',
  },
  templatePreview: {
    height: 60,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  templatePreviewText: {
    color: Colors.palette.taupe,
    fontSize: 12,
  },
  templateName: {
    color: Colors.palette.taupeDeep,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  templateNameSelected: {
    color: Colors.palette.accentGold,
  },
  templateDescription: {
    color: Colors.palette.taupe,
    fontSize: 12,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
  },
  quickActionCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  quickActionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,215,0,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickActionText: {
    color: Colors.palette.taupeDeep,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  statLabel: {
    color: Colors.palette.taupe,
    fontSize: 12,
  },
  shareButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 16,
  },
  shareButtonDisabled: {
    opacity: 0.5,
  },
  shareButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 12,
  },
  shareButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '700',
  },
  shareButtonTextDisabled: {
    color: Colors.palette.taupe,
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
  messageInput: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    padding: 16,
    color: '#FFFFFF',
    fontSize: 16,
    textAlignVertical: 'top',
    minHeight: 100,
    marginBottom: 20,
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