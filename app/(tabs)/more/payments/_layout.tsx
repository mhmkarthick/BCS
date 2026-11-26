import React from 'react';
import { Stack } from 'expo-router';

/** Payments — overview and detail. */
export default function PaymentsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="index" options={{ animation: 'none' }} />
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
