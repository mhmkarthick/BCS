import React, { type ReactNode, useId } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { CircleAlertIcon } from 'lucide-react-native';
import { colors, fontFamily, fontSize, radius } from '../../theme';

interface ShellProps {
  label?: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  id: string;
  children: ReactNode;
  className?: string;
  style?: StyleProp<ViewStyle>;
}

/** Label + control + hint/error wrapper. */
export function FieldShell({
  label,
  hint,
  error,
  optional,
  id,
  children,
  className = '',
  style,
}: ShellProps) {
  return (
    <View style={style}>
      {label ? (
        <View style={styles.labelRow}>
          <Text style={styles.label}>{label}</Text>
          {optional ? <Text style={styles.optional}>Optional</Text> : null}
        </View>
      ) : null}
      {children}
      {error ? (
        <View style={styles.errorRow}>
          <CircleAlertIcon
            size={14}
            color={colors.danger}
            strokeWidth={2}
            style={styles.errorIcon}
          />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
}

interface CommonProps {
  label?: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  containerClassName?: string;
  style?: StyleProp<ViewStyle>;
}

export interface TextFieldProps
  extends Omit<TextInputProps, 'style'>,
    CommonProps {
  prefix?: string;
  suffix?: string;
}

/**
 * Single-line text field.
 *
 * Height 48, radius 16, 15px text. Focus replaces the border with a cocoa
 * hairline and adds the reference peach halo.
 */
export function TextField({
  label,
  hint,
  error,
  optional,
  prefix,
  suffix,
  containerClassName,
  style,
  id,
  ...rest
}: TextFieldProps) {
  const auto = useId();
  const fid = id ?? auto;

  return (
    <FieldShell
      label={label}
      hint={hint}
      error={error}
      optional={optional}
      id={fid}
      className={containerClassName}
    >
      <View style={styles.inputWrap}>
        {prefix ? (
          <Text style={[styles.prefix, prefix ? styles.withPrefix : null]} pointerEvents="none">
            {prefix}
          </Text>
        ) : null}
        <TextInput
          id={fid}
          accessibilityLabel={label}
          aria-invalid={!!error}
          placeholderTextColor={colors.mute}
          selectionColor={colors.cocoa}
          style={[
            styles.input,
            error ? styles.inputError : styles.inputOk,
            prefix ? styles.inputWithPrefix : null,
            suffix ? styles.inputWithSuffix : null,
            style,
          ]}
          {...rest}
        />
        {suffix ? (
          <Text style={styles.suffix} pointerEvents="none">
            {suffix}
          </Text>
        ) : null}
      </View>
    </FieldShell>
  );
}

export interface TextAreaProps extends CommonProps {
  value?: string;
  onChangeText?: (text: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  multiline?: boolean;
  numberOfLines?: number;
  autoCapitalize?: TextInputProps['autoCapitalize'];
  keyboardType?: TextInputProps['keyboardType'];
  maxLength?: number;
  id?: string;
  testID?: string;
  accessibilityLabel?: string;
}

/** Multi-line text area — 88px minimum height, no resize handle. */
export function TextArea({
  label,
  hint,
  error,
  optional,
  containerClassName,
  style,
  id,
  ...rest
}: TextAreaProps) {
  const auto = useId();
  const fid = id ?? auto;

  return (
    <FieldShell
      label={label}
      hint={hint}
      error={error}
      optional={optional}
      id={fid}
      className={containerClassName}
    >
      <TextInput
        id={fid}
        accessibilityLabel={label}
        multiline
        numberOfLines={3}
        textAlignVertical="top"
        placeholderTextColor={colors.mute}
        selectionColor={colors.cocoa}
        style={[
          styles.input,
          styles.textArea,
          error ? styles.inputError : styles.inputOk,
          style,
        ]}
        {...rest}
      />
    </FieldShell>
  );
}

/**
 * Phone input with a fixed, non-editable +91 country code prefix.
 *
 * The user enters only the 10-digit Indian mobile number. Non-digit
 * characters are stripped on every change and on paste. The value is always
 * the raw 10-digit string (without +91) so the existing API contract is
 * preserved.
 */
interface PhoneInputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  containerClassName?: string;
  style?: StyleProp<ViewStyle>;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

export function PhoneInput({
  label,
  hint,
  error,
  optional,
  containerClassName,
  style,
  value,
  onChangeText,
  placeholder,
}: PhoneInputProps) {
  const fid = useId();

  const onChange = (text: string) => {
    // Keep digits only, max 10.
    const digits = text.replace(/\D/g, '').slice(0, 10);
    onChangeText(digits);
  };

  return (
    <FieldShell
      label={label}
      hint={hint}
      error={error}
      optional={optional}
      id={fid}
      className={containerClassName}
      style={style}
    >
      <View style={styles.inputWrap}>
        <Text style={[styles.prefix, styles.withPrefix]} pointerEvents="none">
          +91
        </Text>
        <TextInput
          id={fid}
          accessibilityLabel={label ?? 'Phone number'}
          aria-invalid={!!error}
          placeholderTextColor={colors.mute}
          selectionColor={colors.cocoa}
          keyboardType="phone-pad"
          maxLength={10}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          style={[
            styles.input,
            styles.inputWithPrefix,
            error ? styles.inputError : styles.inputOk,
            style,
          ]}
        />
      </View>
      {error ? (
        <View style={styles.errorRow}>
          <CircleAlertIcon
            size={14}
            color={colors.danger}
            strokeWidth={2}
            style={styles.errorIcon}
          />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </FieldShell>
  );
}

/** Section heading with an optional right-hand aside. */
export function FormSection({
  title,
  children,
  aside,
}: {
  title: string;
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {aside}
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  label: {
    fontFamily: fontFamily.sansMedium,
    fontWeight: '500',
    fontSize: fontSize['sm++'],
    lineHeight: 18,
    color: colors.cocoaSoft,
  },
  optional: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize.sm,
    lineHeight: 16,
    color: colors.mute,
  },
  hint: {
    marginTop: 6,
    fontFamily: fontFamily.sans,
    fontSize: fontSize['sm+'],
    lineHeight: 17,
    color: colors.mute,
  },
  errorRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  errorIcon: {
    marginTop: 2,
  },
  errorText: {
    flex: 1,
    fontFamily: fontFamily.sans,
    fontSize: fontSize['sm+'],
    lineHeight: 17,
    color: colors.danger,
  },
  inputWrap: {
    position: 'relative',
    justifyContent: 'center',
  },
  input: {
    width: '100%',
    height: 48,
    borderRadius: radius['2xl'],
    borderWidth: 1,
    backgroundColor: colors.white,
    fontFamily: fontFamily.sans,
    fontSize: fontSize['md++'],
    color: colors.cocoa,
    paddingHorizontal: 16,
    paddingVertical: 0,
  },
  inputOk: {
    borderColor: colors.line,
  },
  inputError: {
    borderColor: '#D9363680',
  },
  inputWithPrefix: {
    paddingLeft: 32,
  },
  inputWithSuffix: {
    paddingRight: 64,
  },
  prefix: {
    position: 'absolute',
    left: 16,
    zIndex: 1,
    fontFamily: fontFamily.sans,
    fontSize: fontSize['md++'],
    color: colors.mute,
  },
  withPrefix: {
    left: 16,
  },
  suffix: {
    position: 'absolute',
    right: 16,
    fontFamily: fontFamily.sans,
    fontSize: fontSize['sm++'],
    color: colors.mute,
  },
  textArea: {
    height: undefined,
    minHeight: 88,
    paddingTop: 12,
    paddingBottom: 12,
    lineHeight: 21,
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: fontFamily.serif,
    fontSize: fontSize['3xl'],
    lineHeight: 22,
    color: colors.cocoa,
  },
  sectionBody: {
    gap: 16,
  },
});
