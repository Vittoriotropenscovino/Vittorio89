import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

export default function App() {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>TravelSphere</Text>
          <Text style={styles.subtitle}>Diagnostic Mode</Text>
          <Text style={styles.status}>System is running...</Text>
          <Text style={styles.info}>If you see this, the core app engine is working.</Text>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 20,
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#60A5FA',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 24,
    color: '#FBBF24',
    fontWeight: '600',
  },
  status: {
    fontSize: 18,
    color: '#34D399',
    marginTop: 20,
  },
  info: {
    color: '#6B7280',
    marginTop: 10,
  }
});
