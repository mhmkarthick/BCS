import React, { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInLeft,
  SlideInRight,
  SlideOutLeft,
  SlideOutRight,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { CheckIcon, ChevronLeftIcon } from 'lucide-react-native';
import { Button } from '../src/components/ui/Button';
import { ChipGroup } from '../src/components/ui/ChipGroup';
import { FieldShell, TextArea, TextField } from '../src/components/ui/Field';
import { Segmented } from '../src/components/ui/Segmented';
import { useDataStore } from '../src/store/dataStore';
import { categoryIcons, weekDays } from '../src/data/labels';
import { IMAGES } from '../src/data/seed';
import type { Fulfilment } from '../src/types';
import { fmtTime, nowStamp, uid } from '../src/utils/format';
import { CURRENCY_OPTIONS, parseToMinor } from '../src/utils/money';
import { colors, duration, easing, fontFamily, radius } from '../src/theme';

const TOTAL = 4;

/**
 * Onboarding.
 *
 * A five-step setup that runs entirely on the device. Every answer is
 * written to the `business` table when the setup is finished, and the
 * optional first product is added to the menu.
 */
export default function OnboardingScreen() {
  const router = useRouter();
  const data = useDataStore((s) => s.data);
  const updateBusiness = useDataStore((s) => s.updateBusiness);
  const upsertProduct = useDataStore((s) => s.upsertProduct);

  const b = data.business;

  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [profile, setProfile] = useState({
    name: b.name,
    owner: b.owner,
    phone: b.phone,
    email: b.email,
    address: b.address,
  });
  const [currency, setCurrency] = useState(b.currency);
  const [hours, setHours] = useState({
    openTime: b.openTime,
    closeTime: b.closeTime,
    workingDays: b.workingDays,
    defaultFulfilment: b.defaultFulfilment,
  });
  const [product, setProduct] = useState({
    name: '',
    categoryId: data.categories[0]?.id ?? 'cat_cakes',
    price: '',
  });
  const [errors, setErrors] = useState<{
    name?: string;
    productName?: string;
    price?: string;
    hours?: string;
  }>({});

  const go = (n: number) => {
    setDir(n > step ? 1 : -1);
    setStep(n);
  };

  const next = () => {
    if (step === 1 && !profile.name.trim()) {
      setErrors({ name: 'Your bakery needs a name' });
      return;
    }
    if (step === 3 && hours.closeTime <= hours.openTime) {
      setErrors({ hours: 'Closing time should be after opening time' });
      return;
    }
    if (step === 4 && (product.name.trim() || product.price)) {
      const e = {
        productName: product.name.trim() ? undefined : 'Name your product',
        price:
          parseToMinor(product.price) > 0 ? undefined : 'Enter a price above ₹0',
      };
      if (e.productName || e.price) {
        setErrors(e);
        return;
      }
    }
    setErrors({});
    go(step + 1);
  };

  const finish = async () => {
    await updateBusiness({
      ...profile,
      name: profile.name.trim(),
      currency,
      ...hours,
      onboarded: true,
    });
    if (product.name.trim() && parseToMinor(product.price) > 0) {
      await upsertProduct({
        id: uid('prd'),
        name: product.name.trim(),
        categoryId: product.categoryId || (data.categories[0]?.id ?? 'cat_cakes'),
        description: '',
        /** Minor units. */
        price: parseToMinor(product.price),
        cost: 0,
        stock: null,
        unit: b.defaultUnit,
        active: true,
        createdAt: nowStamp(),
        updatedAt: nowStamp(),
      });
    }
    router.replace('/(tabs)');
  };

  const skipAll = async () => {
    await updateBusiness({ onboarded: true });
    router.replace('/(tabs)');
  };

  const toggleDay = (d: number) =>
    setHours((h) => ({
      ...h,
      workingDays: h.workingDays.includes(d)
        ? h.workingDays.filter((x) => x !== d)
        : [...h.workingDays, d].sort(),
    }));

  const headings: Record<number, { title: string; body: string }> = {
    1: { title: 'Tell us about your bakery', body: 'This appears on backups and exported reports.' },
    2: { title: 'Which currency do you use?', body: 'All prices and reports will use this.' },
    3: { title: 'When are you open?', body: 'Used to suggest pickup times and plan your calendar.' },
    4: { title: 'Add your first product', body: 'Optional — you can add your full menu later.' },
  };

  return (
    <View style={styles.root}>
      {step > 0 && step < 5 ? (
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={() => go(step - 1)}
            style={({ pressed }) => [
              styles.backButton,
              pressed && { backgroundColor: colors.sand },
            ]}
          >
            <ChevronLeftIcon size={24} color={colors.cocoa} strokeWidth={1.75} />
          </Pressable>

          <View
            style={styles.progress}
            accessibilityLabel={`Setup progress, step ${step} of ${TOTAL}`}
          >
            {Array.from({ length: TOTAL }, (_, i) => (
              <ProgressSegment key={i} index={i} step={step} />
            ))}
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Skip setup"
            onPress={() => void skipAll()}
            style={({ pressed }) => [
              styles.skipButton,
              pressed && { opacity: 0.6 },
            ]}
          >
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.body}>
        {step === 0 ? (
          <Animated.View
            entering={FadeIn.duration(duration.normal)}
            exiting={FadeOut.duration(duration.fast)}
            style={styles.welcome}
          >
            <View style={styles.welcomeImage}>
              <Image
                source={IMAGES.welcome}
                accessibilityLabel="A baker dusting sugar over a layered cake"
                contentFit="cover"
                transition={220}
                style={styles.welcomeImageInner}
              />
            </View>
            <View style={styles.welcomeText}>
              <Text style={styles.welcomeEyebrow}>Bright Cakes & Snacks</Text>
              <Text style={styles.welcomeTitle}>
                Your bakery, beautifully organised.
              </Text>
              <Text style={styles.welcomeBody}>
                Orders, customers, payments and stock — kept privately on this
                phone. No account. No internet needed.
              </Text>
              <Button
                size="lg"
                full
                style={styles.welcomePrimary}
                onPress={() => go(1)}
              >
                Set up my bakery
              </Button>
              <Button
                size="lg"
                variant="ghost"
                full
                onPress={() => void skipAll()}
              >
                Skip for now
              </Button>
            </View>
          </Animated.View>
        ) : null}

        {step >= 1 && step <= 4 ? (
          <Animated.View
            key={step}
            entering={dir > 0 ? SlideInLeft.duration(duration.normal) : SlideInRight.duration(duration.normal)}
            exiting={dir > 0 ? SlideOutRight.duration(duration.fast) : SlideOutLeft.duration(duration.fast)}
            style={styles.step}
          >
            <ScrollView
              style={styles.stepScroll}
              contentContainerStyle={styles.stepContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.stepTitle}>{headings[step].title}</Text>
              <Text style={styles.stepBody}>{headings[step].body}</Text>

              <View style={styles.stepFields}>
                {step === 1 ? (
                  <>
                    <TextField
                      label="Business name"
                      value={profile.name}
                      onChangeText={(text) =>
                        setProfile({ ...profile, name: text })
                      }
                      error={errors.name}
                    />
                    <TextField
                      label="Your name"
                      optional
                      value={profile.owner}
                      onChangeText={(text) =>
                        setProfile({ ...profile, owner: text })
                      }
                    />
                    <TextField
                      label="Phone"
                      optional
                      keyboardType="phone-pad"
                      value={profile.phone}
                      onChangeText={(text) =>
                        setProfile({ ...profile, phone: text })
                      }
                    />
                    <TextField
                      label="Email"
                      optional
                      keyboardType="email-address"
                      value={profile.email}
                      onChangeText={(text) =>
                        setProfile({ ...profile, email: text })
                      }
                    />
                    <TextArea
                      label="Address"
                      optional
                      value={profile.address}
                      onChangeText={(text) =>
                        setProfile({ ...profile, address: text })
                      }
                    />
                  </>
                ) : null}

                {step === 2 ? (
                  <View style={styles.currencyList}>
                    {CURRENCY_OPTIONS.map((c) => (
                      <Pressable
                        key={c.code}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: currency === c.code }}
                        accessibilityLabel={c.label}
                        onPress={() => setCurrency(c.code)}
                        style={({ pressed }) => [
                          styles.currencyRow,
                          pressed && { backgroundColor: colors.sand },
                        ]}
                      >
                        <View style={styles.currencySymbol}>
                          <Text style={styles.currencySymbolText}>{c.symbol}</Text>
                        </View>
                        <View style={styles.currencyBody}>
                          <Text style={styles.currencyLabel}>{c.label}</Text>
                          <Text style={styles.currencyCode}>
                            {c.code === 'INR'
                              ? 'Recommended · ₹1,25,000 format'
                              : c.code}
                          </Text>
                        </View>
                        {currency === c.code ? (
                          <CheckIcon size={20} color={colors.cocoa} strokeWidth={2} />
                        ) : null}
                      </Pressable>
                    ))}
                  </View>
                ) : null}

                {step === 3 ? (
                  <>
                    <View style={styles.twoCol}>
                      <View style={styles.flex}>
                        <TextField
                          label="Opens at"
                          value={hours.openTime}
                          onChangeText={(text) =>
                            setHours({ ...hours, openTime: text })
                          }
                          placeholder="09:00"
                        />
                      </View>
                      <View style={styles.flex}>
                        <TextField
                          label="Closes at"
                          value={hours.closeTime}
                          onChangeText={(text) =>
                            setHours({ ...hours, closeTime: text })
                          }
                          placeholder="20:00"
                          error={errors.hours}
                        />
                      </View>
                    </View>

                    <FieldShell
                      id="ob-days"
                      label="Working days"
                      hint={`${hours.workingDays.length} days · ${fmtTime(
                        hours.openTime,
                      )} – ${fmtTime(hours.closeTime)}`}
                    >
                      <View style={styles.days}>
                        {weekDays.map((d, i) => {
                          const on = hours.workingDays.includes(i);
                          return (
                            <Pressable
                              key={d}
                              accessibilityRole="checkbox"
                              accessibilityState={{ checked: on }}
                              accessibilityLabel={d}
                              onPress={() => toggleDay(i)}
                              style={[
                                styles.day,
                                on ? styles.dayOn : styles.dayOff,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.dayText,
                                  on ? styles.dayTextOn : styles.dayTextOff,
                                ]}
                              >
                                {d.slice(0, 2)}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </FieldShell>

                    <FieldShell id="ob-ful" label="Most orders are">
                      <Segmented<Fulfilment>
                        ariaLabel="Default fulfilment"
                        options={[
                          { value: 'pickup', label: 'Picked up' },
                          { value: 'delivery', label: 'Delivered' },
                        ]}
                        value={hours.defaultFulfilment}
                        onChange={(v) =>
                          setHours({ ...hours, defaultFulfilment: v })
                        }
                      />
                    </FieldShell>
                  </>
                ) : null}

                {step === 4 ? (
                  <>
                    <TextField
                      label="Product name"
                      value={product.name}
                      onChangeText={(text) =>
                        setProduct({ ...product, name: text })
                      }
                      placeholder="e.g. Chocolate Truffle Cake"
                      error={errors.productName}
                    />
                    <FieldShell id="ob-cat" label="Category">
                      <ChipGroup
                        ariaLabel="Category"
                        options={data.categories.map((c) => ({
                          value: c.id,
                          label: c.name,
                          icon: categoryIcons[c.icon],
                        }))}
                        value={product.categoryId}
                        onChange={(v) => setProduct({ ...product, categoryId: v })}
                      />
                    </FieldShell>
                    <TextField
                      label="Selling price"
                      prefix="₹"
                      keyboardType="decimal-pad"
                      value={product.price}
                      onChangeText={(text) =>
                        setProduct({ ...product, price: text })
                      }
                      placeholder="0"
                      error={errors.price}
                    />
                  </>
                ) : null}
              </View>
            </ScrollView>

            <View style={styles.stepFooter}>
              <Button size="lg" full onPress={next}>
                {step === 4
                  ? product.name.trim()
                    ? 'Add & continue'
                    : 'Continue without a product'
                  : 'Continue'}
              </Button>
            </View>
          </Animated.View>
        ) : null}

        {step === 5 ? (
          <Animated.View
            entering={FadeIn.duration(duration.normal)}
            style={styles.done}
          >
            <View style={styles.doneBody}>
              <View style={styles.doneMark}>
                <CheckIcon size={40} color={colors.sageDeep} strokeWidth={2} />
              </View>
              <Text style={styles.doneTitle}>
                You&apos;re all set
                {profile.owner ? `, ${profile.owner.split(' ')[0]}` : ''}.
              </Text>
              <Text style={styles.doneText}>
                {profile.name || 'Your bakery'} is ready. Everything you add is
                saved instantly on this phone.
              </Text>

              <View style={styles.summary}>
                <SummaryRow label="Currency" value={currency} />
                <SummaryRow
                  label="Hours"
                  value={`${fmtTime(hours.openTime)} – ${fmtTime(hours.closeTime)}`}
                />
                <SummaryRow
                  label="First product"
                  value={product.name.trim() || 'Add later'}
                />
              </View>
            </View>

            <Button size="lg" full onPress={() => void finish()}>
              Open my dashboard
            </Button>
          </Animated.View>
        ) : null}
      </View>
    </View>
  );
}

/** One segment of the setup progress bar. */
function ProgressSegment({ index, step }: { index: number; step: number }) {
  const progress = useSharedValue(index < step ? 1 : 0);

  useEffect(() => {
    progress.set(
      withTiming(index < step ? 1 : 0, {
        duration: duration.normal,
        easing: easing.out,
      }),
    );
  }, [index, step, progress]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scaleX: progress.get() }],
  }));

  return (
    <View style={styles.segmentTrack}>
      <Animated.View style={[styles.segmentFill, style]} />
    </View>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.ivory,
  },
  header: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
  },
  backButton: {
    height: 40,
    width: 40,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progress: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
  },
  segmentTrack: {
    flex: 1,
    height: 4,
    overflow: 'hidden',
    borderRadius: 2,
    backgroundColor: colors.line,
  },
  segmentFill: {
    flex: 1,
    backgroundColor: colors.cocoa,
  },
  skipButton: {
    height: 40,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  skipText: {
    fontFamily: fontFamily.sansMedium,
    fontWeight: '500',
    fontSize: 14,
    color: colors.mute,
  },
  body: {
    flex: 1,
  },
  welcome: {
    flex: 1,
  },
  welcomeImage: {
    flex: 1,
    minHeight: 0,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 32,
    overflow: 'hidden',
    backgroundColor: colors.sand,
  },
  welcomeImageInner: {
    width: '100%',
    height: '100%',
  },
  welcomeText: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 32,
  },
  welcomeEyebrow: {
    fontFamily: fontFamily.sansMedium,
    fontWeight: '500',
    fontSize: 13,
    color: colors.mute,
  },
  welcomeTitle: {
    marginTop: 8,
    fontFamily: fontFamily.serif,
    fontSize: 36,
    lineHeight: 38,
    letterSpacing: -0.36,
    color: colors.cocoa,
  },
  welcomeBody: {
    marginTop: 12,
    fontFamily: fontFamily.sans,
    fontSize: 15,
    lineHeight: 22,
    color: colors.cocoaSoft,
  },
  welcomePrimary: {
    marginTop: 28,
  },
  step: {
    flex: 1,
  },
  stepScroll: {
    flex: 1,
  },
  stepContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
  },
  stepTitle: {
    fontFamily: fontFamily.serif,
    fontSize: 32,
    lineHeight: 35,
    color: colors.cocoa,
  },
  stepBody: {
    marginTop: 8,
    fontFamily: fontFamily.sans,
    fontSize: 14.5,
    lineHeight: 20,
    color: colors.mute,
  },
  stepFields: {
    marginTop: 28,
    gap: 16,
  },
  stepFooter: {
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    borderTopColor: colors.line,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
  },
  currencyList: {
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    overflow: 'hidden',
  },
  currencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
    borderBottomColor: colors.line,
  },
  currencySymbol: {
    height: 36,
    width: 36,
    borderRadius: radius.xl,
    backgroundColor: colors.sand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currencySymbolText: {
    fontFamily: fontFamily.sansSemiBold,
    fontWeight: '600',
    fontSize: 15,
    color: colors.cocoa,
  },
  currencyBody: {
    flex: 1,
  },
  currencyLabel: {
    fontFamily: fontFamily.sans,
    fontSize: 15,
    color: colors.cocoa,
  },
  currencyCode: {
    fontFamily: fontFamily.sans,
    fontSize: 12.5,
    color: colors.mute,
  },
  twoCol: {
    flexDirection: 'row',
    gap: 12,
  },
  flex: {
    flex: 1,
  },
  days: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  day: {
    height: 44,
    width: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayOn: {
    backgroundColor: colors.cocoa,
  },
  dayOff: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
  },
  dayText: {
    fontFamily: fontFamily.sansMedium,
    fontWeight: '500',
    fontSize: 13,
  },
  dayTextOn: {
    color: colors.ivory,
  },
  dayTextOff: {
    color: colors.mute,
  },
  done: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  doneBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneMark: {
    height: 80,
    width: 80,
    borderRadius: 40,
    backgroundColor: colors.sageSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneTitle: {
    marginTop: 28,
    fontFamily: fontFamily.serif,
    fontSize: 34,
    lineHeight: 38,
    color: colors.cocoa,
    textAlign: 'center',
  },
  doneText: {
    marginTop: 12,
    maxWidth: 290,
    fontFamily: fontFamily.sans,
    fontSize: 15,
    lineHeight: 22,
    color: colors.cocoaSoft,
    textAlign: 'center',
  },
  summary: {
    marginTop: 32,
    width: '100%',
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    paddingHorizontal: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
    borderBottomColor: colors.line,
    paddingVertical: 12,
  },
  summaryLabel: {
    fontFamily: fontFamily.sans,
    fontSize: 14,
    color: colors.mute,
  },
  summaryValue: {
    fontFamily: fontFamily.sans,
    fontSize: 14,
    color: colors.cocoa,
  },
});
