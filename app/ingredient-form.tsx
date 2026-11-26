import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch, type Resolver } from 'react-hook-form';
import { Button } from '../src/components/ui/Button';
import { ChipGroup } from '../src/components/ui/ChipGroup';
import { FieldShell, FormSection, TextField } from '../src/components/ui/Field';
import { Screen } from '../src/components/ui/Screen';
import { useDataStore } from '../src/store/dataStore';
import { useUIStore } from '../src/store/uiStore';
import { ingredientUnits } from '../src/data/labels';
import type { Ingredient } from '../src/types';
import { nowStamp, uid } from '../src/utils/format';
import { minorToInput, parseToMinor } from '../src/utils/money';
import { ingredientSchema } from '../src/validation/schemas';
import { colors, fontFamily } from '../src/theme';

interface IngredientFormValues {
  name: string;
  unit: string;
  /** Quantity as typed by the user. */
  stock: string;
  minStock: string;
  /** Decimal string in major units. */
  costPerUnit: string;
}

/**
 * Ingredient form.
 *
 * Stock quantities are plain numbers; the cost per unit is money and is
 * converted to **integer paise** before it is written to SQLite. Changing the
 * stock level records a correction movement so the history stays honest.
 */
export default function IngredientFormScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const data = useDataStore((s) => s.data);
  const upsertIngredient = useDataStore((s) => s.upsertIngredient);
  const adjustStock = useDataStore((s) => s.adjustStock);
  const showToast = useUIStore((s) => s.showToast);

  const existing = id ? data.ingredients.find((i) => i.id === id) : undefined;

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    trigger,
  } = useForm<IngredientFormValues>({
    resolver: zodResolver(ingredientSchema) as unknown as Resolver<IngredientFormValues>,
    defaultValues: {
      name: existing?.name ?? '',
      unit: existing?.unit ?? 'kg',
      stock: existing ? String(existing.stock) : '',
      minStock: existing ? String(existing.minStock) : '',
      costPerUnit: existing ? minorToInput(existing.costPerUnit) : '',
    },
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  const name = useWatch({ control, name: 'name' }) ?? '';
  const unit = useWatch({ control, name: 'unit' }) ?? 'kg';
  const stock = useWatch({ control, name: 'stock' }) ?? '';
  const minStock = useWatch({ control, name: 'minStock' }) ?? '';
  const costPerUnit = useWatch({ control, name: 'costPerUnit' }) ?? '';

  const duplicate = data.ingredients.find(
    (i) =>
      i.id !== existing?.id &&
      i.name.trim().toLowerCase() === name.trim().toLowerCase() &&
      name.trim().length > 0,
  );

  const onSubmit = handleSubmit(async (values) => {
    const stock = Math.round(Number(values.stock) * 100) / 100;
    const item: Ingredient = {
      id: existing?.id ?? uid('ing'),
      name: values.name.trim(),
      unit: values.unit,
      stock,
      minStock: Number(values.minStock || 0),
      /** Minor units. */
      costPerUnit: parseToMinor(values.costPerUnit),
      updatedAt: nowStamp(),
    };

    if (existing) {
      await upsertIngredient(item);
      const diff = stock - existing.stock;
      if (diff !== 0) {
        await adjustStock(item.id, diff, 'Correction', nowStamp());
      }
      showToast('Ingredient updated');
      router.back();
      return;
    }

    await upsertIngredient(item);
    if (stock !== 0) {
      await adjustStock(item.id, stock, 'Opening stock', nowStamp());
    }
    showToast(`${item.name} added`);
    router.replace(`/(tabs)/more/inventory/${item.id}` as never);
  });

  const save = async () => {
    if (duplicate) {
      await trigger('name');
      showToast('Please check the highlighted fields', 'error');
      return;
    }
    const valid = await trigger();
    if (!valid) {
      showToast('Please check the highlighted fields', 'error');
      return;
    }
    await onSubmit();
  };

  return (
    <Screen
      title={existing ? 'Edit ingredient' : 'New ingredient'}
      footer={
        <Button size="lg" full onPress={() => void save()} loading={isSubmitting}>
          {existing ? 'Save changes' : 'Add ingredient'}
        </Button>
      }
    >
      <FormSection title="Ingredient">
        <TextField
          label="Name"
          value={name}
          onChangeText={(text) => setValue('name', text, { shouldValidate: true })}
          placeholder="e.g. Icing sugar"
          error={
            duplicate ? 'This ingredient already exists' : errors.name?.message
          }
        />
        <FieldShell id="ing-unit" label="Measured in">
          <ChipGroup
            ariaLabel="Unit"
            options={ingredientUnits.map((u) => ({ value: u, label: u }))}
            value={unit}
            onChange={(v) => setValue('unit', v, { shouldValidate: true })}
          />
        </FieldShell>
      </FormSection>

      <FormSection title="Stock">
        <View style={styles.twoCol}>
          <View style={styles.flex}>
            <TextField
              label="Available now"
              keyboardType="decimal-pad"
              value={stock}
              onChangeText={(text) =>
                setValue('stock', text, { shouldValidate: true })
              }
              suffix={unit}
              placeholder="0"
              error={errors.stock?.message}
            />
          </View>
          <View style={styles.flex}>
            <TextField
              label="Minimum level"
              keyboardType="decimal-pad"
              value={minStock}
              onChangeText={(text) =>
                setValue('minStock', text, { shouldValidate: true })
              }
              suffix={unit}
              placeholder="0"
              error={errors.minStock?.message}
            />
          </View>
        </View>
        <Text style={styles.note}>
          You&apos;ll see a gentle warning when stock drops to the minimum.
        </Text>
        <TextField
          label="Cost per unit"
          optional
          prefix="₹"
          keyboardType="decimal-pad"
          value={costPerUnit}
          onChangeText={(text) =>
            setValue('costPerUnit', text, { shouldValidate: true })
          }
          placeholder="0"
          suffix={`/ ${unit}`}
        />
      </FormSection>
    </Screen>
  );
}

const styles = StyleSheet.create({
  twoCol: {
    flexDirection: 'row',
    gap: 12,
  },
  flex: {
    flex: 1,
  },
  note: {
    marginTop: -6,
    fontFamily: fontFamily.sans,
    fontSize: 12.5,
    color: colors.mute,
  },
});
