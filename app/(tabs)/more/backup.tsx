import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { formatDistanceToNowStrict } from 'date-fns';
import {
  CakeSliceIcon,
  ChartColumnIcon,
  ClipboardListIcon,
  DatabaseBackupIcon,
  FileTextIcon,
  ReceiptIcon,
  RotateCcwIcon,
  ShieldCheckIcon,
  SmartphoneIcon,
  UsersIcon,
  WalletIcon,
  type LucideIcon,
} from 'lucide-react-native';
import { Button } from '../../../src/components/ui/Button';
import { NavRow, RowGroup } from '../../../src/components/ui/NavRow';
import { Screen } from '../../../src/components/ui/Screen';
import { useDataStore } from '../../../src/store/dataStore';
import { useUIStore } from '../../../src/store/uiStore';
import { expenseMeta, methodLabel, statusMeta } from '../../../src/data/labels';
import { orderTotal } from '../../../src/utils/calc';
import { fmtStamp, nowStamp, todayISO, uid } from '../../../src/utils/format';

import {
  pickDocument,
  readFileAsText,
  shareFile,
  toCSV,
  writeTextFile,
} from '../../../src/utils/files';
import {
  createBackupPayload,
  dailySummaryRows,
  parseBackupFile,
  recordCount,
  snapshotSizeKb,
} from '../../../src/services/backup';

import { colors, fontFamily, radius } from '../../../src/theme';

/**
 * Backup & restore.
 *
 * A backup is a JSON file created on the phone and handed to the system share
 * sheet — nothing is uploaded anywhere. Restoring always asks first and
 * validates the file before a single row is written.
 */
export default function BackupScreen() {
  const data = useDataStore((s) => s.data);
  const upsertBackup = useDataStore((s) => s.upsertBackup);
  const replaceAll = useDataStore((s) => s.replaceAll);
  const showToast = useUIStore((s) => s.showToast);
  const requestConfirm = useUIStore((s) => s.requestConfirm);
  const celebrate = useUIStore((s) => s.celebrate);

  const total = recordCount(data);
  const sizeKb = snapshotSizeKb(data);

  const history = useMemo(
    () => [...data.backups].sort((a, b) => b.date.localeCompare(a.date)),
    [data.backups],
  );
  const last = history.find((b) => b.kind === 'Full backup');

  const createBackup = async () => {
    const ok = await requestConfirm({
      title: 'Create a backup?',
      body: `One file with all ${total} records will be created. Save it to Files or Drive, or send it to yourself — it never leaves your phone otherwise.`,
      confirmLabel: 'Create backup',
      icon: DatabaseBackupIcon,
    });
    if (!ok) return;

    try {
      const fileName = `bright-cakes-backup-${todayISO()}.json`;
      const payload = createBackupPayload(data);
      const file = await writeTextFile(fileName, payload);
      await shareFile(file, 'application/json', 'Bright Cakes backup');
      await upsertBackup({
        id: uid('bak'),
        date: nowStamp(),
        kind: 'Full backup',
        sizeKb,
        records: total,
        fileName,
      });
      celebrate('Backup created', fileName);
    } catch {
      showToast('The backup could not be created', 'error');
    }
  };

  const restore = async () => {
    let picked: { name: string; uri: string } | null = null;
    try {
      picked = await pickDocument(['application/json', 'text/plain', '*/*']);
    } catch {
      showToast('That file could not be opened', 'error');
      return;
    }
    if (!picked) return;

    let text: string;
    try {
      text = await readFileAsText(picked.uri);
    } catch {
      showToast('That file could not be read', 'error');
      return;
    }

    const parsed = parseBackupFile(text);
    if (!parsed.ok) {
      showToast(parsed.reason, 'error');
      return;
    }

    const incoming = parsed.data;

    // Check schema version compatibility if present in the backup.
    const envelope = JSON.parse(text) as { schemaVersion?: number };
    if (envelope.schemaVersion !== undefined && envelope.schemaVersion > 2) {
      showToast(
        'This backup requires a newer version of Bright Cakes & Snacks.',
        'error',
      );
      return;
    }

    const ok = await requestConfirm({
      title: 'Replace all data?',
      body: `This replaces the ${total} records on this phone with ${recordCount(
        incoming,
      )} records from “${picked.name}”. Anything added since that backup will be lost.`,
      confirmLabel: 'Replace & restore',
      cancelLabel: 'Keep current data',
      tone: 'danger',
      icon: RotateCcwIcon,
    });
    if (!ok) return;

    try {
      // Create a local safety backup before any destructive operation.
      const safetyPayload = createBackupPayload(data);
      const safetyFile = await writeTextFile(
        `BrightCakes_Safety_${new Date().toISOString().slice(0, 16).replace(/[:-]/g, '')}.json`,
        safetyPayload,
      );

      // Verify the safety backup is valid by re-reading it.
      const safetyText = await readFileAsText(safetyFile.uri);
      const safetyParsed = parseBackupFile(safetyText);
      if (!safetyParsed.ok) {
        throw new Error('Safety backup verification failed.');
      }

      // Restore via transactional snapshot replace.
      await replaceAll({
        ...incoming,
        business: { ...incoming.business, onboarded: true },
      });

      celebrate(
        'Data restored',
        `${recordCount(incoming)} records loaded`,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'The backup could not be restored';
      showToast(message, 'error');
    }
  };

  const exportCsv = async (
    kind: string,
    fileBase: string,
    rows: Record<string, string | number | undefined>[],
  ) => {
    if (!rows.length) {
      showToast(`No ${kind.toLowerCase()} to export yet`, 'info');
      return;
    }
    try {
      const fileName = `${fileBase}-${todayISO()}.csv`;
      const csv = toCSV(rows);
      const file = await writeTextFile(fileName, csv);
      await shareFile(file, 'text/csv', `${kind} export`);
      await upsertBackup({
        id: uid('bak'),
        date: nowStamp(),
        kind: `${kind} export`,
        sizeKb: Math.max(1, Math.ceil(csv.length / 1024)),
        records: rows.length,
        fileName,
      });
      showToast(`${kind} exported`);
    } catch {
      showToast(`${kind} could not be exported`, 'error');
    }
  };

  const customerName = (id?: string) =>
    data.customers.find((c) => c.id === id)?.name ?? '';

  const exports: {
    label: string;
    icon: LucideIcon;
    count?: number;
    run: () => void;
  }[] = [
    {
      label: 'Customers',
      icon: UsersIcon,
      count: data.customers.length,
      run: () =>
        exportCsv(
          'Customers',
          'customers',
          data.customers.map((c) => ({
            name: c.name,
            phone: c.phone,
            address: c.address,
            notes: c.notes,
          })),
        ),
    },
    {
      label: 'Products',
      icon: CakeSliceIcon,
      count: data.products.length,
      run: () =>
        exportCsv(
          'Products',
          'products',
          data.products.map((p) => ({
            name: p.name,
            price: p.price,
            cost: p.cost,
            unit: p.unit,
            stock: p.stock ?? '',
            active: p.active ? 'yes' : 'no',
          })),
        ),
    },
    {
      label: 'Orders',
      icon: ClipboardListIcon,
      count: data.orders.length,
      run: () =>
        exportCsv(
          'Orders',
          'orders',
          data.orders.map((o) => ({
            number: o.number,
            customer: customerName(o.customerId),
            ordered: o.orderDate,
            due: o.dueDate,
            time: o.dueTime,
            status: statusMeta[o.status].label,
            total: orderTotal(o),
            items: o.items.map((i) => `${i.qty}x ${i.name}`).join('; '),
          })),
        ),
    },
    {
      label: 'Expenses',
      icon: ReceiptIcon,
      count: data.expenses.length,
      run: () =>
        exportCsv(
          'Expenses',
          'expenses',
          data.expenses.map((e) => ({
            date: e.date,
            title: e.title,
            category: expenseMeta(e.category).label,
            amount: e.amount,
            method: methodLabel(e.method),
            notes: e.notes,
          })),
        ),
    },
    {
      label: 'Payments',
      icon: WalletIcon,
      count: data.payments.length,
      run: () =>
        exportCsv(
          'Payments',
          'payments',
          data.payments.map((p) => ({
            date: p.date,
            customer: customerName(p.customerId),
            amount: p.amount,
            method: methodLabel(p.method),
            type: p.kind,
            order: data.orders.find((o) => o.id === p.orderId)?.number,
          })),
        ),
    },
    {
      label: 'Reports',
      icon: ChartColumnIcon,
      run: () => exportCsv('Reports', 'daily-summary', dailySummaryRows(data)),
    },
  ];

  return (
    <Screen
      title="Backup & Restore"
      large
      subtitle="Your data lives only on this phone. Keep a copy somewhere safe."
    >
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.shield}>
            <ShieldCheckIcon size={22} color={colors.sageDeep} strokeWidth={1.75} />
          </View>
          <View style={styles.cardTopBody}>
            <Text style={styles.cardTitle}>
              {last
                ? `Last backup ${formatDistanceToNowStrict(new Date(last.date))} ago`
                : 'No backup yet'}
            </Text>
            <Text style={styles.cardMeta}>
              {last ? fmtStamp(last.date) : 'Create one to protect your records'}
            </Text>
          </View>
        </View>

        <View style={styles.stats}>
          <View style={styles.statCell}>
            <Text style={styles.statLabel}>Records on device</Text>
            <Text style={styles.statValue}>{total}</Text>
          </View>
          <View style={styles.statCellRight}>
            <Text style={styles.statLabel}>Database size</Text>
            <Text style={styles.statValue}>{sizeKb} KB</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <Button
            size="lg"
            full
            icon={DatabaseBackupIcon}
            onPress={() => void createBackup()}
          >
            Create backup
          </Button>
          <Button
            size="lg"
            variant="secondary"
            full
            icon={RotateCcwIcon}
            onPress={() => void restore()}
          >
            Restore from file
          </Button>
        </View>
      </View>

      <View style={styles.notice}>
        <SmartphoneIcon
          size={14}
          color={colors.mute}
          strokeWidth={1.75}
          style={styles.noticeIcon}
        />
        <Text style={styles.noticeText}>
          Files are created on this phone and shared with your device&apos;s own
          share sheet. Restoring replaces existing records — you&apos;ll always
          be asked first.
        </Text>
      </View>

      <View style={styles.groupSpacer}>
        <RowGroup title="Export as spreadsheet">
          {exports.map((x) => (
            <NavRow
              key={x.label}
              icon={x.icon}
              label={x.label}
              value={x.count !== undefined ? String(x.count) : 'Last 30 days'}
              onClick={x.run}
            />
          ))}
        </RowGroup>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>History</Text>
        {history.length === 0 ? (
          <Text style={styles.emptyNote}>
            Backups and exports you create will be listed here.
          </Text>
        ) : (
          <View style={styles.history}>
            {history.map((b) => (
              <View key={b.id} style={styles.historyRow}>
                <View style={styles.historyIcon}>
                  {b.kind === 'Full backup' ? (
                    <DatabaseBackupIcon
                      size={16}
                      color={colors.cocoa}
                      strokeWidth={1.75}
                    />
                  ) : (
                    <FileTextIcon
                      size={16}
                      color={colors.cocoa}
                      strokeWidth={1.75}
                    />
                  )}
                </View>
                <View style={styles.historyBody}>
                  <Text style={styles.historyTitle}>{b.kind}</Text>
                  <Text numberOfLines={1} style={styles.historyFile}>
                    {b.fileName}
                  </Text>
                </View>
                <View style={styles.historyMeta}>
                  <Text style={styles.historyDate}>{fmtStamp(b.date)}</Text>
                  <Text style={styles.historySize}>
                    {b.records} records · {b.sizeKb} KB
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    padding: 20,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  shield: {
    height: 44,
    width: 44,
    borderRadius: radius['2xl'],
    backgroundColor: colors.sageSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTopBody: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    fontFamily: fontFamily.sansMedium,
    fontWeight: '500',
    fontSize: 15,
    color: colors.cocoa,
  },
  cardMeta: {
    marginTop: 2,
    fontFamily: fontFamily.sans,
    fontSize: 13,
    color: colors.mute,
  },
  stats: {
    marginTop: 20,
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    borderTopColor: colors.line,
    paddingTop: 16,
  },
  statCell: {
    flex: 1,
  },
  statCellRight: {
    flex: 1,
    borderLeftWidth: StyleSheet.hairlineWidth * 2,
    borderLeftColor: colors.line,
    paddingLeft: 16,
  },
  statLabel: {
    fontFamily: fontFamily.sans,
    fontSize: 12.5,
    color: colors.mute,
  },
  statValue: {
    marginTop: 2,
    fontFamily: fontFamily.sansMedium,
    fontWeight: '500',
    fontSize: 18,
    color: colors.cocoa,
  },
  actions: {
    marginTop: 20,
    gap: 8,
  },
  notice: {
    marginHorizontal: 20,
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  noticeIcon: {
    marginTop: 2,
  },
  noticeText: {
    flex: 1,
    fontFamily: fontFamily.sans,
    fontSize: 12.5,
    lineHeight: 18,
    color: colors.mute,
  },
  groupSpacer: {
    marginTop: 32,
  },
  section: {
    marginTop: 32,
  },
  sectionTitle: {
    paddingHorizontal: 20,
    paddingBottom: 10,
    fontFamily: fontFamily.serif,
    fontSize: 21,
    lineHeight: 24,
    color: colors.cocoa,
  },
  emptyNote: {
    marginHorizontal: 20,
    borderRadius: radius['2xl'],
    backgroundColor: colors.sand,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontFamily: fontFamily.sans,
    fontSize: 14,
    color: colors.mute,
  },
  history: {
    marginHorizontal: 20,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
    borderBottomColor: colors.line,
    paddingVertical: 12,
  },
  historyIcon: {
    height: 36,
    width: 36,
    borderRadius: radius.xl,
    backgroundColor: colors.sand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyBody: {
    flex: 1,
    minWidth: 0,
  },
  historyTitle: {
    fontFamily: fontFamily.sans,
    fontSize: 14.5,
    color: colors.cocoa,
  },
  historyFile: {
    fontFamily: fontFamily.sans,
    fontSize: 12.5,
    color: colors.mute,
  },
  historyMeta: {
    alignItems: 'flex-end',
  },
  historyDate: {
    fontFamily: fontFamily.sans,
    fontSize: 13,
    color: colors.cocoaSoft,
  },
  historySize: {
    fontFamily: fontFamily.sans,
    fontSize: 12,
    color: colors.mute,
  },
});
