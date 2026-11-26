import React from 'react';
import { Stack } from 'expo-router';

/** Customers tab — list plus the customer detail screen. */
export default function CustomersLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="index" options={{ animation: 'none' }} />
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
