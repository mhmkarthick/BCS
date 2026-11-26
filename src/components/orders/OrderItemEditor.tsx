import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { ChevronDownIcon, CircleAlertIcon, TriangleAlertIcon, XIcon } from 'lucide-react-native';
import type { OrderItem } from '../../types';
import { inr } from '../../utils/money';
import { colors, duration, easing, fontFamily, fontSize, radius } from '../../theme';
import { TextField } from '../ui/Field';
import { ProductThumb } from '../ui/ProductThumb';
import { Stepper } from '../ui/Stepper';

interface OrderItemEditorProps {
  item: OrderItem;
  image?: string;
  iconKey: string;
  onChange: (patch: Partial<OrderItem>) => void;
  onRemove: () => void;
  warning?: string;
  error?: string;
}

/**
 * Compact editable order line.
 *
 * Default state is collapsed: a single row shows the item thumbnail, name,
 * short description, total price and remove button, plus a quantity stepper
 * and an expand/collapse control for customisable items.
 *
 * Expanding reveals the full customisation form (flavour, size, weight,
 * cake message, notes). All fields remain editable when expanded; when
 * collapsed the customisation summary is shown read-only.
 *
 * Each item manages its own expanded/collapsed state independently.
 */
export function OrderItemEditor({
  item,
  image,
  iconKey,
  onChange,
  onRemove,
  warning,
  error,
}: OrderItemEditorProps) {
  const custom = !item.productId;
  const hasDetails = !!(item.flavour || item.size || item.weight || item.message || item.notes);
  const [open, setOpen] = useState(false);

  const summaryParts: string[] = [];
  if (custom) summaryParts.push('Custom item');
  if (item.flavour) summaryParts.push(item.flavour);
  if (item.size) summaryParts.push(item.size);
  if (item.weight) summaryParts.push(item.weight);
  if (item.message) summaryParts.push(`“${item.message}”`);
  const summary = summaryParts.length ? summaryParts.join(' · ') : '';

  const lineTotal = item.qty * item.unitPrice;

  const showCustomisation = custom || hasDetails;

  return (
    <View style={[styles.card, error && styles.cardError]}>
      <View style={styles.head}>
        <ProductThumb
          image={image}
          iconKey={iconKey}
          alt=""
          style={styles.thumb}
          rounded={radius['2xl']}
        />
        <View style={styles.headBody}>
          <Text numberOfLines={1} style={styles.name}>
            {item.name}
          </Text>
          <Text style={styles.typeText}>
            {summary || (custom ? 'Custom item' : `${inr(item.unitPrice)} each`)}
          </Text>
        </View>
        <View style={styles.right}>
          <Text style={styles.lineTotal}>{inr(Math.round(lineTotal))}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Remove ${item.name || 'item'}`}
            hitSlop={6}
            onPress={onRemove}
            style={({ pressed }) => [styles.remove, pressed && { backgroundColor: colors.sand }]}
          >
            <XIcon size={16} color={colors.mute} strokeWidth={2} />
          </Pressable>
        </View>
      </View>

      <View style={styles.controls}>
        <Stepper value={item.qty} onChange={(qty) => onChange({ qty })} label="quantity" />
        {showCustomisation ? (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: open }}
            accessibilityLabel={open ? 'Hide customisation details' : 'Show customisation details'}
            onPress={() => setOpen((o) => !o)}
            style={styles.toggle}
          >
            <Text style={styles.toggleText}>
              {open ? 'Hide details' : 'Customisation details'}
            </Text>
            <ChevronDownIcon
              size={16}
              color={colors.cocoaSoft}
              strokeWidth={2}
              style={open ? styles.chevronOpen : undefined}
            />
          </Pressable>
        ) : null}
      </View>

      {warning ? (
        <View style={styles.warning}>
          <TriangleAlertIcon size={14} color={colors.roseDeep} strokeWidth={2} style={styles.warningIcon} />
          <Text style={styles.warningText}>{warning}</Text>
        </View>
      ) : null}

      {error ? (
        <View style={styles.errorRow}>
          <CircleAlertIcon size={14} color={colors.danger} strokeWidth={2} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {open ? (
        <Animated.View
          entering={FadeIn.duration(duration.normal).easing(easing.out)}
          exiting={FadeOut.duration(duration.fast)}
          style={styles.details}
        >
          <View style={styles.detailRow}>
            <View style={styles.detailCol}>
              <TextField
                label="Flavour"
                value={item.flavour ?? ''}
                onChangeText={(text) => onChange({ flavour: text })}
                placeholder="Vanilla"
              />
            </View>
            <View style={styles.detailCol}>
              <TextField
                label="Size"
                value={item.size ?? ''}
                onChangeText={(text) => onChange({ size: text })}
                placeholder={'8"'}
              />
            </View>
            <View style={styles.detailCol}>
              <TextField
                label="Weight"
                value={item.weight ?? ''}
                onChangeText={(text) => onChange({ weight: text })}
                placeholder="1 kg"
              />
            </View>
          </View>
          <TextField
            label="Cake message"
            value={item.message ?? ''}
            onChangeText={(text) => onChange({ message: text })}
            placeholder="Happy Birthday, Aarav!"
          />
          <TextField
            label="Customisation notes"
            value={item.notes ?? ''}
            onChangeText={(text) => onChange({ notes: text })}
            placeholder="Colours, toppers, allergies…"
          />
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    padding: 12,
    marginBottom: 10,
  },
  cardError: {
    borderColor: '#D9363680',
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  thumb: {
    height: 40,
    width: 40,
  },
  headBody: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontFamily: fontFamily.sansMedium,
    fontWeight: '500',
    fontSize: fontSize['md++'],
    color: colors.cocoa,
  },
  typeText: {
    marginTop: 1,
    fontFamily: fontFamily.sans,
    fontSize: fontSize['sm+'],
    color: colors.cocoaSoft,
  },
  right: {
    alignItems: 'flex-end',
  },
  remove: {
    height: 32,
    width: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controls: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  priceWrap: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  currency: {
    position: 'absolute',
    left: 12,
    zIndex: 1,
    fontFamily: fontFamily.sans,
    fontSize: fontSize.md,
    color: colors.mute,
  },
  priceInput: {
    height: 40,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    paddingLeft: 28,
    paddingRight: 8,
    fontFamily: fontFamily.sans,
    fontSize: fontSize['md+'],
    color: colors.cocoa,
  },
  lineTotal: {
    fontFamily: fontFamily.sansSemiBold,
    fontWeight: '600',
    fontSize: fontSize['md++'],
    color: colors.cocoa,
  },
  warning: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderRadius: radius.xl,
    backgroundColor: colors.roseSoft,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  warningIcon: {
    marginTop: 1,
  },
  warningText: {
    flex: 1,
    fontFamily: fontFamily.sans,
    fontSize: fontSize['sm+'],
    lineHeight: 17,
    color: colors.roseDeep,
  },
  errorRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  errorText: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize['sm+'],
    color: colors.danger,
  },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  toggleText: {
    fontFamily: fontFamily.sansMedium,
    fontWeight: '500',
    fontSize: fontSize['sm++'],
    color: colors.cocoaSoft,
  },
  chevronOpen: {
    transform: [{ rotate: '180deg' }],
  },
  details: {
    paddingTop: 8,
    gap: 10,
  },
  detailRow: {
    flexDirection: 'row',
    gap: 8,
  },
  detailCol: {
    flex: 1,
  },
});
