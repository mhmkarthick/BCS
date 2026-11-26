import React from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { colors, fontFamily } from '../../theme';

interface AmountFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  /** Currency symbol shown to the left of the digits. */
  symbol?: string;
  style?: StyleProp<ViewStyle>;
  inputProps?: TextInputProps;
}

/**
 * Large centred amount input.
 *
 * The reference renders the amount as a 52px light numeral with the currency
 * symbol beside it — the single most important number on the expense and
 * payment forms. The value is always a plain decimal string; conversion to
 * minor units happens in the form hook.
 */
export function AmountField({
  label,
  value,
  onChangeText,
  error,
  symbol = '₹',
  style,
  inputProps,
}: AmountFieldProps) {
  return (
    <View style={[styles.root, style]}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <Text style={styles.symbol}>{symbol}</Text>
        <TextInput
          accessibilityLabel={label}
          aria-invalid={!!error}
          value={value}
          onChangeText={onChangeText}
          placeholder="0"
          placeholderTextColor={colors.placeholder}
          keyboardType="decimal-pad"
          selectionColor={colors.cocoa}
          style={styles.input}
          maxLength={12}
          {...inputProps}
        />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  label: {
    fontFamily: fontFamily.sansMedium,
    fontWeight: '500',
    fontSize: 13,
    color: colors.mute,
  },
  row: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
  },
  symbol: {
    fontFamily: fontFamily.sansLight,
    fontSize: 34,
    color: colors.mute,
  },
  input: {
    width: 220,
    textAlign: 'center',
    fontFamily: fontFamily.sansLight,
    fontSize: 52,
    lineHeight: 56,
    letterSpacing: -1.6,
    color: colors.cocoa,
    padding: 0,
  },
  error: {
    marginTop: 8,
    fontFamily: fontFamily.sans,
    fontSize: 13,
    color: colors.danger,
  },
});
