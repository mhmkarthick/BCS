import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch, type Resolver } from 'react-hook-form';
import {
  ImagePlusIcon,
  RefreshCwIcon,
  Trash2Icon,
} from 'lucide-react-native';
import { Image } from 'expo-image';
import { Button } from '../src/components/ui/Button';
import { ChipGroup } from '../src/components/ui/ChipGroup';
import { FieldShell, FormSection, TextArea, TextField } from '../src/components/ui/Field';
import { RowGroup } from '../src/components/ui/NavRow';
import { Screen } from '../src/components/ui/Screen';
import { ToggleRow } from '../src/components/ui/Toggle';
import { useDataStore } from '../src/store/dataStore';
import { useUIStore } from '../src/store/uiStore';
import { categoryIcons, productUnits } from '../src/data/labels';
import type { Product } from '../src/types';
import { nowStamp, uid } from '../src/utils/format';
import { inr, minorToInput, parseToMinor } from '../src/utils/money';
import { pickImage } from '../src/utils/files';
import { productSchema } from '../src/validation/schemas';
import { colors, fontFamily, fontSize, radius } from '../src/theme';

interface ProductFormValues {
  name: string;
  categoryId: string;
  description: string;
  /** Decimal string in major units. */
  price: string;
  cost: string;
  /** Quantity as typed by the user. */
  stock: string;
  unit: string;
  active: boolean;
  trackStock: boolean;
  image?: string;
}

/**
 * Product form.
 *
 * Prices are entered as plain decimal strings and stored as **minor units**.
 * A product photo is copied into the app's private document directory so it
 * never leaves the phone and never depends on the network.
 */
export default function ProductFormScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const data = useDataStore((s) => s.data);
  const upsertProduct = useDataStore((s) => s.upsertProduct);
  const showToast = useUIStore((s) => s.showToast);

  const existing = id ? data.products.find((p) => p.id === id) : undefined;

  const [image, setImage] = useState<string | undefined>(existing?.image);
  const [, setBusy] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    trigger,
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema) as unknown as Resolver<ProductFormValues>,
    defaultValues: {
      name: existing?.name ?? '',
      categoryId: existing?.categoryId ?? data.categories[0]?.id ?? 'cat_cakes',
      description: existing?.description ?? '',
      price: existing ? minorToInput(existing.price) : '',
      cost: existing ? minorToInput(existing.cost) : '',
      stock:
        existing?.stock !== null && existing?.stock !== undefined
          ? String(existing.stock)
          : '',
      unit: existing?.unit ?? data.business.defaultUnit,
      active: existing?.active ?? true,
      trackStock: existing ? existing.stock !== null : false,
      image: existing?.image,
    },
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  const name = useWatch({ control, name: 'name' }) ?? '';
  const categoryId = useWatch({ control, name: 'categoryId' }) ?? '';
  const description = useWatch({ control, name: 'description' }) ?? '';
  const price = useWatch({ control, name: 'price' });
  const cost = useWatch({ control, name: 'cost' });
  const unit = useWatch({ control, name: 'unit' });
  const trackStock = useWatch({ control, name: 'trackStock' });
  const active = useWatch({ control, name: 'active' }) ?? true;
  const stock = useWatch({ control, name: 'stock' }) ?? '';

  const priceMinor = parseToMinor(price ?? '');
  const costMinor = parseToMinor(cost ?? '');
  const marginHint =
    priceMinor > 0 && (cost ?? '') !== ''
      ? costMinor > priceMinor
        ? `Cost is higher than price — you'd lose ${inr(costMinor - priceMinor)} per ${unit}`
        : `Margin ${Math.round(((priceMinor - costMinor) / priceMinor) * 100)}% · ${inr(priceMinor - costMinor)} profit per ${unit}`
      : undefined;

  const duplicate = data.products.find(
    (x) =>
      x.id !== existing?.id &&
      x.name.trim().toLowerCase() === name.trim().toLowerCase() &&
      name.trim().length > 0,
  );

  const chooseImage = async () => {
    setBusy(true);
    try {
      const uri = await pickImage();
      if (uri) {
        setImage(uri);
        setValue('image', uri, { shouldDirty: true });
      }
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "That image couldn't be read",
        'error',
      );
    } finally {
      setBusy(false);
    }
  };

  const removeImage = () => {
    setImage(undefined);
    setValue('image', undefined, { shouldDirty: true });
  };

  const onSubmit = handleSubmit(async (values) => {
    const product: Product = {
      id: existing?.id ?? uid('prd'),
      name: values.name.trim(),
      image,
      categoryId: values.categoryId,
      description: values.description.trim(),
      price: parseToMinor(values.price),
      cost: parseToMinor(values.cost),
      stock: values.trackStock ? Math.round(Number(values.stock || 0)) : null,
      unit: values.unit,
      active: values.active,
      createdAt: existing?.createdAt ?? nowStamp(),
      updatedAt: nowStamp(),
    };
    await upsertProduct(product);
    showToast(
      existing ? 'Product updated' : `${product.name} added to your menu`,
    );
    if (existing) router.back();
    else router.replace(`/(tabs)/products/${product.id}` as never);
  });

  const save = async () => {
    if (duplicate) {
      await trigger('name');
      showToast('Please check the highlighted fields', 'error');
      return;
    }
    await onSubmit();
  };

  return (
    <Screen
      title={existing ? 'Edit product' : 'New product'}
      footer={
        <Button size="lg" full onPress={() => void save()} loading={isSubmitting}>
          {existing ? 'Save changes' : 'Add product'}
        </Button>
      }
    >
      <View style={styles.photoWrap}>
        {image ? (
          <View style={styles.photoFrame}>
            <Image
              source={{ uri: image }}
              accessibilityLabel="Product preview"
              contentFit="cover"
              transition={180}
              style={styles.photo}
            />
            <View style={styles.photoActions}>
              <Button
                size="sm"
                variant="secondary"
                icon={RefreshCwIcon}
                onPress={() => void chooseImage()}
              >
                Replace
              </Button>
              <Button
                size="sm"
                variant="secondary"
                icon={Trash2Icon}
                onPress={removeImage}
                accessibilityLabel="Remove photo"
              >
                Remove
              </Button>
            </View>
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add a photo"
            onPress={() => void chooseImage()}
            style={({ pressed }) => [
              styles.photoEmpty,
              pressed && { backgroundColor: '#F8F8F880' },
            ]}
          >
            <ImagePlusIcon size={28} color={colors.cocoaSoft} strokeWidth={1.5} />
            <Text style={styles.photoEmptyTitle}>Add a photo</Text>
            <Text style={styles.photoEmptyBody}>
              Stored privately on this phone
            </Text>
          </Pressable>
        )}
      </View>

      <FormSection title="Details">
        <TextField
          label="Product name"
          value={name}
          onChangeText={(text) => setValue('name', text, { shouldValidate: true })}
          placeholder="e.g. Lemon Drizzle Cake"
          error={
            duplicate
              ? 'A product with this name already exists'
              : errors.name?.message
          }
        />
        <FieldShell id="prd-cat" label="Category" error={errors.categoryId?.message}>
          <ChipGroup
            ariaLabel="Category"
            options={data.categories.map((cat) => ({
              value: cat.id,
              label: cat.name,
              icon: categoryIcons[cat.icon],
            }))}
            value={categoryId}
            onChange={(v) => setValue('categoryId', v, { shouldValidate: true })}
          />
        </FieldShell>
        <TextArea
          label="Description"
          optional
          value={description}
          onChangeText={(text) => setValue('description', text)}
          placeholder="Flavours, size, what makes it special"
        />
      </FormSection>

      <FormSection title="Pricing">
        <View style={styles.twoCol}>
          <View style={styles.flex}>
            <TextField
              label="Selling price"
              prefix="₹"
              keyboardType="decimal-pad"
              value={price ?? ''}
              onChangeText={(text) =>
                setValue('price', text, { shouldValidate: true })
              }
              placeholder="0"
              error={errors.price?.message}
            />
          </View>
          <View style={styles.flex}>
            <TextField
              label="Cost price"
              prefix="₹"
              keyboardType="decimal-pad"
              value={cost ?? ''}
              onChangeText={(text) =>
                setValue('cost', text, { shouldValidate: true })
              }
              placeholder="0"
            />
          </View>
        </View>
        {marginHint ? (
          <View
            style={[
              styles.marginHint,
              costMinor > priceMinor
                ? styles.marginHintBad
                : styles.marginHintGood,
            ]}
          >
            <Text
              style={[
                styles.marginHintText,
                { color: costMinor > priceMinor ? colors.roseDeep : colors.sageDeep },
              ]}
            >
              {marginHint}
            </Text>
          </View>
        ) : null}
        <FieldShell id="prd-unit" label="Sold per">
          <ChipGroup
            ariaLabel="Unit"
            options={productUnits.map((u) => ({ value: u, label: u }))}
            value={unit ?? ''}
            onChange={(v) => setValue('unit', v)}
          />
        </FieldShell>
      </FormSection>

      <FormSection title="Availability">
        <RowGroup style={styles.bleedGroup}>
          <ToggleRow
            label="Available for orders"
            description="Inactive products are hidden when creating orders"
            checked={active}
            onChange={(v) => setValue('active', v)}
          />
          <ToggleRow
            label="Track ready stock"
            description="For items baked ahead, like cookies or puffs"
            checked={trackStock ?? false}
            onChange={(v) => setValue('trackStock', v)}
          />
        </RowGroup>
        {trackStock ? (
          <TextField
            label="Available quantity"
            keyboardType="number-pad"
            value={stock}
            onChangeText={(text) => setValue('stock', text, { shouldValidate: true })}
            placeholder="0"
            suffix={unit}
            error={errors.stock?.message}
          />
        ) : null}
      </FormSection>
    </Screen>
  );
}

const styles = StyleSheet.create({
  photoWrap: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  photoFrame: {
    aspectRatio: 4 / 3,
    borderRadius: radius.hero,
    backgroundColor: colors.sand,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoActions: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    flexDirection: 'row',
    gap: 8,
  },
  photoEmpty: {
    aspectRatio: 4 / 3,
    width: '100%',
    borderRadius: radius.hero,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.dashedBorder,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  photoEmptyTitle: {
    fontFamily: fontFamily.sansMedium,
    fontWeight: '500',
    fontSize: fontSize['md+'],
    color: colors.cocoaSoft,
  },
  photoEmptyBody: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize['sm+'],
    color: colors.mute,
  },
  /** Pulls the group card out to the 20px screen gutter. */
  bleedGroup: {
    marginHorizontal: -16,
  },
  twoCol: {
    flexDirection: 'row',
    gap: 12,
  },
  flex: {
    flex: 1,
  },
  marginHint: {
    marginTop: -4,
    borderRadius: radius.xl,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  marginHintGood: {
    backgroundColor: colors.sageSoft,
  },
  marginHintBad: {
    backgroundColor: colors.roseSoft,
  },
  marginHintText: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize['sm++'],
    lineHeight: 18,
  },
});
