import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { UserPlusIcon } from 'lucide-react-native';
import { useDataStore } from '../../store/dataStore';
import type { Customer } from '../../types';
import { colors, fontFamily, fontSize, radius } from '../../theme';
import { Avatar } from '../ui/Avatar';
import { SearchField } from '../ui/SearchField';
import { Sheet } from '../ui/Sheet';

interface CustomerPickerSheetProps {
  open: boolean;
  onClose: () => void;
  onSelect: (c: Customer) => void;
  onCreateNew?: () => void;
  selectedId?: string;
}

/** Searchable customer list presented in a bottom sheet. */
export function CustomerPickerSheet({
  open,
  onClose,
  onSelect,
  onCreateNew,
  selectedId,
}: CustomerPickerSheetProps) {
  const customers = useDataStore((s) => s.data.customers);
  const [query, setQuery] = useState('');

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...customers]
      .sort((a, b) => a.name.localeCompare(b.name))
      .filter(
        (c) =>
          !q ||
          c.name.toLowerCase().includes(q) ||
          c.phone.replace(/\s/g, '').includes(q.replace(/\s/g, '')),
      );
  }, [customers, query]);

  return (
    <Sheet open={open} onClose={onClose} title="Choose customer">
      <SearchField value={query} onChange={setQuery} placeholder="Search name or phone" />
      <View style={styles.list}>
        {onCreateNew ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add new customer"
            onPress={onCreateNew}
            style={({ pressed }) => [styles.createRow, pressed && { opacity: 0.7 }]}
          >
            <View style={styles.createIcon}>
              <UserPlusIcon size={18} color={colors.ivory} strokeWidth={1.75} />
            </View>
            <Text style={styles.createText}>Add new customer</Text>
          </Pressable>
        ) : null}

        {list.map((c) => {
          const selected = c.id === selectedId;
          return (
            <Pressable
              key={c.id}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={c.name}
              onPress={() => onSelect(c)}
              style={({ pressed }) => [
                styles.row,
                selected && styles.rowSelected,
                pressed && !selected && { backgroundColor: colors.sand },
              ]}
            >
              <Avatar name={c.name} />
              <View style={styles.rowBody}>
                <Text numberOfLines={1} style={styles.rowName}>
                  {c.name}
                </Text>
                <Text style={styles.rowPhone}>{c.phone}</Text>
              </View>
            </Pressable>
          );
        })}

        {list.length === 0 ? (
          <Text style={styles.empty}>
            {customers.length ? `No one matches “${query}”.` : 'No customers saved yet.'}
          </Text>
        ) : null}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  list: {
    marginTop: 8,
  },
  createRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  createIcon: {
    height: 40,
    width: 40,
    borderRadius: 20,
    backgroundColor: colors.cocoa,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createText: {
    fontFamily: fontFamily.sansMedium,
    fontWeight: '500',
    fontSize: fontSize['md++'],
    color: colors.cocoa,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: radius['2xl'],
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  rowSelected: {
    backgroundColor: colors.sand,
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
  },
  rowName: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize['md++'],
    color: colors.cocoa,
  },
  rowPhone: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize['sm+'],
    color: colors.mute,
  },
  empty: {
    paddingVertical: 32,
    textAlign: 'center',
    fontFamily: fontFamily.sans,
    fontSize: fontSize.md,
    color: colors.mute,
  },
});
