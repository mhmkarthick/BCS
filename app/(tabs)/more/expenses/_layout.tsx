import React from 'react';
import { Stack } from 'expo-router';

/** Expenses — list and detail. */
export default function ExpensesLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="index" options={{ animation: 'none' }} />
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
