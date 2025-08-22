import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Text, ScrollView, Pressable, Dimensions, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, BarChart3, Clock, Heart, Camera, Eye, MessageSquare, Share2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAI } from '@/providers/AIProvider';
import { useToast } from '@/providers/ToastProvider';
import { useAccessibility } from '@/components/AccessibilityProvider';
import Colors from '@/constants/colors';
import ProgressToast from '@/components/ProgressToast';

const { width: screenWidth } = Dimensions.get('window');

interface StatCard {
  id: string;
  title: string;
  value: string;
  subtitle: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  color: string;
  trend?: {
    direction: 'up' | 'down' | 'stable';
    percentage: number;
  };
}

interface ActivityData {
  day: string;
  value: number;
}

export default function AnalyticsScreen() {
  const router = useRouter();
  const { getUsageStats, generateActivityReport, isAnalyzing, progress } = useAI();
  const { showError, showSuccess } = useToast();
  const { announceForAccessibility, getAccessibleLabel } = useAccessibility();

  const [selectedPeriod, setSelectedPeriod] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [stats, setStats] = useState<StatCard[]>([]);
  const [activityData, setActivityData] = useState<ActivityData[]>([]);
  const [report, setReport] = useState<any>(null);
  const [, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    loadAnalytics();
  }, [selectedPeriod]);

  const loadAnalytics = useCallback(async () => {
    setIsLoading(true);
    try {
      // Load usage stats
      const usageStats = await getUsageStats();
      
      // Generate activity report
      const activityReport = await generateActivityReport(selectedPeriod);
      setReport(activityReport);

      // Create stat cards
      const statCards: StatCard[] = [
        {
          id: 'time_spent',
          title: 'Temps passé',
          value: `${Math.floor(usageStats.timeSpent / 60)}h ${usageStats.timeSpent % 60}m`,
          subtitle: 'Cette semaine',
          icon: Clock,
          color: '#3498DB',
          trend: { direction: 'up', percentage: 12 }
        },
        {
          id: 'photos_viewed',
          title: 'Photos vues',
          value: usageStats.photosViewed.toString(),
          subtitle: 'Total',
          icon: Eye,
          color: '#2ECC71',
          trend: { direction: 'up', percentage: 8 }
        },
        {
          id: 'albums_created',
          title: 'Albums créés',
          value: usageStats.albumsCreated.toString(),
          subtitle: 'Ce mois',
          icon: Camera,
          color: '#E67E22',
          trend: { direction: 'up', percentage: 25 }
        },
        {
          id: 'favorites',
          title: 'Photos favorites',
          value: usageStats.favoritePhotos.length.toString(),
          subtitle: 'Collection',
          icon: Heart,
          color: '#E91E63',
          trend: { direction: 'stable', percentage: 0 }
        },
        {
          id: 'social_interactions',
          title: 'Interactions',
          value: '47',
          subtitle: 'Cette semaine',
          icon: MessageSquare,
          color: '#9B59B6',
          trend: { direction: 'up', percentage: 15 }
        },
        {
          id: 'shares',
          title: 'Partages',
          value: '23',
          subtitle: 'Ce mois',
          icon: Share2,
          color: '#F39C12',
          trend: { direction: 'down', percentage: 5 }
        }
      ];
      
      setStats(statCards);

      // Generate activity chart data
      const chartData: ActivityData[] = Object.entries(usageStats.weeklyActivity).map(([day, value]) => ({
        day: day.substring(0, 3),
        value: value as number
      }));
      setActivityData(chartData);

      showSuccess('Analytics chargées', 'Vos statistiques ont été mises à jour');
      announceForAccessibility('Statistiques d&apos;usage chargées avec succès');
    } catch (error) {
      console.error('Error loading analytics:', error);
      showError('Erreur de chargement', 'Impossible de charger les statistiques');
      announceForAccessibility('Erreur lors du chargement des statistiques');
    } finally {
      setIsLoading(false);
    }
  }, [selectedPeriod, getUsageStats, generateActivityReport, showError, showSuccess, announceForAccessibility]);

  const handleBack = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.back();
  }, [router]);

  const handlePeriodChange = useCallback((period: 'daily' | 'weekly' | 'monthly') => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedPeriod(period);
    announceForAccessibility(`Période changée vers ${period === 'daily' ? 'quotidien' : period === 'weekly' ? 'hebdomadaire' : 'mensuel'}`);
  }, [announceForAccessibility]);

  const getTrendIcon = (direction: 'up' | 'down' | 'stable') => {
    switch (direction) {
      case 'up': return '↗️';
      case 'down': return '↘️';
      case 'stable': return '→';
    }
  };

  const getTrendColor = (direction: 'up' | 'down' | 'stable') => {
    switch (direction) {
      case 'up': return '#2ECC71';
      case 'down': return '#E74C3C';
      case 'stable': return Colors.palette.taupe;
    }
  };

  const maxValue = Math.max(...activityData.map(d => d.value));

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
            <Text style={styles.headerTitle}>Analytics & Insights</Text>
            <Text style={styles.headerSubtitle}>
              Découvrez vos habitudes photo
            </Text>
          </View>
          
          <View style={styles.headerIcon}>
            <BarChart3 size={24} color={Colors.palette.accentGold} />
          </View>
        </View>

        <ScrollView 
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Period Selector */}
          <View style={styles.periodSelector}>
            {(['daily', 'weekly', 'monthly'] as const).map((period) => (
              <Pressable
                key={period}
                style={[styles.periodButton, selectedPeriod === period && styles.periodButtonActive]}
                onPress={() => handlePeriodChange(period)}
                accessibilityLabel={getAccessibleLabel(
                  `Période ${period === 'daily' ? 'quotidienne' : period === 'weekly' ? 'hebdomadaire' : 'mensuelle'}`,
                  selectedPeriod === period ? 'Sélectionné' : 'Appuyez pour sélectionner'
                )}
                accessibilityRole="button"
                testID={`period-${period}`}
              >
                <Text style={[styles.periodButtonText, selectedPeriod === period && styles.periodButtonTextActive]}>
                  {period === 'daily' ? 'Jour' : period === 'weekly' ? 'Semaine' : 'Mois'}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            {stats.map((stat, index) => {
              const IconComponent = stat.icon;
              return (
                <View key={stat.id} style={[styles.statCard, index % 2 === 1 && styles.statCardRight]}>
                  <LinearGradient
                    colors={[`${stat.color}15`, `${stat.color}05`]}
                    style={styles.statCardGradient}
                  >
                    <View style={styles.statCardHeader}>
                      <View style={[styles.statCardIcon, { backgroundColor: `${stat.color}20` }]}>
                        <IconComponent size={20} color={stat.color} />
                      </View>
                      {stat.trend && (
                        <View style={styles.trendContainer}>
                          <Text style={[styles.trendText, { color: getTrendColor(stat.trend.direction) }]}>
                            {getTrendIcon(stat.trend.direction)} {stat.trend.percentage}%
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.statValue}>{stat.value}</Text>
                    <Text style={styles.statTitle}>{stat.title}</Text>
                    <Text style={styles.statSubtitle}>{stat.subtitle}</Text>
                  </LinearGradient>
                </View>
              );
            })}
          </View>

          {/* Activity Chart */}
          <View style={styles.chartSection}>
            <Text style={styles.sectionTitle}>Activité hebdomadaire</Text>
            <View style={styles.chartContainer}>
              <View style={styles.chart}>
                {activityData.map((data, index) => {
                  const height = maxValue > 0 ? (data.value / maxValue) * 120 : 0;
                  return (
                    <View key={data.day} style={styles.chartBar}>
                      <View 
                        style={[styles.chartBarFill, { height, backgroundColor: Colors.palette.accentGold }]}
                        accessibilityLabel={`${data.day}: ${data.value} minutes`}
                      />
                      <Text style={styles.chartBarLabel}>{data.day}</Text>
                    </View>
                  );
                })}
              </View>
              <View style={styles.chartLegend}>
                <Text style={styles.chartLegendText}>Minutes d&apos;activité par jour</Text>
              </View>
            </View>
          </View>

          {/* Activity Report */}
          {report && (
            <View style={styles.reportSection}>
              <Text style={styles.sectionTitle}>Rapport d&apos;activité</Text>
              <View style={styles.reportCard}>
                <Text style={styles.reportSummary}>{report.summary}</Text>
                
                <View style={styles.highlightsSection}>
                  <Text style={styles.highlightsTitle}>Points forts</Text>
                  {report.highlights.map((highlight: string, index: number) => (
                    <Text key={index} style={styles.highlightItem}>{highlight}</Text>
                  ))}
                </View>

                <View style={styles.recommendationsSection}>
                  <Text style={styles.recommendationsTitle}>Recommandations</Text>
                  {report.recommendations.map((recommendation: string, index: number) => (
                    <Text key={index} style={styles.recommendationItem}>• {recommendation}</Text>
                  ))}
                </View>
              </View>
            </View>
          )}

          {/* Most Active Hours */}
          <View style={styles.hoursSection}>
            <Text style={styles.sectionTitle}>Heures les plus actives</Text>
            <View style={styles.hoursContainer}>
              {[14, 19, 21].map((hour) => (
                <View key={hour} style={styles.hourCard}>
                  <Text style={styles.hourTime}>{hour}:00</Text>
                  <Text style={styles.hourLabel}>Pic d&apos;activité</Text>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
      
      <ProgressToast 
        visible={isAnalyzing} 
        label="Analyse en cours..." 
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
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    padding: 4,
    marginBottom: 24,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: Colors.palette.accentGold,
  },
  periodButtonText: {
    color: Colors.palette.taupe,
    fontSize: 14,
    fontWeight: '600',
  },
  periodButtonTextActive: {
    color: '#000000',
    fontWeight: '700',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 32,
  },
  statCard: {
    width: (screenWidth - 56) / 2,
    borderRadius: 16,
    overflow: 'hidden',
  },
  statCardRight: {
    marginLeft: 0,
  },
  statCardGradient: {
    padding: 16,
  },
  statCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statCardIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendContainer: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  trendText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
  },
  statTitle: {
    color: Colors.palette.taupeDeep,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  statSubtitle: {
    color: Colors.palette.taupe,
    fontSize: 12,
  },
  chartSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    color: Colors.palette.taupeDeep,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  chartContainer: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    padding: 20,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 140,
    marginBottom: 16,
  },
  chartBar: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 2,
  },
  chartBarFill: {
    width: '80%',
    borderRadius: 4,
    marginBottom: 8,
  },
  chartBarLabel: {
    color: Colors.palette.taupe,
    fontSize: 12,
    fontWeight: '600',
  },
  chartLegend: {
    alignItems: 'center',
  },
  chartLegendText: {
    color: Colors.palette.taupe,
    fontSize: 14,
  },
  reportSection: {
    marginBottom: 32,
  },
  reportCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    padding: 20,
  },
  reportSummary: {
    color: Colors.palette.taupeDeep,
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 20,
  },
  highlightsSection: {
    marginBottom: 20,
  },
  highlightsTitle: {
    color: Colors.palette.taupeDeep,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  highlightItem: {
    color: Colors.palette.taupe,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 6,
  },
  recommendationsSection: {},
  recommendationsTitle: {
    color: Colors.palette.taupeDeep,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  recommendationItem: {
    color: Colors.palette.taupe,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 6,
  },
  hoursSection: {
    marginBottom: 32,
  },
  hoursContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  hourCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  hourTime: {
    color: Colors.palette.accentGold,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  hourLabel: {
    color: Colors.palette.taupe,
    fontSize: 12,
    textAlign: 'center',
  },
});