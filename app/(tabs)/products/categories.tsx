import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { PlusIcon, Trash2Icon } from 'lucide-react-native';
import { Button, IconButton } from '../../../src/components/ui/Button';
import { FieldShell, TextField } from '../../../src/components/ui/Field';
import { NavRow, RowGroup } from '../../../src/components/ui/NavRow';
import { Screen } from '../../../src/components/ui/Screen';
import { Sheet } from '../../../src/components/ui/Sheet';
import { useDataStore } from '../../../src/store/dataStore';
import { useUIStore } from '../../../src/store/uiStore';
import { categoryIcons } from '../../../src/data/labels';
import type { Category } from '../../../src/types';
import { uid } from '../../../src/utils/format';
import { colors, radius } from '../../../src/theme';

/** Categories — rename, re-icon and remove the menu groupings. */
export default function CategoriesScreen() {
  const data = useDataStore((s) => s.data);
  const upsertCategory = useDataStore((s) => s.upsertCategory);
  const removeCategory = useDataStore((s) => s.removeCategory);
  const showToast = useUIStore((s) => s.showToast);
  const requestConfirm = useUIStore((s) => s.requestConfirm);

  const [editing, setEditing] = useState<Category | null>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('cake');
  const [error, setError] = useState<string | undefined>();

  const count = (id: string) =>
    data.products.filter((p) => p.categoryId === id).length;

  const openSheet = (c?: Category) => {
    setEditing(c ?? null);
    setName(c?.name ?? '');
    setIcon(c?.icon ?? 'cake');
    setError(undefined);
    setOpen(true);
  };

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Enter a category name');
      return;
    }
    if (
      data.categories.some(
        (c) => c.id !== editing?.id && c.name.toLowerCase() === trimmed.toLowerCase(),
      )
    ) {
      setError('This category already exists');
      return;
    }
    await upsertCategory({
      id: editing?.id ?? uid('cat'),
      name: trimmed,
      icon,
      position: editing?.position ?? data.categories.length,
    });
    setOpen(false);
    showToast(editing ? 'Category updated' : `${trimmed} added`);
  };

  const del = async () => {
    if (!editing) return;
    const n = count(editing.id);
    if (n > 0) {
      setOpen(false);
      await requestConfirm({
        title: "Can't delete yet",
        body: `${editing.name} still has ${n} product${
          n > 1 ? 's' : ''
        }. Move ${n > 1 ? 'them' : 'it'} to another category first.`,
        confirmLabel: 'Got it',
        cancelLabel: 'Close',
      });
      return;
    }
    setOpen(false);
    const ok = await requestConfirm({
      title: `Delete ${editing.name}?`,
      confirmLabel: 'Delete category',
      tone: 'danger',
      icon: Trash2Icon,
    });
    if (ok) {
      await removeCategory(editing.id);
      showToast('Category deleted', 'info');
    }
  };

  return (
    <Screen
      title="Categories"
      large
      subtitle="Group your menu so products are quick to find"
      actions={
        <IconButton
          icon={PlusIcon}
          label="Add category"
          onPress={() => openSheet()}
        />
      }
    >
      <RowGroup>
        {data.categories.map((c) => (
          <NavRow
            key={c.id}
            icon={categoryIcons[c.icon] ?? categoryIcons.other}
            label={c.name}
            value={`${count(c.id)}`}
            onClick={() => openSheet(c)}
          />
        ))}
      </RowGroup>
      <View style={styles.addWrap}>
        <Button
          variant="secondary"
          size="lg"
          full
          icon={PlusIcon}
          onPress={() => openSheet()}
        >
          Add category
        </Button>
      </View>

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Edit category' : 'New category'}
        footer={
          <View style={styles.sheetFooter}>
            <Button size="lg" full onPress={() => void save()}>
              {editing ? 'Save' : 'Add category'}
            </Button>
            {editing ? (
              <Button
                size="lg"
                variant="dangerGhost"
                full
                onPress={() => void del()}
              >
                Delete category
              </Button>
            ) : null}
          </View>
        }
      >
        <View style={styles.sheetBody}>
          <TextField
            label="Name"
            value={name}
            onChangeText={setName}
            placeholder="e.g. Brownies"
            error={error}
          />
          <FieldShell id="cat-icon" label="Icon">
            <View style={styles.iconGrid} accessibilityLabel="Icon">
              {Object.entries(categoryIcons).map(([key, Icon]) => (
                <Pressable
                  key={key}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: icon === key }}
                  accessibilityLabel={key}
                  onPress={() => setIcon(key)}
                  style={[
                    styles.iconCell,
                    icon === key ? styles.iconCellActive : styles.iconCellIdle,
                  ]}
                >
                  <Icon
                    size={20}
                    color={icon === key ? colors.ivory : colors.cocoa}
                    strokeWidth={1.75}
                  />
                </Pressable>
              ))}
            </View>
          </FieldShell>
        </View>
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  addWrap: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  sheetBody: {
    gap: 20,
  },
  sheetFooter: {
    gap: 8,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  iconCell: {
    width: '18%',
    aspectRatio: 1,
    borderRadius: radius['2xl'],
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCellActive: {
    borderColor: colors.cocoa,
    backgroundColor: colors.cocoa,
  },
  iconCellIdle: {
    borderColor: colors.line,
    backgroundColor: colors.white,
  },
});
