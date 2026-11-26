import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { formatDistanceToNowStrict, startOfMonth } from 'date-fns';
import {
  BoxesIcon,
  CalendarDaysIcon,
  ChartColumnIcon,
  DatabaseBackupIcon,
  PlaneIcon,
  ReceiptIcon,
  SettingsIcon,
  WalletIcon,
} from 'lucide-react-native';
import { NavRow, RowGroup } from '../../../src/components/ui/NavRow';
import { Screen } from '../../../src/components/ui/Screen';
import { useDataStore } from '../../../src/store/dataStore';
import { totalOutstanding } from '../../../src/utils/calc';
import { inr, inrShort } from '../../../src/utils/money';
import { shiftISO, todayISO, toISODate } from '../../../src/utils/format';
import { spent } from '../../../src/utils/reports';
import { colors, fontFamily, radius } from '../../../src/theme';

/**
 * More hub.
 *
 * Three grouped lists — Money, Planning and Your data — plus the offline
 * reassurance note and the version footer.
 */
export default function MoreScreen() {
  const router = useRouter();
  const data = useDataStore((s) => s.data);

  const v = useMemo(() => {
    const today = todayISO();
    const lastBackup = [...data.backups]
      .sort((a, b) => b.date.localeCompare(a.date))
      .find((b) => b.kind === 'Full backup');
    return {
      monthSpend: spent(data, toISODate(startOfMonth(new Date())), today),
      outstanding: totalOutstanding(data),
      week: data.orders.filter(
        (o) =>
          o.dueDate >= today &&
          o.dueDate <= shiftISO(6) &&
          o.status !== 'cancelled' &&
          o.status !== 'delivered',
      ).length,
      low: data.ingredients.filter((i) => i.stock <= i.minStock).length,
      lastBackup: lastBackup
        ? `${formatDistanceToNowStrict(new Date(lastBackup.date))} ago`
        : 'Never',
    };
  }, [data]);

  return (
    <Screen title="More" large>
      <RowGroup title="Money">
        <NavRow
          icon={ReceiptIcon}
          label="Expenses"
          value={`${inrShort(v.monthSpend)} this month`}
          onClick={() => router.navigate('/(tabs)/more/expenses')}
        />
        <NavRow
          icon={WalletIcon}
          label="Payments"
          value={v.outstanding > 0 ? `${inr(v.outstanding)} due` : 'All settled'}
          onClick={() => router.navigate('/(tabs)/more/payments')}
        />
        <NavRow
          icon={ChartColumnIcon}
          label="Reports"
          onClick={() => router.navigate('/(tabs)/more/reports')}
        />
      </RowGroup>

      <View style={styles.groupSpacer}>
        <RowGroup title="Planning">
          <NavRow
            icon={CalendarDaysIcon}
            label="Calendar"
            value={v.week ? `${v.week} this week` : undefined}
            onClick={() => router.navigate('/(tabs)/more/calendar')}
          />
          <NavRow
            icon={BoxesIcon}
            label="Inventory"
            value={
              data.ingredients.length
                ? v.low
                  ? `${v.low} running low`
                  : 'Well stocked'
                : undefined
            }
            onClick={() => router.navigate('/(tabs)/more/inventory')}
          />
        </RowGroup>
      </View>

      <View style={styles.groupSpacer}>
        <RowGroup title="Your data">
          <NavRow
            icon={DatabaseBackupIcon}
            label="Backup & Restore"
            value={v.lastBackup}
            onClick={() => router.navigate('/(tabs)/more/backup')}
          />
          <NavRow
            icon={SettingsIcon}
            label="Settings"
            onClick={() => router.navigate('/(tabs)/more/settings')}
          />
        </RowGroup>
      </View>

      <View style={styles.offlineCard}>
        <View style={styles.offlineIcon}>
          <PlaneIcon size={18} color={colors.cocoa} strokeWidth={1.75} />
        </View>
        <View style={styles.offlineBody}>
          <Text style={styles.offlineTitle}>Works completely offline</Text>
          <Text style={styles.offlineText}>
            Orders, customers and money are stored only on this phone. Nothing
            is uploaded — export a backup whenever you like.
          </Text>
        </View>
      </View>

      <Text style={styles.version}>Bright Cakes & Snacks · version 1.0</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  groupSpacer: {
    marginTop: 28,
  },
  offlineCard: {
    marginHorizontal: 16,
    marginTop: 32,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    borderRadius: radius['2xl'],
    backgroundColor: colors.sand,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  offlineIcon: {
    height: 36,
    width: 36,
    borderRadius: radius.xl,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  offlineBody: {
    flex: 1,
    minWidth: 0,
  },
  offlineTitle: {
    fontFamily: fontFamily.sansMedium,
    fontWeight: '500',
    fontSize: 14.5,
    color: colors.cocoa,
  },
  offlineText: {
    marginTop: 2,
    fontFamily: fontFamily.sans,
    fontSize: 13,
    lineHeight: 19,
    color: colors.cocoaSoft,
  },
  version: {
    marginTop: 24,
    textAlign: 'center',
    fontFamily: fontFamily.sans,
    fontSize: 12,
    color: colors.mute,
  },
});
