import React, { useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { colors, fontFamily, fontSize, radius } from '../../theme';
import { Button } from './Button';

interface DatePickerModalProps {
  visible: boolean;
  /** ISO date (`yyyy-MM-dd`) or `HH:mm` depending on the mode. */
  value: string;
  mode: 'date' | 'time';
  title?: string;
  onCancel: () => void;
  onConfirm: (value: string) => void;
}

/**
 * Native date / time picker.
 *
 * Wraps `@react-native-community/datetimepicker` so the pickers behave
 * consistently on Android (inline dialog) and iOS (inline wheel inside a
 * modal). The value is exchanged as an ISO date or `HH:mm` string so it can
 * be stored directly in SQLite.
 *
 * On Android, `DateTimePicker` launches a native system dialog and is
 * rendered *without* a React Native `Modal` wrapper — the native dialog owns
 * its own overlay, so nesting it inside a Modal backdrop would trap or block
 * touch events, making dates unselectable. On iOS, the picker is shown inline
 * inside a Modal with explicit Cancel / Done buttons.
 *
 * State-during-render is used to re-seed `picked` whenever `visible`/`value`
 * / `mode` changes. React re-runs the component immediately with the new state
 * before anything is painted, so the native picker never flashes a stale
 * date. This is intentional and differs from calling setState inside an
 * effect.
 */
export function DatePickerModal({
  visible,
  value,
  mode,
  title,
  onCancel,
  onConfirm,
}: DatePickerModalProps) {
  const [picked, setPicked] = useState(() => parseValue(value, mode));

  // Re-seed the picker whenever it opens or the underlying value changes.
  //
  // Adjusting state during render is React's documented alternative to
  // mirroring a prop with an effect: React re-runs this component immediately
  // with the new state, before anything is painted, so the picker never
  // flashes a stale date.
  const [syncedVisible, setSyncedVisible] = useState(visible);
  const [syncedValue, setSyncedValue] = useState(value);
  const [syncedMode, setSyncedMode] = useState(mode);

  if (
    syncedVisible !== visible ||
    syncedValue !== value ||
    syncedMode !== mode
  ) {
    setSyncedVisible(visible);
    setSyncedValue(value);
    setSyncedMode(mode);
    setPicked(parseValue(value, mode));
  }

  const handleAndroidChange = (event: DateTimePickerEvent, date?: Date) => {
    if (event.type === 'dismissed') {
      onCancel();
      return;
    }
    if (date) {
      setPicked(date);
      onConfirm(formatValue(date, mode));
    }
  };

  // Android: DateTimePicker is self-contained — tapping it opens the native
  // date/time dialog. Render it directly (no Modal) so the native overlay
  // isn't trapped inside a React Native Modal backdrop, which would block
  // touches and make dates unselectable.
  if (Platform.OS === 'android') {
    if (!visible) return null;
    return (
      <DateTimePicker
        value={picked}
        mode={mode}
        display={mode === 'date' ? 'calendar' : 'spinner'}
        onChange={handleAndroidChange}
        textColor={colors.cocoa}
      />
    );
  }

  // iOS: inline wheel inside a Modal with explicit Cancel / Done buttons.
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} accessibilityLabel="Dismiss" />
        <View style={styles.card}>
          <Text style={styles.title}>
            {title ?? (mode === 'date' ? 'Pick a date' : 'Pick a time')}
          </Text>

          <DateTimePicker
            value={picked}
            mode={mode}
            display="spinner"
            onChange={(_e, date) => date && setPicked(date)}
            textColor={colors.cocoa}
            themeVariant="light"
          />
          <View style={styles.actions}>
            <Button variant="ghost" onPress={onCancel}>
              Cancel
            </Button>
            <Button
              onPress={() => onConfirm(formatValue(picked, mode))}
            >
              Done
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/** A tappable row that opens the native picker. */
export function DateTimeField({
  label,
  value,
  mode,
  display,
  onChange,
  error,
  optional,
}: {
  label: string;
  value: string;
  mode: 'date' | 'time';
  display: string;
  onChange: (value: string) => void;
  error?: string;
  optional?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <View>
      <View style={styles.fieldLabelRow}>
        <Text style={styles.fieldLabel}>{label}</Text>
        {optional ? <Text style={styles.optional}>Optional</Text> : null}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${display}`}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.field,
          error && { borderColor: '#D9363680' },
          pressed && { backgroundColor: colors.sand },
        ]}
      >
        <Text style={[styles.fieldValue, !display && { color: colors.mute }]}>
          {display}
        </Text>
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <DatePickerModal
        visible={open}
        value={value}
        mode={mode}
        onCancel={() => setOpen(false)}
        onConfirm={(v) => {
          setOpen(false);
          onChange(v);
        }}
      />
    </View>
  );
}

/** Parses an ISO date / `HH:mm` string into a Date. */
export function parseValue(value: string, mode: 'date' | 'time'): Date {
  const now = new Date();
  if (mode === 'time') {
    const [h = '0', m = '0'] = value.split(':');
    const d = new Date(now);
    d.setHours(Number(h), Number(m), 0, 0);
    return d;
  }
  if (!value) return now;
  const [y, mo, da] = value.split('-').map(Number);
  if (!y || !mo || !da) return now;
  const d = new Date(now);
  d.setFullYear(y, mo - 1, da);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Formats a Date into an ISO date / `HH:mm` string. */
export function formatValue(date: Date, mode: 'date' | 'time'): string {
  if (mode === 'time') {
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }
  const y = date.getFullYear();
  const mo = String(date.getMonth() + 1).padStart(2, '0');
  const da = String(date.getDate()).padStart(2, '0');
  return `${y}-${mo}-${da}`;
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: '#4A281840',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: radius.dialog,
    backgroundColor: colors.white,
    padding: 20,
  },
  title: {
    fontFamily: fontFamily.serif,
    fontSize: fontSize['2xl+'],
    lineHeight: 27,
    color: colors.cocoa,
    marginBottom: 12,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 12,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  fieldLabel: {
    fontFamily: fontFamily.sansMedium,
    fontWeight: '500',
    fontSize: fontSize['sm++'],
    color: colors.cocoaSoft,
  },
  optional: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize.sm,
    color: colors.mute,
  },
  field: {
    height: 48,
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  fieldValue: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize['md++'],
    color: colors.cocoa,
  },
  error: {
    marginTop: 6,
    fontFamily: fontFamily.sans,
    fontSize: fontSize['sm+'],
    color: colors.danger,
  },
});
