import React, { Component, ReactNode } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Platform } from 'react-native';
import { AlertTriangle, RefreshCw, Bug, Copy } from 'lucide-react-native';
import Colors from '@/constants/colors';
import * as Clipboard from 'expo-clipboard';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: any) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: any;
  showDetails: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, showDetails: false };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined, showDetails: false });
  };

  handleCopyError = async () => {
    if (Platform.OS !== 'web') {
      const errorText = `Error: ${this.state.error?.message}\n\nStack: ${this.state.error?.stack}\n\nComponent Stack: ${this.state.errorInfo?.componentStack}`;
      await Clipboard.setStringAsync(errorText);
    }
  };

  toggleDetails = () => {
    this.setState(prev => ({ showDetails: !prev.showDetails }));
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View style={styles.container} testID="error-boundary">
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.content}>
              <AlertTriangle size={48} color={Colors.palette.accentGold} />
              <Text style={styles.title}>Oops! Une erreur s&apos;est produite</Text>
              <Text style={styles.message}>
                {this.state.error?.message || 'Une erreur inattendue s&apos;est produite'}
              </Text>
              
              <View style={styles.actions}>
                <Pressable style={styles.retryButton} onPress={this.handleRetry}>
                  <RefreshCw size={20} color="#000000" />
                  <Text style={styles.retryText}>Réessayer</Text>
                </Pressable>
                
                <Pressable style={styles.detailsButton} onPress={this.toggleDetails}>
                  <Bug size={16} color={Colors.palette.taupe} />
                  <Text style={styles.detailsText}>
                    {this.state.showDetails ? 'Masquer' : 'Détails'}
                  </Text>
                </Pressable>
              </View>

              {this.state.showDetails && (
                <View style={styles.errorDetails}>
                  <View style={styles.errorHeader}>
                    <Text style={styles.errorTitle}>Détails de l&apos;erreur</Text>
                    {Platform.OS !== 'web' && (
                      <Pressable style={styles.copyButton} onPress={this.handleCopyError}>
                        <Copy size={16} color={Colors.palette.taupe} />
                      </Pressable>
                    )}
                  </View>
                  
                  <ScrollView style={styles.errorScroll} nestedScrollEnabled>
                    <Text style={styles.errorText}>
                      <Text style={styles.errorLabel}>Message: </Text>
                      {this.state.error?.message}
                    </Text>
                    
                    {this.state.error?.stack && (
                      <Text style={styles.errorText}>
                        <Text style={styles.errorLabel}>Stack: </Text>
                        {this.state.error.stack}
                      </Text>
                    )}
                    
                    {this.state.errorInfo?.componentStack && (
                      <Text style={styles.errorText}>
                        <Text style={styles.errorLabel}>Component Stack: </Text>
                        {this.state.errorInfo.componentStack}
                      </Text>
                    )}
                  </ScrollView>
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      );
    }

    return this.props.children as React.ReactElement;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    alignItems: 'center',
    gap: 16,
    maxWidth: 350,
    width: '100%',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  message: {
    color: '#A9AFBC',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.palette.accentGold,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '700',
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  detailsText: {
    color: Colors.palette.taupe,
    fontSize: 14,
    fontWeight: '600',
  },
  errorDetails: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  errorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  errorTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  copyButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  errorScroll: {
    maxHeight: 200,
  },
  errorText: {
    color: '#A9AFBC',
    fontSize: 12,
    fontFamily: Platform.select({ ios: 'Courier', android: 'monospace', default: 'monospace' }),
    marginBottom: 8,
    lineHeight: 16,
  },
  errorLabel: {
    color: Colors.palette.accentGold,
    fontWeight: '600',
  },
});

export default ErrorBoundary;