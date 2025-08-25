import React from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { AlertTriangle, RefreshCw, WifiOff, X } from 'lucide-react-native';
import Colors from '@/constants/colors';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }>;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return (
        <FallbackComponent 
          error={this.state.error!} 
          resetError={this.resetError} 
        />
      );
    }

    return this.props.children;
  }
}

interface DefaultErrorFallbackProps {
  error: Error;
  resetError: () => void;
}

const DefaultErrorFallback: React.FC<DefaultErrorFallbackProps> = ({ error, resetError }) => {
  return (
    <View style={styles.errorContainer}>
      <View style={styles.errorContent}>
        <AlertTriangle size={48} color="#FF6B6B" />
        <Text style={styles.errorTitle}>Oups ! Une erreur s&apos;est produite</Text>
        <Text style={styles.errorMessage}>
          {error.message || 'Une erreur inattendue s\'est produite'}
        </Text>
        <Pressable style={styles.retryButton} onPress={resetError}>
          <RefreshCw size={20} color="#000000" />
          <Text style={styles.retryButtonText}>Réessayer</Text>
        </Pressable>
      </View>
    </View>
  );
};

interface NetworkErrorProps {
  onRetry: () => void;
  message?: string;
}

export const NetworkError: React.FC<NetworkErrorProps> = ({ 
  onRetry, 
  message = 'Problème de connexion réseau' 
}) => {
  return (
    <View style={styles.networkErrorContainer}>
      <WifiOff size={32} color="#FF6B6B" />
      <Text style={styles.networkErrorTitle}>Connexion perdue</Text>
      <Text style={styles.networkErrorMessage}>{message}</Text>
      <Pressable style={styles.retryButton} onPress={onRetry}>
        <RefreshCw size={16} color="#000000" />
        <Text style={styles.retryButtonText}>Réessayer</Text>
      </Pressable>
    </View>
  );
};

interface InlineErrorProps {
  message: string;
  onDismiss?: () => void;
  type?: 'error' | 'warning' | 'info';
}

export const InlineError: React.FC<InlineErrorProps> = ({ 
  message, 
  onDismiss, 
  type = 'error' 
}) => {
  const getColor = () => {
    switch (type) {
      case 'warning':
        return '#FFA500';
      case 'info':
        return Colors.palette.accentGold;
      default:
        return '#FF6B6B';
    }
  };

  return (
    <View style={[styles.inlineErrorContainer, { borderLeftColor: getColor() }]}>
      <View style={styles.inlineErrorContent}>
        <AlertTriangle size={16} color={getColor()} />
        <Text style={[styles.inlineErrorText, { color: getColor() }]}>{message}</Text>
      </View>
      {onDismiss && (
        <Pressable style={styles.dismissButton} onPress={onDismiss}>
          <X size={16} color={getColor()} />
        </Pressable>
      )}
    </View>
  );
};

interface ErrorHandlerProps {
  error: Error | null;
  onRetry?: () => void;
  onDismiss?: () => void;
  type?: 'inline' | 'modal' | 'toast';
}

export const ErrorHandler: React.FC<ErrorHandlerProps> = ({ 
  error, 
  onRetry, 
  onDismiss, 
  type = 'inline' 
}) => {
  if (!error) return null;

  const isNetworkError = error.message.toLowerCase().includes('network') || 
                        error.message.toLowerCase().includes('fetch') ||
                        error.message.toLowerCase().includes('connection');

  if (type === 'modal') {
    Alert.alert(
      'Erreur',
      error.message,
      [
        { text: 'OK', onPress: onDismiss },
        ...(onRetry ? [{ text: 'Réessayer', onPress: onRetry }] : []),
      ]
    );
    return null;
  }

  if (isNetworkError && onRetry) {
    return <NetworkError onRetry={onRetry} message={error.message} />;
  }

  return (
    <InlineError 
      message={error.message} 
      onDismiss={onDismiss}
      type={isNetworkError ? 'warning' : 'error'}
    />
  );
};

// Hook for handling async operations with error states
export const useAsyncOperation = () => {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  const execute = React.useCallback(async (
    operation: () => Promise<any>,
    onSuccess?: (result: any) => void,
    onError?: (error: Error) => void
  ) => {
    try {
      setLoading(true);
      setError(null);
      const result = await operation();
      onSuccess?.(result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Une erreur inconnue s&apos;est produite');
      setError(error);
      onError?.(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = React.useCallback(() => {
    setError(null);
    setLoading(false);
  }, []);

  return {
    loading,
    error,
    execute,
    reset,
  };
};

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorContent: {
    alignItems: 'center',
    gap: 16,
    maxWidth: 300,
  },
  errorTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  errorMessage: {
    color: Colors.palette.taupe,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.palette.accentGold,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  retryButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '700',
  },
  networkErrorContainer: {
    alignItems: 'center',
    gap: 12,
    padding: 20,
    backgroundColor: 'rgba(255,107,107,0.1)',
    borderRadius: 12,
    margin: 20,
  },
  networkErrorTitle: {
    color: '#FF6B6B',
    fontSize: 16,
    fontWeight: '700',
  },
  networkErrorMessage: {
    color: Colors.palette.taupe,
    fontSize: 14,
    textAlign: 'center',
  },
  inlineErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,107,107,0.1)',
    borderRadius: 8,
    borderLeftWidth: 4,
    padding: 12,
    margin: 8,
  },
  inlineErrorContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inlineErrorText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  dismissButton: {
    padding: 4,
    marginLeft: 8,
  },
});