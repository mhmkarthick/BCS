import React, { useEffect, useState, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { colors, fontFamily, fontSize } from '../src/theme';
import { useDataStore } from '../src/store/dataStore';
import { useDriveStore } from '../src/store/driveStore';
import { TabBar } from '../src/components/navigation/TabBar';
import { ToastView } from '../src/components/ui/Toast';
import { ConfirmDialog } from '../src/components/ui/ConfirmDialog';
import { SuccessOverlay } from '../src/components/ui/SuccessOverlay';
import { UpdateCheckDialog } from '../src/components/ui/UpdateCheckDialog';
import { checkForUpdateIfDue } from '../src/services/updates';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

/**
 * Root layout.
 *
 * Owns the global providers, the database bootstrap, the font loading gate
 * and the three app-wide overlays (tab bar, toast, confirm dialog, success
 * celebration).
 */
export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_300Light: require('../assets/fonts/Inter-Light.ttf'),
    Inter_400Regular: require('../assets/fonts/Inter-Regular.ttf'),
    Inter_500Medium: require('../assets/fonts/Inter-Medium.ttf'),
    Inter_600SemiBold: require('../assets/fonts/Inter-SemiBold.ttf'),
    Inter_700Bold: require('../assets/fonts/Inter-Bold.ttf'),
    Newsreader_400Regular: require('../assets/fonts/Newsreader-Regular.ttf'),
    Newsreader_500Medium: require('../assets/fonts/Newsreader-Medium.ttf'),
    Newsreader_400Regular_Italic: require('../assets/fonts/Newsreader-Italic.ttf'),
  });

  const hydrate = useDataStore((s) => s.hydrate);
  const error = useDataStore((s) => s.error);
  const onboarded = useDataStore((s) => s.data.business.onboarded);
  const [booted, setBooted] = useState(false);
  const [ready, setReady] = useState(false);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [availableRelease, setAvailableRelease] = useState<{
    version: string;
    releaseNotes: string;
    publishedAt: string;
    apkUrl: string;
  } | null>(null);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await hydrate();
      } finally {
        if (!cancelled) setBooted(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrate]);

  useEffect(() => {
    if ((fontsLoaded || fontError) && booted) {
      setReady(true);
    }
  }, [fontsLoaded, fontError, booted]);

  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [ready]);

  useEffect(() => {
    if (!ready) return;

    const inOnboarding = segments[0] === 'onboarding';

    if (!onboarded && !inOnboarding) {
      router.replace('/onboarding');
    } else if (onboarded && inOnboarding) {
      router.replace('/(tabs)');
    }
  }, [ready, onboarded, segments, router]);

  // --- Native APK update check on launch (respects 12h cooldown) ---
  const updateCheckRef = useRef(false);

  useEffect(() => {
    if (!ready || updateCheckRef.current) return;

    (async () => {
      if (Platform.OS !== 'android') return;
      try {
        const release = await checkForUpdateIfDue();
        if (release) {
          setAvailableRelease(release);
          setUpdateDialogOpen(true);
        }
      } catch {
        // Silent failure — app continues working normally offline.
      }
    })();

    updateCheckRef.current = true;
  }, [ready]);

  // --- Drive backup restore check on launch / resume ---
  const checkRef = useRef(false);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        // App came to foreground — check for backups if Drive is connected
        void useDriveStore.getState().checkForBackups();
      }
    });

    // Check once on launch after ready
    if (ready && !checkRef.current) {
      checkRef.current = true;
      void useDriveStore.getState().checkForBackups();
    }

    return () => {
      subscription.remove();
    };
  }, [ready]);

  if (!fontsLoaded && !fontError) {
    return <BootScreen />;
  }

  if (!booted) {
    return <BootScreen />;
  }

  if (!ready) {
    return <BootScreen />;
  }

  if (error) {
    return <DatabaseErrorScreen message={error} onRetry={hydrate} />;
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <View style={styles.root}>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.ivory },
              animation: 'slide_from_right',
            }}
          >
            <Stack.Screen name="onboarding" options={{ animation: 'slide_from_bottom' }} />
          </Stack>
          <TabBar />
          <ToastView />
          <ConfirmDialog />
          <SuccessOverlay />
          <UpdateCheckDialog
            open={updateDialogOpen}
            onClose={() => setUpdateDialogOpen(false)}
            release={availableRelease ?? { version: '', releaseNotes: '', publishedAt: '', apkUrl: '' }}
          />
        </View>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function BootScreen() {
  return (
    <View style={styles.boot}>
      <ActivityIndicator color={colors.cocoa} />
      <Text style={styles.bootText}>Preparing your bakery…</Text>
    </View>
  );
}

function DatabaseErrorScreen({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <View style={styles.boot}>
      <Text style={styles.errorTitle}>Local database unavailable</Text>
      <Text style={styles.errorBody}>{message}</Text>
      <Text style={styles.errorHint}>
        Your data has not been deleted. Restart the app, or restore from a
        backup file in More → Backup.
      </Text>
      <Text
        accessibilityRole="button"
        style={styles.retry}
        onPress={() => {
          void onRetry();
        }}
      >
        Try again
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.ivory,
  },
  boot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingHorizontal: 32,
    backgroundColor: colors.ivory,
  },
  bootText: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize.md,
    color: colors.mute,
  },
  errorTitle: {
    fontFamily: fontFamily.serif,
    fontSize: fontSize['2xl+'],
    color: colors.cocoa,
    textAlign: 'center',
  },
  errorBody: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize.md,
    color: colors.mute,
    textAlign: 'center',
  },
  errorHint: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize['sm+'],
    color: colors.mute,
    textAlign: 'center',
  },
  retry: {
    marginTop: 8,
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize['md++'],
    color: colors.cocoa,
    textDecorationLine: 'underline',
  },
});
