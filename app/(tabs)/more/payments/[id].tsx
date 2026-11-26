import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ClipboardListIcon, Trash2Icon, WalletIcon } from 'lucide-react-native';
import { Avatar } from '../../../../src/components/ui/Avatar';
import { Button } from '../../../../src/components/ui/Button';
import { EmptyState } from '../../../../src/components/ui/EmptyState';
import { InfoRow, NavRow, RowGroup } from '../../../../src/components/ui/NavRow';
import { Screen } from '../../../../src/components/ui/Screen';
import { useDataStore } from '../../../../src/store/dataStore';
import { useUIStore } from '../../../../src/store/uiStore';
import { methodLabel, paymentKindLabel, paymentMethodIcons } from '../../../../src/data/labels';
import { useLookups } from '../../../../src/hooks/useLookups';
import { fmtDate } from '../../../../src/utils/format';
import { inr } from '../../../../src/utils/money';
import { colors, fontFamily, radius } from '../../../../src/theme';

/** Payment detail — amount, method, links back to the customer and order. */
export default function PaymentDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const data = useDataStore((s) => s.data);
  const removePayment = useDataStore((s) => s.removePayment);
  const showToast = useUIStore((s) => s.showToast);
  const requestConfirm = useUIStore((s) => s.requestConfirm);
  const l = useLookups();

  const payment = data.payments.find((p) => p.id === id);

  if (!payment) {
    return (
      <Screen title="Payment">
        <EmptyState
          icon={WalletIcon}
          title="Payment not found"
          body="It may have been deleted from this device."
        />
      </Screen>
    );
  }

  const customer = l.customer(payment.customerId);
  const order = l.order(payment.orderId);
  const Icon = paymentMethodIcons[payment.method];

  const del = async () => {
    const ok = await requestConfirm({
      title: 'Delete this payment?',
      body: order
        ? `${order.number} will show ${inr(payment.amount)} more as outstanding.`
        : 'This record will be removed from your history.',
      confirmLabel: 'Delete payment',
      tone: 'danger',
      icon: Trash2Icon,
    });
    if (!ok) return;
    await removePayment(payment.id);
    showToast('Payment deleted', 'info');
    router.back();
  };

  return (
    <Screen title="Payment">
      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Icon size={24} color={colors.sageDeep} strokeWidth={1.75} />
        </View>
        <Text style={styles.heroAmount}>{inr(payment.amount)}</Text>
        <Text style={styles.heroMeta}>
          {paymentKindLabel[payment.kind]} ·{' '}
          {fmtDate(payment.date, 'EEEE, d MMM yyyy')}
        </Text>
      </View>

      <View style={styles.card}>
        <InfoRow label="Method" value={methodLabel(payment.method)} />
        <InfoRow label="Type" value={paymentKindLabel[payment.kind]} />
        <InfoRow label="Date" value={fmtDate(payment.date)} />
        {payment.note ? <InfoRow label="Note" value={payment.note} /> : null}
      </View>

      <View style={styles.links}>
        <RowGroup>
          {customer ? (
            <NavRow
              label={customer.name}
              description={customer.phone}
              onClick={() =>
                router.navigate(`/(tabs)/customers/${customer.id}` as never)
              }
              trailing={<Avatar name={customer.name} size={32} />}
            />
          ) : null}
          {order ? (
            <NavRow
              icon={ClipboardListIcon}
              label={`Order ${order.number}`}
              description={`Due ${fmtDate(order.dueDate, 'd MMM')}`}
              onClick={() =>
                router.navigate(`/(tabs)/orders/${order.id}` as never)
              }
            />
          ) : null}
        </RowGroup>
      </View>

      <View style={styles.deleteWrap}>
        <Button variant="dangerGhost" icon={Trash2Icon} onPress={() => void del()}>
          Delete payment
        </Button>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
  },
  heroIcon: {
    height: 56,
    width: 56,
    borderRadius: 28,
    backgroundColor: colors.sageSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroAmount: {
    marginTop: 20,
    fontFamily: fontFamily.sansLight,
    fontSize: 48,
    lineHeight: 50,
    letterSpacing: -1.4,
    color: colors.cocoa,
  },
  heroMeta: {
    marginTop: 8,
    fontFamily: fontFamily.sans,
    fontSize: 14,
    color: colors.mute,
    textAlign: 'center',
  },
  card: {
    marginHorizontal: 16,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    paddingHorizontal: 16,
  },
  links: {
    marginTop: 24,
  },
  deleteWrap: {
    marginTop: 32,
    alignItems: 'center',
  },
});
