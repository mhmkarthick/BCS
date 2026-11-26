import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch, type Resolver } from 'react-hook-form';
import { TriangleAlertIcon } from 'lucide-react-native';
import { Button } from '../src/components/ui/Button';
import { FormSection, PhoneInput, TextArea, TextField } from '../src/components/ui/Field';
import { Screen } from '../src/components/ui/Screen';
import { useDataStore } from '../src/store/dataStore';
import { useUIStore } from '../src/store/uiStore';
import { lastDigits, nowStamp, uid } from '../src/utils/format';
import { customerSchema } from '../src/validation/schemas';
import { colors, fontFamily, fontSize, radius } from '../src/theme';

interface CustomerFormValues {
  name: string;
  phone: string;
  address: string;
  notes: string;
}

/**
 * Customer form.
 *
 * A possible duplicate (same phone number or same name) never blocks the
 * save — it is surfaced as a warning with a link to the existing profile,
 * exactly as the reference does.
 */
export default function CustomerFormScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const data = useDataStore((s) => s.data);
  const upsertCustomer = useDataStore((s) => s.upsertCustomer);
  const showToast = useUIStore((s) => s.showToast);

  const existing = id ? data.customers.find((c) => c.id === id) : undefined;
  const [acknowledged, setAcknowledged] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    trigger,
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema) as unknown as Resolver<CustomerFormValues>,
    defaultValues: {
      name: existing?.name ?? '',
      phone: existing?.phone ?? '',
      address: existing?.address ?? '',
      notes: existing?.notes ?? '',
    },
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  const name = useWatch({ control, name: 'name' }) ?? '';
  const phone = useWatch({ control, name: 'phone' }) ?? '';
  const address = useWatch({ control, name: 'address' }) ?? '';
  const notes = useWatch({ control, name: 'notes' }) ?? '';

  const phoneDigits = lastDigits(phone, 10);
  const others = data.customers.filter((c) => c.id !== existing?.id);
  const phoneMatch =
    phoneDigits.length === 10
      ? others.find((c) => lastDigits(c.phone, 10) === phoneDigits)
      : undefined;
  const nameMatch = name.trim()
    ? others.find(
        (c) => c.name.trim().toLowerCase() === name.trim().toLowerCase(),
      )
    : undefined;
  const duplicate = phoneMatch ?? nameMatch;

  const onSubmit = handleSubmit(async (values) => {
    const customer = {
      id: existing?.id ?? uid('cus'),
      name: values.name.trim(),
      phone: values.phone.trim(),
      address: values.address.trim() || undefined,
      notes: values.notes.trim() || undefined,
      createdAt: existing?.createdAt ?? nowStamp(),
    };
    await upsertCustomer(customer);
    showToast(existing ? 'Customer updated' : `${customer.name} saved`);
    if (existing) router.back();
    else router.replace(`/(tabs)/customers/${customer.id}` as never);
  });

  const save = async () => {
    const valid = await trigger();
    if (!valid) {
      showToast('Please check the highlighted fields', 'error');
      return;
    }
    if (duplicate && !acknowledged) {
      setAcknowledged(true);
      showToast('Possible duplicate — tap Save anyway to keep both', 'info');
      return;
    }
    await onSubmit();
  };

  return (
    <Screen
      title={existing ? 'Edit customer' : 'New customer'}
      footer={
        <Button size="lg" full onPress={() => void save()} loading={isSubmitting}>
          {duplicate && acknowledged
            ? 'Save anyway'
            : existing
              ? 'Save changes'
              : 'Save customer'}
        </Button>
      }
    >
      <FormSection title="Contact">
        <TextField
          label="Full name"
          value={name}
          onChangeText={(text) => setValue('name', text, { shouldValidate: true })}
          placeholder="e.g. Ritu Agarwal"
          error={errors.name?.message}
          autoComplete="name"
        />
        <PhoneInput
          label="Phone number"
          value={phone}
          onChangeText={(text) => setValue('phone', text, { shouldValidate: true })}
          placeholder="98xxx xxxxx"
          error={errors.phone?.message}
        />
        {duplicate ? (
          <View
            accessibilityRole="alert"
            style={styles.duplicate}
          >
            <TriangleAlertIcon
              size={16}
              color={colors.cocoa}
              strokeWidth={1.75}
              style={styles.duplicateIcon}
            />
            <View style={styles.duplicateBody}>
              <Text style={styles.duplicateTitle}>Possible duplicate</Text>
              <Text style={styles.duplicateText}>
                {duplicate.name} ({duplicate.phone}) already has the same{' '}
                {phoneMatch ? 'phone number' : 'name'}.
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() =>
                  router.navigate(`/(tabs)/customers/${duplicate.id}` as never)
                }
                style={styles.duplicateLink}
              >
                <Text style={styles.duplicateLinkText}>
                  View {duplicate.name.split(' ')[0]}&apos;s profile
                </Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </FormSection>

      <FormSection title="More">
        <TextArea
          label="Address"
          optional
          value={address}
          onChangeText={(text) => setValue('address', text)}
          placeholder="Used to pre-fill delivery orders"
        />
        <TextArea
          label="Notes"
          optional
          value={notes}
          onChangeText={(text) => setValue('notes', text)}
          placeholder="Allergies, preferences, birthdays…"
        />
      </FormSection>
    </Screen>
  );
}

const styles = StyleSheet.create({
  duplicate: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderRadius: radius['2xl'],
    backgroundColor: colors.peachSoft,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  duplicateIcon: {
    marginTop: 1,
  },
  duplicateBody: {
    flex: 1,
  },
  duplicateTitle: {
    fontFamily: fontFamily.sansMedium,
    fontWeight: '500',
    fontSize: fontSize.md,
    color: colors.cocoa,
  },
  duplicateText: {
    marginTop: 2,
    fontFamily: fontFamily.sans,
    fontSize: fontSize['sm++'],
    lineHeight: 19,
    color: colors.cocoaSoft,
  },
  duplicateLink: {
    marginTop: 6,
  },
  duplicateLinkText: {
    fontFamily: fontFamily.sansSemiBold,
    fontWeight: '600',
    fontSize: fontSize['sm++'],
    color: colors.cocoa,
    textDecorationLine: 'underline',
  },
});
