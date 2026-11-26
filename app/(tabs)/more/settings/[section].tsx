import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  CakeSliceIcon,
  CheckIcon,
  DatabaseIcon,
  DownloadIcon,
  HardDriveIcon,
  LockIcon,
  PaletteIcon,
  PlaneIcon,
  RefreshCcwIcon,
  SendIcon,
  SparklesIcon,
  Trash2Icon,
  UserXIcon,
} from 'lucide-react-native';
import { ChipGroup } from '../../../../src/components/ui/ChipGroup';
import { FieldShell, TextArea, TextField } from '../../../../src/components/ui/Field';
import { InfoRow, NavRow, RowGroup } from '../../../../src/components/ui/NavRow';
import { Screen } from '../../../../src/components/ui/Screen';
import { Segmented } from '../../../../src/components/ui/Segmented';
import { Stepper } from '../../../../src/components/ui/Stepper';
import { ToggleRow } from '../../../../src/components/ui/Toggle';
import { UpdatesSettings } from '../../../../src/components/ui/UpdatesSettings';
import { WhatsAppSettings } from '../../../../src/components/ui/WhatsAppSettings';
import { useDataStore } from '../../../../src/store/dataStore';
import { useUIStore } from '../../../../src/store/uiStore';
import { productUnits } from '../../../../src/data/labels';
import type { Business, Fulfilment } from '../../../../src/types';
import { fmtDate, todayISO } from '../../../../src/utils/format';
import { CURRENCY_OPTIONS, minorToInput, parseToMinor } from '../../../../src/utils/money';
import { snapshotSizeKb } from '../../../../src/services/backup';
import { colors, fontFamily, radius } from '../../../../src/theme';

const titles: Record<string, string> = {
  business: 'Business profile',
  currency: 'Currency',
  datetime: 'Date & time',
  orders: 'Order preferences',
  products: 'Product settings',
  notifications: 'Notifications',
  updates: 'Application Updates',
  whatsapp: 'WhatsApp Templates',
  data: 'Data management',
  about: 'About',
};

/**
 * Settings sections.
 *
 * One screen per section, selected by the `section` route parameter. Every
 * change is written to the `business` table immediately.
 */
export default function SettingsSectionScreen() {
  const router = useRouter();
  const { section = 'business' } = useLocalSearchParams<{ section?: string }>();

  const data = useDataStore((s) => s.data);
  const updateBusiness = useDataStore((s) => s.updateBusiness);
  const resetToSample = useDataStore((s) => s.resetToSample);
  const clearAll = useDataStore((s) => s.clearAll);
  const showToast = useUIStore((s) => s.showToast);
  const requestConfirm = useUIStore((s) => s.requestConfirm);

  const b = data.business;

  const save = async (
    patch: Partial<Business>,
    message = 'Saved on this device',
  ) => {
    await updateBusiness(patch);
    showToast(message);
  };

  const body = (() => {
    switch (section) {
      case 'business':
        return (
          <View style={styles.padded}>
            <BlurField
              label="Business name"
              value={b.name}
              required
              onSave={(v) => void save({ name: v })}
            />
            <BlurField
              label="Owner name"
              value={b.owner}
              onSave={(v) => void save({ owner: v })}
            />
            <BlurField
              label="Phone"
              keyboardType="phone-pad"
              value={b.phone}
              onSave={(v) => void save({ phone: v })}
            />
            <BlurField
              label="Email"
              keyboardType="email-address"
              value={b.email}
              onSave={(v) => void save({ email: v })}
            />
            <BlurField
              label="Address"
              multiline
              value={b.address}
              onSave={(v) => void save({ address: v })}
            />
            <Text style={styles.note}>
              Changes save automatically when you leave a field.
            </Text>
          </View>
        );

      case 'currency':
        return (
          <RowGroup>
            {CURRENCY_OPTIONS.map((c) => (
              <Pressable
                key={c.code}
                accessibilityRole="radio"
                accessibilityState={{ selected: b.currency === c.code }}
                accessibilityLabel={c.label}
                onPress={() =>
                  void save({ currency: c.code }, `Currency set to ${c.code}`)
                }
                style={({ pressed }) => [
                  styles.currencyRow,
                  pressed && { backgroundColor: colors.sand },
                ]}
              >
                <View style={styles.currencySymbol}>
                  <Text style={styles.currencySymbolText}>{c.symbol}</Text>
                </View>
                <View style={styles.currencyBody}>
                  <Text style={styles.currencyLabel}>{c.label}</Text>
                  <Text style={styles.currencyCode}>{c.code}</Text>
                </View>
                {b.currency === c.code ? (
                  <CheckIcon size={20} color={colors.cocoa} strokeWidth={2} />
                ) : null}
              </Pressable>
            ))}
          </RowGroup>
        );

      case 'datetime':
        return (
          <View style={styles.padded}>
            <FieldShell
              id="dt-date"
              label="Date format"
              hint={`Today: ${fmtDate(todayISO(), b.dateFormat)}`}
            >
              <ChipGroup
                ariaLabel="Date format"
                options={[
                  { value: 'd MMM yyyy' as Business['dateFormat'], label: '3 Nov 2026' },
                  { value: 'dd/MM/yyyy' as Business['dateFormat'], label: '03/11/2026' },
                  { value: 'MM/dd/yyyy' as Business['dateFormat'], label: '11/03/2026' },
                ]}
                value={b.dateFormat}
                onChange={(v) => void save({ dateFormat: v })}
              />
            </FieldShell>

            <FieldShell id="dt-time" label="Time format">
              <Segmented<Business['timeFormat']>
                ariaLabel="Time format"
                options={[
                  { value: '12h', label: '12-hour' },
                  { value: '24h', label: '24-hour' },
                ]}
                value={b.timeFormat}
                onChange={(v) => void save({ timeFormat: v })}
              />
            </FieldShell>

            <FieldShell id="dt-week" label="Week starts on">
              <Segmented<string>
                ariaLabel="Week starts on"
                options={[
                  { value: '1', label: 'Monday' },
                  { value: '0', label: 'Sunday' },
                ]}
                value={String(b.weekStartsOn)}
                onChange={(v) => void save({ weekStartsOn: v === '1' ? 1 : 0 })}
              />
            </FieldShell>

            <View style={styles.twoCol}>
              <View style={styles.flex}>
                <TextField
                  label="Opens at"
                  value={b.openTime}
                  onChangeText={(text) => void updateBusiness({ openTime: text })}
                  placeholder="09:00"
                />
              </View>
              <View style={styles.flex}>
                <TextField
                  label="Closes at"
                  value={b.closeTime}
                  onChangeText={(text) => void updateBusiness({ closeTime: text })}
                  placeholder="20:00"
                />
              </View>
            </View>
          </View>
        );

      case 'orders':
        return (
          <View style={styles.padded}>
            <BlurField
              label="Order number prefix"
              value={b.orderPrefix}
              required
              hint={`Next order: ${b.orderPrefix}-1038`}
              onSave={(v) => void save({ orderPrefix: v.toUpperCase() })}
            />

            <FieldShell id="op-ful" label="Default fulfilment">
              <Segmented<Fulfilment>
                ariaLabel="Default fulfilment"
                options={[
                  { value: 'pickup', label: 'Pickup' },
                  { value: 'delivery', label: 'Delivery' },
                ]}
                value={b.defaultFulfilment}
                onChange={(v) => void save({ defaultFulfilment: v })}
              />
            </FieldShell>

            <View style={styles.leadRow}>
              <View style={styles.leadBody}>
                <Text style={styles.leadTitle}>Default lead time</Text>
                <Text style={styles.leadText}>
                  New orders are due {b.leadDays}{' '}
                  {b.leadDays === 1 ? 'day' : 'days'} later
                </Text>
              </View>
              <Stepper
                label="lead days"
                value={b.leadDays}
                min={0}
                max={60}
                onChange={(v) => void updateBusiness({ leadDays: v })}
              />
            </View>

            <BlurField
              label="Default delivery charge"
              value={minorToInput(b.deliveryCharge)}
              prefix="₹"
              keyboardType="decimal-pad"
              onSave={(v) => void save({ deliveryCharge: parseToMinor(v) })}
            />
          </View>
        );

      case 'products':
        return (
          <>
            <View style={styles.padded}>
              <FieldShell id="ps-unit" label="Default unit for new products">
                <ChipGroup
                  ariaLabel="Default unit"
                  options={productUnits.map((u) => ({ value: u, label: u }))}
                  value={b.defaultUnit}
                  onChange={(v) => void save({ defaultUnit: v })}
                />
              </FieldShell>
            </View>
            <View style={styles.spacer}>
              <RowGroup>
                <ToggleRow
                  label="Track ready stock"
                  description="Warn when an order needs more than you have baked"
                  checked={b.trackStock}
                  onChange={(v) => void save({ trackStock: v })}
                />
                <ToggleRow
                  label="Show inactive products"
                  description="Keep seasonal items visible in your product list"
                  checked={b.showInactiveProducts}
                  onChange={(v) => void save({ showInactiveProducts: v })}
                />
              </RowGroup>
            </View>
            <View style={styles.spacer}>
              <RowGroup>
                <NavRow
                  icon={CakeSliceIcon}
                  label="Manage categories"
                  value={String(data.categories.length)}
                  onClick={() =>
                    router.navigate('/(tabs)/products/categories')
                  }
                />
              </RowGroup>
            </View>
          </>
        );

      case 'updates':
        return <UpdatesSettings />;

      case 'whatsapp':
        return <WhatsAppSettings />;

      case 'notifications': {
        const n = b.notifications;
        const setN = (patch: Partial<typeof n>) =>
          void save({ notifications: { ...n, ...patch } });
        return (
          <>
            <RowGroup>
              <ToggleRow
                label="Delivery reminders"
                description="A reminder before each order is due"
                checked={n.dueReminders}
                onChange={(v) => setN({ dueReminders: v })}
              />
              {n.dueReminders ? (
                <View style={styles.reminderWrap}>
                  <Text style={styles.reminderLabel}>Remind me</Text>
                  <ChipGroup
                    ariaLabel="Reminder time"
                    options={[
                      { value: '30', label: '30 min before' },
                      { value: '60', label: '1 hour before' },
                      { value: '120', label: '2 hours before' },
                    ]}
                    value={String(n.reminderMinutes)}
                    onChange={(v) => setN({ reminderMinutes: Number(v) })}
                  />
                </View>
              ) : null}
              <ToggleRow
                label="Low stock alerts"
                checked={n.lowStock}
                onChange={(v) => setN({ lowStock: v })}
              />
              <ToggleRow
                label="Evening summary"
                description="Today's takings and tomorrow's orders at 8 pm"
                checked={n.dailySummary}
                onChange={(v) => setN({ dailySummary: v })}
              />
              <ToggleRow
                label="Weekly backup reminder"
                checked={n.backupReminder}
                onChange={(v) => setN({ backupReminder: v })}
              />
            </RowGroup>
            <Text style={styles.footerNote}>
              Reminders are scheduled on this phone — they arrive even in
              airplane mode.
            </Text>
          </>
        );
      }

      case 'data': {
        const size = snapshotSizeKb(data);
        return (
          <>
            <View style={styles.card}>
              <InfoRow label="Customers" value={String(data.customers.length)} />
              <InfoRow label="Products" value={String(data.products.length)} />
              <InfoRow label="Orders" value={String(data.orders.length)} />
              <InfoRow label="Payments" value={String(data.payments.length)} />
              <InfoRow label="Expenses" value={String(data.expenses.length)} />
              <InfoRow
                label="Ingredients"
                value={String(data.ingredients.length)}
              />
              <InfoRow label="Storage used" value={`${size} KB`} emphasis />
            </View>

            <View style={styles.spacer}>
              <RowGroup>
                <NavRow
                  icon={DatabaseIcon}
                  label="Load sample bakery data"
                  description="Replaces current records with demo data"
                  onClick={async () => {
                    const ok = await requestConfirm({
                      title: 'Load sample data?',
                      body: 'Your current records will be replaced with a demo bakery. Create a backup first if you want to keep them.',
                      confirmLabel: 'Load sample data',
                      tone: 'danger',
                    });
                    if (ok) {
                      await resetToSample();
                      showToast('Sample data loaded');
                    }
                  }}
                />
                <NavRow
                  icon={RefreshCcwIcon}
                  label="Replay welcome setup"
                  onClick={() => router.navigate('/onboarding')}
                />
              </RowGroup>
            </View>

            <View style={styles.spacer}>
              <RowGroup>
                <NavRow
                  icon={Trash2Icon}
                  tone="danger"
                  label="Delete all data"
                  description="Erase orders, customers, products and money records"
                  onClick={async () => {
                    const ok = await requestConfirm({
                      title: 'Delete everything?',
                      body: 'All orders, customers, products, payments, expenses and inventory will be permanently erased from this phone. Your business profile stays.',
                      confirmLabel: 'Delete all data',
                      cancelLabel: 'Keep my data',
                      tone: 'danger',
                      icon: Trash2Icon,
                    });
                    if (ok) {
                      await clearAll();
                      showToast('All records deleted', 'info');
                    }
                  }}
                />
              </RowGroup>
            </View>
          </>
        );
      }

      case 'about':
        return (
          <>
            <View style={styles.aboutHero}>
              <View style={styles.aboutMark}>
                <CakeSliceIcon size={36} color={colors.peach} strokeWidth={1.5} />
              </View>
              <Text style={styles.aboutTitle}>Bright Cakes & Snacks</Text>
              <Text style={styles.aboutMeta}>Version 1.0 · Offline edition</Text>
            </View>

            <View style={styles.aboutList}>
              {[
                {
                  icon: PlaneIcon,
                  title: 'Works in airplane mode',
                  body: 'Every screen and calculation runs on this phone.',
                },
                {
                  icon: UserXIcon,
                  title: 'No account needed',
                  body: 'No sign-up, no password, no login screens.',
                },
                {
                  icon: LockIcon,
                  title: 'Your data stays with you',
                  body: 'Nothing is uploaded. Ever.',
                },
                {
                  icon: HardDriveIcon,
                  title: 'Backups you control',
                  body: 'Export a file and keep it wherever you like.',
                },
              ].map((x) => (
                <View key={x.title} style={styles.aboutItem}>
                  <x.icon
                    size={20}
                    color={colors.cocoaSoft}
                    strokeWidth={1.75}
                    style={styles.aboutIcon}
                  />
                  <View style={styles.aboutItemBody}>
                    <Text style={styles.aboutItemTitle}>{x.title}</Text>
                    <Text style={styles.aboutItemText}>{x.body}</Text>
                  </View>
                </View>
              ))}
            </View>

            <View style={styles.spacer}>
              <RowGroup>
                <NavRow
                  icon={PaletteIcon}
                  label="Design system"
                  description="Tokens, components and patterns"
                  onClick={() => router.navigate('/design-system')}
                />
                <NavRow
                  icon={SparklesIcon}
                  label="Replay welcome setup"
                  onClick={() => router.navigate('/onboarding')}
                />
              </RowGroup>
            </View>
          </>
        );

      default:
        return null;
    }
  })();

  return (
    <Screen title={titles[section] ?? 'Settings'} large>
      {body}
    </Screen>
  );
}

interface BlurFieldProps {
  label: string;
  value: string;
  onSave: (value: string) => void;
  required?: boolean;
  multiline?: boolean;
  prefix?: string;
  hint?: string;
  keyboardType?: 'default' | 'phone-pad' | 'email-address' | 'decimal-pad';
}

/**
 * A field that saves when it loses focus — the reference behaviour, kept so
 * the settings screen never needs an explicit save button.
 */
function BlurField({
  label,
  value,
  onSave,
  required,
  multiline,
  prefix,
  hint,
  keyboardType,
}: BlurFieldProps) {
  const [v, setV] = useState(value);
  const [error, setError] = useState<string | undefined>();

  // Keep the field in step when the stored value changes elsewhere. Adjusting
  // state during render is React's documented alternative to mirroring a prop
  // with an effect — React re-runs the component immediately, so the field
  // never shows a stale value.
  const [syncedValue, setSyncedValue] = useState(value);
  if (syncedValue !== value) {
    setSyncedValue(value);
    setV(value);
  }

  const commit = () => {
    if (v.trim() === value) {
      setError(undefined);
      return;
    }
    if (required && !v.trim()) {
      setError(`${label} can't be empty`);
      return;
    }
    setError(undefined);
    onSave(v.trim());
  };

  return multiline ? (
    <TextArea
      label={label}
      value={v}
      onChangeText={setV}
      onBlur={commit}
      error={error}
      hint={hint}
    />
  ) : (
    <TextField
      label={label}
      prefix={prefix}
      keyboardType={keyboardType}
      value={v}
      onChangeText={setV}
      onBlur={commit}
      error={error}
      hint={hint}
    />
  );
}

const styles = StyleSheet.create({
  padded: {
    gap: 16,
    paddingHorizontal: 20,
  },
  note: {
    fontFamily: fontFamily.sans,
    fontSize: 12.5,
    color: colors.mute,
  },
  currencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
    borderBottomColor: colors.line,
  },
  currencySymbol: {
    height: 36,
    width: 36,
    borderRadius: radius.xl,
    backgroundColor: colors.sand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currencySymbolText: {
    fontFamily: fontFamily.sansSemiBold,
    fontWeight: '600',
    fontSize: 15,
    color: colors.cocoa,
  },
  currencyBody: {
    flex: 1,
  },
  currencyLabel: {
    fontFamily: fontFamily.sans,
    fontSize: 15,
    color: colors.cocoa,
  },
  currencyCode: {
    fontFamily: fontFamily.sans,
    fontSize: 12.5,
    color: colors.mute,
  },
  twoCol: {
    flexDirection: 'row',
    gap: 12,
  },
  flex: {
    flex: 1,
  },
  leadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  leadBody: {
    flex: 1,
  },
  leadTitle: {
    fontFamily: fontFamily.sans,
    fontSize: 15,
    color: colors.cocoa,
  },
  leadText: {
    marginTop: 2,
    fontFamily: fontFamily.sans,
    fontSize: 13,
    color: colors.mute,
  },
  spacer: {
    marginTop: 28,
  },
  reminderWrap: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  reminderLabel: {
    marginBottom: 10,
    fontFamily: fontFamily.sans,
    fontSize: 13,
    color: colors.mute,
  },
  footerNote: {
    marginHorizontal: 24,
    marginTop: 12,
    fontFamily: fontFamily.sans,
    fontSize: 12.5,
    lineHeight: 18,
    color: colors.mute,
  },
  card: {
    marginHorizontal: 16,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    paddingHorizontal: 16,
  },
  aboutHero: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  aboutMark: {
    height: 80,
    width: 80,
    borderRadius: 24,
    backgroundColor: colors.cocoa,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aboutTitle: {
    marginTop: 20,
    fontFamily: fontFamily.serif,
    fontSize: 26,
    color: colors.cocoa,
  },
  aboutMeta: {
    marginTop: 4,
    fontFamily: fontFamily.sans,
    fontSize: 13.5,
    color: colors.mute,
  },
  aboutList: {
    marginTop: 32,
    marginHorizontal: 20,
    gap: 16,
  },
  aboutItem: {
    flexDirection: 'row',
    gap: 14,
  },
  aboutIcon: {
    marginTop: 2,
  },
  aboutItemBody: {
    flex: 1,
  },
  aboutItemTitle: {
    fontFamily: fontFamily.sansMedium,
    fontWeight: '500',
    fontSize: 15,
    color: colors.cocoa,
  },
  aboutItemText: {
    marginTop: 2,
    fontFamily: fontFamily.sans,
    fontSize: 13.5,
    lineHeight: 19,
    color: colors.mute,
  },
});
