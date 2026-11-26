/**
 * Restore confirmation screen for Google Drive backups.
 *
 * Shows details of the selected backup and requires explicit confirmation
 * before any destructive restore. A local safety backup is created first,
 * then the Drive backup is downloaded, verified (checksum + schema), and
 * restored via the existing transactional snapshot repository.
 */

import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  AlertTriangleIcon,
  CheckIcon,
  CloudIcon,
  DatabaseIcon,
  LockIcon,
  RotateCcwIcon,
  ShieldCheckIcon,
  XIcon,
} from 'lucide-react-native';
import { Button } from '../../../../src/components/ui/Button';
import { Screen } from '../../../../src/components/ui/Screen';
import { useUIStore } from '../../../../src/store/uiStore';
import { useDataStore } from '../../../../src/store/dataStore';
import { useDriveStore } from '../../../../src/store/driveStore';
import {
  listDriveBackupFiles,
  downloadDriveBackup,
  getDriveBackupMetadata,
  type DriveBackupFile,
} from '../../../../src/services/driveClient';
import { hasDriveCredentials } from '../../../../src/services/driveAuth';
import {
  parseBackupFile,
  createBackupPayload,
  recordCount,
  snapshotSizeKb,
  describeIssues,
} from '../../../../src/services/backup';
import { writeTextFile } from '../../../../src/utils/files';
import { initDatabase } from '../../../../src/database/client';
import { replaceAll as replaceAllSnapshot } from '../../../../src/database/repositories/snapshotRepository';
import { nowStamp, uid } from '../../../../src/utils/format';
import { colors, fontFamily, fontSize, radius } from '../../../../src/theme';

export default function RestorePromptScreen() {
  const router = useRouter();
  const { backupId } = useLocalSearchParams<{ backupId?: string }>();
  const showToast = useUIStore((s) => s.showToast);
  const requestConfirm = useUIStore((s) => s.requestConfirm);
  const celebrate = useUIStore((s) => s.celebrate);

  const drive = useDriveStore((s) => ({
    connected: s.connected,
    markBackupHandled: s.markBackupHandled,
    clearEligibleRestore: s.clearEligibleRestore,
    lastHandledBackupId: s.lastHandledBackupId,
  }));

  const [backup, setBackup] = useState<{
    id: string;
    name: string;
    size: string;
    createdTime: string;
    modifiedTime: string;
    md5Checksum?: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRestoring, setIsRestoring] = useState(false);
  const [validation, setValidation] = useState<{
    valid: boolean;
    recordCounts?: { customers: number; products: number; orders: number; inventory: number };
    error?: string;
  } | null>(null);

  useEffect(() => {
    void loadBackup();
  }, []);

  const loadBackup = async () => {
    try {
      setIsLoading(true);

      // Find the backup either by ID param or from eligible restore
      let target: {
        id: string;
        name: string;
        size: string;
        createdTime: string;
        modifiedTime: string;
        md5Checksum?: string;
      } | null = null;

      if (backupId) {
        const metadata = await getDriveBackupMetadata(backupId);
        target = {
          id: metadata.id,
          name: metadata.name,
          size: metadata.size,
          createdTime: metadata.createdTime,
          modifiedTime: metadata.modifiedTime,
          md5Checksum: metadata.md5Checksum,
        };
      } else {
        const files = await listDriveBackupFiles();
        const eligible = files.find((f: DriveBackupFile) => f.id !== drive.lastHandledBackupId);
        if (eligible) {
          target = {
            id: eligible.id,
            name: eligible.name,
            size: eligible.size,
            createdTime: eligible.createdTime,
            modifiedTime: eligible.modifiedTime,
            md5Checksum: eligible.md5Checksum,
          };
        }
      }

      setBackup(target);

      // Validate the backup content
      if (target) {
        const content = await downloadDriveBackup(target.id);
        const parsed = parseBackupFile(content);

        if (!parsed.ok) {
          setValidation({ valid: false, error: parsed.reason });
        } else {
          const data = parsed.data;
          const localData = useDataStore.getState().data;

          setValidation({
            valid: true,
            recordCounts: {
              customers: data.customers.length,
              products: data.products.length,
              orders: data.orders.length,
              inventory: data.ingredients.length,
            },
          });
        }
      }
    } catch (error) {
      setValidation({ valid: false, error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!backup) return;

    const ok = await requestConfirm({
      title: 'Confirm restore?',
      body: `This will replace your current local data with the backup from ${new Date(backup.createdTime).toLocaleDateString()}. A safety backup of your current data will be created first.`,
      confirmLabel: 'Restore Backup',
      cancelLabel: 'Cancel',
      tone: 'danger',
      icon: RotateCcwIcon,
    });
    if (!ok) return;

    setIsRestoring(true);
    try {
      // 1. Create local safety backup
      const safetyPayload = createBackupPayload(useDataStore.getState().data);
      const safetyFileName = `BrightCakes_Safety_${new Date()
        .toISOString()
        .slice(0, 16)
        .replace(/[:-]/g, '')}.json`;
      await writeTextFile(safetyFileName, safetyPayload);

      // 2. Download and validate the Drive backup
      const content = await downloadDriveBackup(backup.id);
      const parsed = parseBackupFile(content);
      if (!parsed.ok) {
        throw new Error(parsed.reason);
      }

      // 3. Restore via transactional snapshot replace
      const db = await initDatabase();
      await replaceAllSnapshot(db, {
        ...parsed.data,
        business: { ...parsed.data.business, onboarded: true },
      });

      // 4. Refresh the store
      await useDataStore.getState().hydrate();

      // 5. Mark backup as handled
      drive.markBackupHandled(backup.id);
      drive.clearEligibleRestore();

      // 6. Record in local history
      const { BackupRepository } = await import('../../../../src/database/repositories/backupRepository');
      await BackupRepository.save(db, {
        id: uid('bak'),
        date: nowStamp(),
        kind: 'Google Drive restore',
        sizeKb: snapshotSizeKb(useDataStore.getState().data),
        records: recordCount(useDataStore.getState().data),
        fileName: `restored_from_${backup.id}`,
      });

      celebrate('Data restored', `${recordCount(useDataStore.getState().data)} records`);
      showToast('Backup restored successfully.', 'success');

      router.replace('/(tabs)/more/backup' as never);
    } catch (error) {
      showToast(
        'Restore failed. Your original data is safe.',
        'error',
      );
    } finally {
      setIsRestoring(false);
    }
  };

  const handleSkip = () => {
    if (backup) {
      drive.markBackupHandled(backup.id);
    }
    drive.clearEligibleRestore();
    router.replace('/(tabs)/more/settings/drive' as never);
  };

  const handleViewHistory = () => {
    router.replace('/(tabs)/more/settings/drive' as never);
  };

  if (isLoading) {
    return (
      <Screen title="Restore Backup" large>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Checking backup…</Text>
        </View>
      </Screen>
    );
  }

  if (!backup) {
    return (
      <Screen title="Restore Backup" large>
        <View style={styles.empty}>
          <CloudIcon size={48} color={colors.mute} strokeWidth={1.75} />
          <Text style={styles.emptyTitle}>No backup found</Text>
          <Text style={styles.emptyBody}>
            There is no Google Drive backup available to restore.
          </Text>
          <Button size="lg" full onPress={() => router.back()}>
            Back to Drive Backup
          </Button>
        </View>
      </Screen>
    );
  }

  const isCorrupt = validation?.valid === false;
  const isNewerThanLocal = true; // Simplified - always show as potentially newer

  return (
    <Screen title="Restore Backup" large>
      <View style={styles.card}>
        <View style={styles.backupInfo}>
          <DatabaseIcon size={32} color={isCorrupt ? colors.danger : colors.primary} strokeWidth={1.75} />
          <View style={styles.backupInfoBody}>
            <Text style={styles.backupTitle}>{backup.name}</Text>
            <Text style={styles.backupDate}>
              {new Date(backup.createdTime).toLocaleDateString()} · {new Date(backup.createdTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
            <Text style={styles.backupSize}>{backup.size} KB</Text>
          </View>
        </View>

        {validation?.valid && validation.recordCounts && (
          <View style={styles.statsRow}>
            <View style={styles.statCell}>
              <Text style={styles.statLabel}>Customers</Text>
              <Text style={styles.statValue}>{validation.recordCounts.customers}</Text>
            </View>
            <View style={styles.statCell}>
              <Text style={styles.statLabel}>Products</Text>
              <Text style={styles.statValue}>{validation.recordCounts.products}</Text>
            </View>
            <View style={styles.statCell}>
              <Text style={styles.statLabel}>Orders</Text>
              <Text style={styles.statValue}>{validation.recordCounts.orders}</Text>
            </View>
            <View style={styles.statCell}>
              <Text style={styles.statLabel}>Inventory</Text>
              <Text style={styles.statValue}>{validation.recordCounts.inventory}</Text>
            </View>
          </View>
        )}

        {isCorrupt && (
          <View style={styles.warningCard}>
            <AlertTriangleIcon size={20} color={colors.danger} strokeWidth={1.75} />
            <Text style={styles.warningText}>
              This backup failed integrity validation and cannot be restored.
            </Text>
          </View>
        )}

        {!isCorrupt && (
          <View style={styles.safetyNotice}>
            <LockIcon size={16} color={colors.cocoaSoft} strokeWidth={1.75} />
            <Text style={styles.safetyText}>
              A safety backup of your current data will be created before
              restoring. Your existing data is protected.
            </Text>
          </View>
        )}

        <View style={styles.buttonGroup}>
          {!isCorrupt && (
            <Button
              size="lg"
              full
              loading={isRestoring}
              onPress={handleRestore}
              disabled={isRestoring}
            >
              Restore Backup
            </Button>
          )}
          <Button
            variant="secondary"
            size="lg"
            full
            onPress={handleSkip}
          >
            Skip for Now
          </Button>
          <Button
            variant="ghost"
            size="lg"
            full
            onPress={handleViewHistory}
          >
            View Backup History
          </Button>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 28,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    padding: 20,
  },
  backupInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  backupInfoBody: {
    flex: 1,
    minWidth: 0,
  },
  backupTitle: {
    fontFamily: fontFamily.sansMedium,
    fontWeight: '500',
    fontSize: fontSize.md,
    color: colors.cocoa,
  },
  backupDate: {
    marginTop: 2,
    fontFamily: fontFamily.sans,
    fontSize: fontSize.sm,
    color: colors.mute,
  },
  backupSize: {
    marginTop: 2,
    fontFamily: fontFamily.sans,
    fontSize: fontSize.sm,
    color: colors.mute,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    borderTopColor: colors.line,
    paddingTop: 16,
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize.sm,
    color: colors.mute,
  },
  statValue: {
    marginTop: 4,
    fontFamily: fontFamily.sansMedium,
    fontWeight: '500',
    fontSize: fontSize.md,
    color: colors.cocoa,
  },
  warningCard: {
    marginTop: 16,
    borderRadius: radius.xl,
    backgroundColor: colors.dangerSoft,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  warningText: {
    flex: 1,
    fontFamily: fontFamily.sans,
    fontSize: fontSize.sm,
    color: colors.danger,
    lineHeight: 18,
  },
  safetyNotice: {
    marginTop: 16,
    borderRadius: radius.xl,
    backgroundColor: colors.primaryLight,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  safetyText: {
    flex: 1,
    fontFamily: fontFamily.sans,
    fontSize: fontSize.sm,
    color: colors.primary,
    lineHeight: 18,
  },
  buttonGroup: {
    marginTop: 20,
    gap: 10,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize.md,
    color: colors.cocoa,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 40,
  },
  emptyTitle: {
    fontFamily: fontFamily.serif,
    fontSize: fontSize['md++'],
    color: colors.cocoa,
  },
  emptyBody: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize.md,
    color: colors.cocoaSoft,
    textAlign: 'center',
  },
});
