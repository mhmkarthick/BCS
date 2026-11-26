import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { addDays, format, parseISO } from 'date-fns';
import { CalendarIcon } from 'lucide-react-native';
import { colors, fontFamily, fontSize, radius } from '../../theme';
import { toISODate } from '../../utils/format';
import { DatePickerModal } from './DatePicker';

interface DateStripProps {
  value: string;
  onChange: (value: string) => void;
  days?: number;
  ariaLabel: string;
}

/**
 * Horizontal date selector.
 *
 * 21 upcoming days rendered as 54×70 cards, followed by an "Other" cell that
 * opens the native date picker. The currently selected date outside the
 * window is prepended so it is never silently hidden.
 */
export function DateStrip({ value, onChange, days = 21, ariaLabel }: DateStripProps) {
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const today = new Date();
  const list = Array.from({ length: days }, (_, i) => toISODate(addDays(today, i)));
  const all = !value || list.includes(value) ? list : [value, ...list];

  return (
    <View accessibilityLabel={ariaLabel}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {all.map((d, i) => {
          const date = parseISO(d);
          const active = d === value;
          return (
            <Pressable
              key={d}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              accessibilityLabel={format(date, 'EEEE d MMMM')}
              onPress={() => onChange(d)}
              style={({ pressed }) => [
                styles.cell,
                active ? styles.cellActive : styles.cellIdle,
                pressed && !active && { borderColor: '#4A281833' },
              ]}
            >
              <Text style={[styles.weekday, active && styles.activeMuted]}>
                {d === list[0] && i === 0 ? 'Today' : format(date, 'EEE')}
              </Text>
              <Text style={[styles.day, active && styles.activeText]}>{format(date, 'd')}</Text>
              <Text style={[styles.month, active && styles.activeMuted]}>
                {format(date, 'MMM')}
              </Text>
            </Pressable>
          );
        })}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Pick another date"
          onPress={() => setPickerOpen(true)}
          style={({ pressed }) => [styles.other, pressed && { backgroundColor: colors.sand }]}
        >
          <CalendarIcon size={16} color={colors.cocoaSoft} strokeWidth={1.75} />
          <Text style={styles.otherLabel}>Other</Text>
        </Pressable>
      </ScrollView>

      <DatePickerModal
        visible={pickerOpen}
        value={value}
        mode="date"
        onCancel={() => setPickerOpen(false)}
        onConfirm={(v) => {
          setPickerOpen(false);
          onChange(v);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  cell: {
    height: 70,
    width: 54,
    borderRadius: radius['2xl'],
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellActive: {
    backgroundColor: colors.cocoa,
    borderColor: colors.cocoa,
  },
  cellIdle: {
    backgroundColor: colors.white,
    borderColor: colors.line,
  },
  weekday: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize.xs,
    color: colors.mute,
  },
  day: {
    fontFamily: fontFamily.sansSemiBold,
    fontWeight: '600',
    fontSize: 19,
    lineHeight: 23,
    color: colors.cocoa,
  },
  month: {
    fontFamily: fontFamily.sans,
    fontSize: 10.5,
    color: colors.mute,
  },
  activeText: {
    color: colors.ivory,
  },
  activeMuted: {
    color: '#FFFFFFB3',
  },
  other: {
    height: 70,
    width: 62,
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.dashedBorder,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  otherLabel: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize['xs+'],
    color: colors.cocoaSoft,
  },
});
