import React, { type ReactNode, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  ClipboardListIcon,
  PlusIcon,
  Trash2Icon,
} from 'lucide-react-native';
import { BarChart } from '../src/components/charts/BarChart';
import { DonutChart } from '../src/components/charts/DonutChart';
import { Button } from '../src/components/ui/Button';
import { ChipGroup } from '../src/components/ui/ChipGroup';
import { DateStrip } from '../src/components/ui/DateStrip';
import { TextField } from '../src/components/ui/Field';
import { Screen } from '../src/components/ui/Screen';
import { Segmented } from '../src/components/ui/Segmented';
import { Sheet } from '../src/components/ui/Sheet';
import { StatusBadge } from '../src/components/ui/StatusBadge';
import { Stepper } from '../src/components/ui/Stepper';
import { Toggle } from '../src/components/ui/Toggle';
import { EmptyState } from '../src/components/ui/EmptyState';
import { useUIStore } from '../src/store/uiStore';
import { orderStatuses } from '../src/data/labels';
import { shiftISO } from '../src/utils/format';
import { colors, fontFamily, radius } from '../src/theme';

const swatches = [
  { name: 'Pure White', hex: '#FFFFFF', use: 'App background', value: colors.ivory },
  { name: 'Light Surface', hex: '#F8F8F8', use: 'Cards & surfaces', value: colors.sand },
  { name: 'Deep Cocoa', hex: '#4A2818', use: 'Headings, primary text', value: colors.cocoa },
  { name: 'Brand Red', hex: '#E51B23', use: 'Primary actions, selection', value: colors.peach },
  { name: 'Error Red', hex: '#D93636', use: 'Errors, destructive', value: colors.rose },
  { name: 'Success Green', hex: '#168A50', use: 'Success, ready states', value: colors.sage },
  { name: 'Muted Text', hex: '#9A8C84', use: 'Secondary, muted text', value: colors.mute },
  { name: 'Light Border', hex: '#E8E1DC', use: 'Dividers, borders', value: colors.line },
];

const architecture = [
  { tab: 'Home', screens: 'Dashboard · quick actions' },
  {
    tab: 'Orders',
    screens:
      'List · details · create / edit · status · payment · completion',
  },
  {
    tab: 'Products',
    screens: 'Catalogue · details · create / edit · categories',
  },
  { tab: 'Customers', screens: 'Directory · profile & history · create / edit' },
  {
    tab: 'More',
    screens:
      'Expenses · Payments · Reports · Calendar · Inventory · Backup · Settings',
  },
];

const radii = [
  { r: 12, label: 'Inputs small' },
  { r: 16, label: 'Inputs, buttons' },
  { r: 20, label: 'Cards' },
  { r: 28, label: 'Sheets' },
];

/**
 * Design system.
 *
 * A living reference of the tokens, components and motion used across the
 * app. Everything on this screen is the real component — nothing is mocked.
 */
export default function DesignSystemScreen() {
  const showToast = useUIStore((s) => s.showToast);
  const requestConfirm = useUIStore((s) => s.requestConfirm);
  const celebrate = useUIStore((s) => s.celebrate);

  const [chip, setChip] = useState('cakes');
  const [seg, setSeg] = useState('week');
  const [on, setOn] = useState(true);
  const [qty, setQty] = useState(2);
  const [date, setDate] = useState(shiftISO(2));
  const [sheet, setSheet] = useState(false);

  return (
    <Screen
      title="Design system"
      large
      subtitle="Tokens, components and patterns for Bright Cakes & Snacks"
    >
      <Section title="Colour">
        <View style={styles.swatchGrid}>
          {swatches.map((c) => (
            <View key={c.name} style={styles.swatch}>
              <View style={[styles.swatchFill, { backgroundColor: c.value }]} />
              <View style={styles.swatchBody}>
                <Text style={styles.swatchName}>{c.name}</Text>
                <Text style={styles.swatchHex}>{c.hex}</Text>
                <Text style={styles.swatchUse}>{c.use}</Text>
              </View>
            </View>
          ))}
        </View>
      </Section>

      <Section title="Typography">
        <View style={styles.panel}>
          <View>
            <Text style={styles.typeDisplay}>Good morning!</Text>
            <Text style={styles.typeNote}>
              Newsreader 36 · editorial headings, sparingly
            </Text>
          </View>
          <View>
            <Text style={styles.typeMoney}>₹12,480</Text>
            <Text style={styles.typeNote}>
              Inter Light 44 · tabular numerals for money
            </Text>
          </View>
          <View>
            <Text style={styles.typeSection}>Section title</Text>
            <Text style={styles.typeBody}>
              Body text keeps a calm 15px rhythm.
            </Text>
            <Text style={styles.typeCaption}>
              Captions and metadata at 12.5–13px.
            </Text>
          </View>
        </View>
      </Section>

      <Section title="Shape & spacing">
        <View style={styles.radiusRow}>
          {radii.map((r) => (
            <View key={r.r} style={styles.radiusCell}>
              <View
                style={[
                  styles.radiusBox,
                  { borderTopLeftRadius: r.r, borderTopRightRadius: r.r },
                ]}
              />
              <Text style={styles.radiusValue}>{r.r}px</Text>
              <Text style={styles.radiusLabel}>{r.label}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.note}>
          Spacing follows a 4px grid; screen gutters are 20px, card padding
          16–20px.
        </Text>
      </Section>

      <Section title="Buttons">
        <View style={styles.wrapRow}>
          <Button icon={PlusIcon}>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="soft">Soft</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
        </View>
      </Section>

      <Section title="Inputs">
        <View style={styles.inputs}>
          <TextField
            label="Customer name"
            placeholder="e.g. Ritu Agarwal"
            value=""
            onChangeText={() => undefined}
          />
          <TextField
            label="Advance received"
            prefix="₹"
            value="5200"
            onChangeText={() => undefined}
            error="Advance can't be more than the total of ₹3,680"
          />
          <ChipGroup
            ariaLabel="Example chips"
            options={[
              { value: 'cakes', label: 'Cakes' },
              { value: 'cookies', label: 'Cookies' },
              { value: 'sweets', label: 'Sweets' },
            ]}
            value={chip}
            onChange={setChip}
          />
          <Segmented
            ariaLabel="Example segmented"
            options={[
              { value: 'day', label: 'Day' },
              { value: 'week', label: 'Week' },
              { value: 'month', label: 'Month' },
            ]}
            value={seg}
            onChange={setSeg}
          />
          <View style={styles.toggleRow}>
            <Toggle checked={on} onChange={setOn} label="Example toggle" />
            <Stepper value={qty} onChange={setQty} label="example quantity" />
          </View>
          <DateStrip
            ariaLabel="Example date picker"
            value={date}
            onChange={setDate}
            days={10}
          />
        </View>
      </Section>

      <Section title="Order status">
        <View style={styles.wrapRow}>
          {orderStatuses.map((s) => (
            <StatusBadge key={s} status={s} />
          ))}
        </View>
      </Section>

      <Section title="Feedback & overlays">
        <View style={styles.buttonGrid}>
          <Button
            variant="secondary"
            onPress={() => showToast('Order BC-1038 saved on this device')}
          >
            Toast
          </Button>
          <Button variant="secondary" onPress={() => setSheet(true)}>
            Bottom sheet
          </Button>
          <Button
            variant="secondary"
            onPress={() =>
              void requestConfirm({
                title: 'Delete this expense?',
                body: 'Your profit figures will update.',
                confirmLabel: 'Delete',
                tone: 'danger',
                icon: Trash2Icon,
              })
            }
          >
            Dialog
          </Button>
          <Button
            variant="secondary"
            onPress={() =>
              celebrate('Order completed', 'BC-1037 · paid in full')
            }
          >
            Success
          </Button>
        </View>
      </Section>

      <Section title="Charts">
        <View style={styles.chartPanel}>
          <View style={styles.chartBar}>
            <BarChart
              ariaLabel="Example bar chart"
              height={80}
              data={[3, 5, 2, 6, 4, 7, 5].map((v, i) => ({
                label: 'MTWTFSS'[i],
                value: v * 1000,
                highlight: i === 5,
              }))}
            />
          </View>
          <DonutChart
            ariaLabel="Example donut"
            size={88}
            thickness={11}
            segments={[
              { label: 'UPI', value: 60, color: '#4A2818' },
              { label: 'Cash', value: 28, color: '#C8171E' },
              { label: 'Bank', value: 12, color: '#168A50' },
            ]}
          />
        </View>
      </Section>

      <Section title="Empty state">
        <View style={styles.dashedPanel}>
          <EmptyState
            compact
            icon={ClipboardListIcon}
            title="No orders yet"
            body="Every module has its own empty state with a single, relevant action."
            actionLabel="New order"
            onAction={() => undefined}
          />
        </View>
      </Section>

      <Section title="Navigation">
        <View style={styles.navList}>
          {architecture.map((a) => (
            <View key={a.tab} style={styles.navRow}>
              <Text style={styles.navTab}>{a.tab}</Text>
              <Text style={styles.navScreens}>{a.screens}</Text>
            </View>
          ))}
        </View>
      </Section>

      <Section title="Motion">
        <View style={styles.motionList}>
          <Text style={styles.motionItem}>
            Press feedback 120–150ms · scale 0.97
          </Text>
          <Text style={styles.motionItem}>
            Screen push 280ms · sheets 300ms · dialogs 200ms
          </Text>
          <Text style={styles.motionItem}>
            Easing cubic-bezier(0.23, 1, 0.32, 1) — never ease-in
          </Text>
          <Text style={styles.motionItem}>
            Chart bars stagger 30ms · reduced motion respected
          </Text>
        </View>
      </Section>

      <Sheet
        open={sheet}
        onClose={() => setSheet(false)}
        title="Bottom sheet"
        description="Drag the handle down or tap outside to close."
        footer={
          <Button size="lg" full onPress={() => setSheet(false)}>
            Done
          </Button>
        }
      >
        <Text style={styles.sheetBody}>
          Sheets hold short, focused tasks — picking a customer, updating a
          status, adjusting stock — without leaving the current screen.
        </Text>
      </Sheet>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 36,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    marginBottom: 16,
    fontFamily: fontFamily.serif,
    fontSize: 22,
    lineHeight: 24,
    color: colors.cocoa,
  },
  swatchGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  swatch: {
    width: '48%',
    overflow: 'hidden',
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
  },
  swatchFill: {
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  swatchBody: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  swatchName: {
    fontFamily: fontFamily.sansMedium,
    fontWeight: '500',
    fontSize: 13.5,
    color: colors.cocoa,
  },
  swatchHex: {
    fontFamily: fontFamily.sans,
    fontSize: 12,
    color: colors.mute,
  },
  swatchUse: {
    marginTop: 2,
    fontFamily: fontFamily.sans,
    fontSize: 12,
    color: colors.cocoaSoft,
  },
  panel: {
    gap: 16,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    padding: 20,
  },
  typeDisplay: {
    fontFamily: fontFamily.serif,
    fontSize: 36,
    lineHeight: 38,
    color: colors.cocoa,
  },
  typeMoney: {
    fontFamily: fontFamily.sansLight,
    fontSize: 44,
    lineHeight: 46,
    letterSpacing: -1.3,
    color: colors.cocoa,
  },
  typeNote: {
    marginTop: 4,
    fontFamily: fontFamily.sans,
    fontSize: 12,
    color: colors.mute,
  },
  typeSection: {
    fontFamily: fontFamily.sansSemiBold,
    fontWeight: '600',
    fontSize: 17,
    color: colors.cocoa,
  },
  typeBody: {
    marginTop: 2,
    fontFamily: fontFamily.sans,
    fontSize: 15,
    color: colors.cocoa,
  },
  typeCaption: {
    marginTop: 2,
    fontFamily: fontFamily.sans,
    fontSize: 13,
    color: colors.mute,
  },
  radiusRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  radiusCell: {
    flex: 1,
    alignItems: 'center',
  },
  radiusBox: {
    height: 56,
    width: '100%',
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
  },
  radiusValue: {
    marginTop: 6,
    fontFamily: fontFamily.sansMedium,
    fontWeight: '500',
    fontSize: 12,
    color: colors.cocoa,
  },
  radiusLabel: {
    fontFamily: fontFamily.sans,
    fontSize: 11,
    color: colors.mute,
  },
  note: {
    marginTop: 16,
    fontFamily: fontFamily.sans,
    fontSize: 13,
    color: colors.cocoaSoft,
  },
  wrapRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  inputs: {
    gap: 16,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  buttonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chartPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    padding: 20,
  },
  chartBar: {
    flex: 1,
  },
  dashedPanel: {
    borderRadius: radius.card,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.dashedBorderSoft,
  },
  navList: {
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    paddingHorizontal: 16,
  },
  navRow: {
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
    borderBottomColor: colors.line,
    paddingVertical: 12,
  },
  navTab: {
    fontFamily: fontFamily.sansMedium,
    fontWeight: '500',
    fontSize: 14.5,
    color: colors.cocoa,
  },
  navScreens: {
    marginTop: 2,
    fontFamily: fontFamily.sans,
    fontSize: 13,
    color: colors.mute,
  },
  motionList: {
    gap: 6,
  },
  motionItem: {
    fontFamily: fontFamily.sans,
    fontSize: 13.5,
    color: colors.cocoaSoft,
  },
  sheetBody: {
    fontFamily: fontFamily.sans,
    fontSize: 14.5,
    lineHeight: 21,
    color: colors.cocoaSoft,
  },
});
