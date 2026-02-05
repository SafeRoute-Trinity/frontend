import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Routes } from '../constants/routes';
import { colors } from '../constants/theme';
import { Auth0Provider, useAuth0 } from '../contexts/Auth0Context';

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

const RootLayoutNav = () => {
  const { isAuthenticated, isLoading } = useAuth0();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inTabsGroup = segments[0] === '(tabs)';

    if (isAuthenticated && !inTabsGroup) {
      // Authenticated user trying to access auth screens or root, redirect to tabs
      router.replace(Routes.TABS);
    } else if (!isAuthenticated && inTabsGroup) {
      // Unauthenticated user trying to access protected tabs, redirect to login
      router.replace(Routes.LOGIN);
    }
  }, [isAuthenticated, isLoading, segments, router]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="health" />
    </Stack>
  );
};

const RootLayout = () => (
  <Auth0Provider>
    <RootLayoutNav />
  </Auth0Provider>
);

export default RootLayout;
