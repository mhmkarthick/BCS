import React from 'react';
import { Stack } from 'expo-router';

/**
 * More tab — the hub for expenses, payments, reports, calendar, inventory,
 * backup and settings.
 */
export default function MoreLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="index" options={{ animation: 'none' }} />
      <Stack.Screen name="expenses" />
      <Stack.Screen name="payments" />
      <Stack.Screen name="inventory" />
      <Stack.Screen name="reports" />
      <Stack.Screen name="calendar" />
      <Stack.Screen name="backup" />
      <Stack.Screen name="settings" />
    </Stack>
  );
}
