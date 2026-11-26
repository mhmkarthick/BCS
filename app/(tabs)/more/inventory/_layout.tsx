import React from 'react';
import { Stack } from 'expo-router';

/** Inventory — list and ingredient detail. */
export default function InventoryLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="index" options={{ animation: 'none' }} />
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
