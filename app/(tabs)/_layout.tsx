import React from 'react';
import { Tabs } from 'expo-router';

/**
 * Tab navigator.
 *
 * The visual tab bar is a custom overlay rendered by the root layout, so the
 * navigator's own bar is disabled. Each tab keeps its own stack so the
 * reference's navigation depth is preserved.
 */
export default function TabsLayout() {
  return (
    <Tabs
      tabBar={() => null}
      screenOptions={{
        headerShown: false,
        animation: 'none',
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="orders" options={{ title: 'Orders' }} />
      <Tabs.Screen name="products" options={{ title: 'Products' }} />
      <Tabs.Screen name="customers" options={{ title: 'Customers' }} />
      <Tabs.Screen name="more" options={{ title: 'More' }} />
    </Tabs>
  );
}
