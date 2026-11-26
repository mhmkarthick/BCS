import React from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SearchIcon, XIcon } from 'lucide-react-native';
import { colors, fontFamily, fontSize, radius } from '../../theme';

interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}

/** Rounded sand-coloured search input with a trailing clear button. */
export function SearchField({ value, onChange, placeholder }: SearchFieldProps) {
  return (
    <View style={styles.wrap}>
      <SearchIcon
        size={18}
        color={colors.mute}
        strokeWidth={1.75}
        style={styles.icon}
        pointerEvents="none"
      />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.mute}
        selectionColor={colors.cocoa}
        autoCorrect={false}
        returnKeyType="search"
        accessibilityLabel={placeholder}
        style={styles.input}
      />
      {value ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          hitSlop={6}
          onPress={() => onChange('')}
          style={styles.clear}
        >
          <XIcon size={14} color={colors.cocoaSoft} strokeWidth={2.25} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
    justifyContent: 'center',
  },
  icon: {
    position: 'absolute',
    left: 14,
    zIndex: 1,
  },
  input: {
    height: 44,
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: colors.sand,
    paddingLeft: 40,
    paddingRight: 40,
    fontFamily: fontFamily.sans,
    fontSize: fontSize['md++'],
    color: colors.cocoa,
  },
  clear: {
    position: 'absolute',
    right: 10,
    height: 24,
    width: 24,
    borderRadius: 12,
    backgroundColor: colors.handle,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
