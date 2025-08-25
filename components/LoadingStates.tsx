import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Loader2, Image as ImageIcon, Users, Camera } from 'lucide-react-native';
import Colors from '@/constants/colors';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: string;
  text?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'medium', 
  color = Colors.palette.accentGold,
  text 
}) => {
  const spinValue = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const spin = () => {
      spinValue.setValue(0);
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }).start(() => spin());
    };
    spin();
  }, [spinValue]);

  const rotate = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const sizeMap = {
    small: 16,
    medium: 24,
    large: 32,
  };

  return (
    <View style={styles.spinnerContainer}>
      <Animated.View style={{ transform: [{ rotate }] }}>
        <Loader2 size={sizeMap[size]} color={color} />
      </Animated.View>
      {text && <Text style={[styles.spinnerText, { color }]}>{text}</Text>}
    </View>
  );
};

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

export const Skeleton: React.FC<SkeletonProps> = ({ 
  width = '100%', 
  height = 20, 
  borderRadius = 8,
  style 
}) => {
  const opacity = React.useRef(new Animated.Value(0.3)).current;

  React.useEffect(() => {
    const pulse = () => {
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.8,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ]).start(() => pulse());
    };
    pulse();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: 'rgba(255,255,255,0.1)',
          opacity,
        },
        style,
      ]}
    />
  );
};

interface LoadingStateProps {
  type: 'photos' | 'albums' | 'groups' | 'upload' | 'sync';
  message?: string;
  progress?: number;
}

export const LoadingState: React.FC<LoadingStateProps> = ({ type, message, progress }) => {
  const getIcon = () => {
    switch (type) {
      case 'photos':
        return <ImageIcon size={32} color={Colors.palette.accentGold} />;
      case 'albums':
        return <ImageIcon size={32} color={Colors.palette.accentGold} />;
      case 'groups':
        return <Users size={32} color={Colors.palette.accentGold} />;
      case 'upload':
        return <Camera size={32} color={Colors.palette.accentGold} />;
      case 'sync':
        return <LoadingSpinner size="large" />;
      default:
        return <LoadingSpinner size="large" />;
    }
  };

  const getDefaultMessage = () => {
    switch (type) {
      case 'photos':
        return 'Chargement des photos...';
      case 'albums':
        return 'Chargement des albums...';
      case 'groups':
        return 'Chargement des groupes...';
      case 'upload':
        return 'Upload en cours...';
      case 'sync':
        return 'Synchronisation...';
      default:
        return 'Chargement...';
    }
  };

  return (
    <View style={styles.loadingContainer}>
      {getIcon()}
      <Text style={styles.loadingText}>{message || getDefaultMessage()}</Text>
      {progress !== undefined && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressText}>{Math.round(progress)}%</Text>
        </View>
      )}
    </View>
  );
};

interface EmptyStateProps {
  type: 'photos' | 'albums' | 'groups' | 'search';
  title?: string;
  message?: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ type, title, message, action }) => {
  const getIcon = () => {
    switch (type) {
      case 'photos':
        return <ImageIcon size={48} color={Colors.palette.taupe} />;
      case 'albums':
        return <ImageIcon size={48} color={Colors.palette.taupe} />;
      case 'groups':
        return <Users size={48} color={Colors.palette.taupe} />;
      case 'search':
        return <ImageIcon size={48} color={Colors.palette.taupe} />;
      default:
        return <ImageIcon size={48} color={Colors.palette.taupe} />;
    }
  };

  const getDefaultTitle = () => {
    switch (type) {
      case 'photos':
        return 'Aucune photo';
      case 'albums':
        return 'Aucun album';
      case 'groups':
        return 'Aucun groupe';
      case 'search':
        return 'Aucun résultat';
      default:
        return 'Aucun élément';
    }
  };

  const getDefaultMessage = () => {
    switch (type) {
      case 'photos':
        return 'Commencez par prendre des photos ou en importer.';
      case 'albums':
        return 'Créez votre premier album pour organiser vos souvenirs.';
      case 'groups':
        return 'Rejoignez ou créez un groupe pour partager avec vos proches.';
      case 'search':
        return 'Essayez avec d\'autres mots-clés.';
      default:
        return 'Il n\'y a rien à afficher pour le moment.';
    }
  };

  return (
    <View style={styles.emptyContainer}>
      {getIcon()}
      <Text style={styles.emptyTitle}>{title || getDefaultTitle()}</Text>
      <Text style={styles.emptyMessage}>{message || getDefaultMessage()}</Text>
      {action && <View style={styles.emptyAction}>{action}</View>}
    </View>
  );
};

const styles = StyleSheet.create({
  spinnerContainer: {
    alignItems: 'center',
    gap: 8,
  },
  spinnerText: {
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    gap: 16,
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  progressContainer: {
    width: '100%',
    maxWidth: 200,
    gap: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.palette.accentGold,
    borderRadius: 2,
  },
  progressText: {
    color: Colors.palette.taupe,
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    gap: 16,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyMessage: {
    color: Colors.palette.taupe,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  emptyAction: {
    marginTop: 8,
  },
});