import React, { Component, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { AlertTriangle, RefreshCw } from 'lucide-react-native';
import Colors from '@/constants/colors';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    console.error('ErrorBoundary caught an error:', error);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary details:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <View style={styles.content}>
            <AlertTriangle size={64} color={Colors.danger} />
            <Text style={styles.title}>Er is iets misgegaan</Text>
            <Text style={styles.message}>
              De app heeft een onverwachte fout ondervonden. Probeer de app opnieuw te starten.
            </Text>
            {__DEV__ && this.state.error && (
              <View style={styles.errorDetails}>
                <Text style={styles.errorText}>
                  {this.state.error.message}
                </Text>
                <Text style={styles.errorStack}>
                  {this.state.error.stack}
                </Text>
              </View>
            )}
            <TouchableOpacity style={styles.retryButton} onPress={this.handleReset}>
              <RefreshCw size={20} color={Colors.secondary} />
              <Text style={styles.retryText}>Probeer opnieuw</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    alignItems: 'center',
    maxWidth: 300,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: Colors.lightText,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  errorDetails: {
    backgroundColor: Colors.card,
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    width: '100%',
  },
  errorText: {
    fontSize: 14,
    color: Colors.danger,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  errorStack: {
    fontSize: 12,
    color: Colors.lightText,
    fontFamily: 'monospace',
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  retryText: {
    color: Colors.secondary,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});