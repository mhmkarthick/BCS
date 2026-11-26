import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  BellIcon,
  CakeSliceIcon,
  CalendarClockIcon,
  CheckIcon,
  ClipboardListIcon,
  CloudIcon,
  DatabaseBackupIcon,
  DownloadIcon,
  HardDriveIcon,
  IndianRupeeIcon,
  InfoIcon,
  SendIcon,
  StoreIcon,
} from 'lucide-react-native';
import { Avatar } from '../../../../src/components/ui/Avatar';
import { NavRow, RowGroup } from '../../../../src/components/ui/NavRow';
import { Screen } from '../../../../src/components/ui/Screen';
import { useDataStore } from '../../../../src/store/dataStore';
import { CURRENCY_OPTIONS } from '../../../../src/utils/money';
import { colors, fontFamily } from '../../../../src/theme';

/**
 * Settings hub.
 *
 * Groups the business profile, preferences, data management and the about
 * screen. Every change is written straight to SQLite on this device.
 */
export default function SettingsScreen() {
  const router = useRouter();
  const data = useDataStore((s) => s.data);
  const b = data.business;

  const open = (section: string) =>
    router.navigate(`/(tabs)/more/settings/${section}` as never);

  const currency = CURRENCY_OPTIONS.find((c) => c.code === b.currency);

  return (
    <Screen title="Settings" large>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open business profile"
        onPress={() => open('business')}
        style={({ pressed }) => [
          styles.profile,
          pressed && { backgroundColor: colors.sand },
        ]}
      >
        <Avatar name={b.name} size={52} />
        <View style={styles.profileBody}>
          <Text numberOfLines={1} style={styles.profileName}>
            {b.name}
          </Text>
          <Text numberOfLines={1} style={styles.profileMeta}>
            {b.owner} · {b.phone}
          </Text>
        </View>
      </Pressable>

      <RowGroup title="Business">
        <NavRow
          icon={StoreIcon}
          label="Business profile"
          onClick={() => open('business')}
        />
        <NavRow
          icon={IndianRupeeIcon}
          label="Currency"
          value={`${currency?.code} ${currency?.symbol}`}
          onClick={() => open('currency')}
        />
        <NavRow
          icon={CalendarClockIcon}
          label="Date & time"
          value={b.timeFormat === '12h' ? '12-hour' : '24-hour'}
          onClick={() => open('datetime')}
        />
      </RowGroup>

      <View style={styles.spacer}>
        <RowGroup title="Preferences">
          <NavRow
            icon={ClipboardListIcon}
            label="Orders"
            onClick={() => open('orders')}
          />
          <NavRow
            icon={CakeSliceIcon}
            label="Products"
            onClick={() => open('products')}
          />
          <NavRow
            icon={BellIcon}
            label="Notifications"
            value={b.notifications.dueReminders ? 'On' : 'Off'}
            onClick={() => open('notifications')}
          />
          <NavRow
            icon={SendIcon}
            label="WhatsApp Templates"
            value="Configure"
            onClick={() => open('whatsapp')}
          />
        </RowGroup>
      </View>

      <View style={styles.spacer}>
        <RowGroup title="Data">
          <NavRow
            icon={HardDriveIcon}
            label="Data management"
            onClick={() => open('data')}
          />
          <NavRow
            icon={DatabaseBackupIcon}
            label="Backup & Restore"
            onClick={() => router.navigate('/(tabs)/more/backup')}
          />
          <NavRow
            icon={CloudIcon}
            label="Google Drive Backup"
            value="Optional"
            onClick={() => router.navigate('/(tabs)/more/settings/driveBackup')}
          />
        </RowGroup>
      </View>

      <View style={styles.spacer}>
        <RowGroup title="Application Updates">
          <NavRow
            icon={DownloadIcon}
            label="Check for Updates"
            value={b.notifications.dueReminders ? 'On' : 'Off'}
            onClick={() => open('updates')}
          />
          <NavRow
            icon={InfoIcon}
            label="Installed Version"
            value="1.0.0"
          />
        </RowGroup>
      </View>

      <View style={styles.spacer}>
        <RowGroup title="About">
          <NavRow
            icon={InfoIcon}
            label="About this app"
            value="1.0"
            onClick={() => open('about')}
          />
        </RowGroup>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  profile: {
    marginHorizontal: 16,
    marginBottom: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    padding: 16,
  },
  profileBody: {
    flex: 1,
    minWidth: 0,
  },
  profileName: {
    fontFamily: fontFamily.serif,
    fontSize: 20,
    lineHeight: 24,
    color: colors.cocoa,
  },
  profileMeta: {
    fontFamily: fontFamily.sans,
    fontSize: 13,
    color: colors.mute,
  },
  spacer: {
    marginTop: 28,
  },
});
