import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';

import { db } from '@/src/database';
import migrations from '@/drizzle/migrations';
import { seedDatabase } from '@/src/database/seed';
import { ThemeProvider } from '@/styles/themeContext';
import '@/i18n/config';

// ─── États possibles de l'initialisation ──────────────────────────────────────
type AppState = 'loading' | 'ready' | 'error';

// ─── Écran de chargement ──────────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <View style={styles.centered}>
      <ActivityIndicator size="large" />
      <Text style={styles.loadingText}>Initialisation...</Text>
    </View>
  );
}

// ─── Écran d'erreur ───────────────────────────────────────────────────────────
function ErrorScreen({ message }: { message: string }) {
  return (
    <View style={styles.centered}>
      <Text style={styles.errorText}>Une erreur est survenue</Text>
      <Text style={styles.errorDetail}>{message}</Text>
    </View>
  );
}

// ─── Layout racine ────────────────────────────────────────────────────────────
export default function RootLayout() {
  const { success: migrationsSuccess, error: migrationError } = useMigrations(db, migrations);
  const [appState, setAppState] = useState<AppState>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!migrationsSuccess) return;

    seedDatabase()
      .then(() => setAppState('ready'))
      .catch((e: Error) => {
        console.error('[Seed] Échec :', e.message);
        setErrorMessage(e.message);
        setAppState('error');
      });
  }, [migrationsSuccess]);

  useEffect(() => {
    if (!migrationError) return;
    console.error('[Migration] Échec :', migrationError.message);
    setErrorMessage(migrationError.message);
    setAppState('error');
  }, [migrationError]);

  if (appState === 'error') return <ErrorScreen message={errorMessage} />;
  if (appState === 'loading') return <LoadingScreen />;

  return (
    <ThemeProvider>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </ThemeProvider>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
  },
  errorText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#EF4444',
  },
  errorDetail: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});
