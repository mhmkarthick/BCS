import React from 'react';
import { Stack } from 'expo-router';

/** Orders tab — list plus the order detail screen. */
export default function OrdersLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="index" options={{ animation: 'none' }} />
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
