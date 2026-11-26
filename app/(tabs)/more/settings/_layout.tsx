import React from 'react';
import { Stack } from 'expo-router';

/** Settings — the hub plus one screen per settings section. */
export default function SettingsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="index" options={{ animation: 'none' }} />
      <Stack.Screen name="[section]" />
    </Stack>
  );
}
