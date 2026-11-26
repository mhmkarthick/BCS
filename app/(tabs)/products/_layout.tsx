import React from 'react';
import { Stack } from 'expo-router';

/** Products tab — list, detail and categories. */
export default function ProductsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="index" options={{ animation: 'none' }} />
      <Stack.Screen name="[id]" />
      <Stack.Screen name="categories" />
    </Stack>
  );
}
