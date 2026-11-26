/**
 * Google Drive Backup settings screen.
 *
 * Optional opt-in feature for backing up application data to the user's
 * Google Drive appData folder. The app remains fully functional without it.
 *
 * UI is consistent with the existing settings design tokens: white
 * backgrounds, red primary actions, dark brown headings.
 */

import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useAuthRequest } from 'expo-auth-session';
import {
  CloudIcon,
  DatabaseIcon,
  HardDriveIcon,
  LockIcon,
  RefreshCwIcon,
  RotateCcwIcon,
  ShieldCheckIcon,
  Trash2Icon,
  UserIcon,
  XIcon,
} from 'lucide-react-native';
import { Button } from '../../../../src/components/ui/Button';
import { NavRow, RowGroup } from '../../../../src/components/ui/NavRow';
import { Screen } from '../../../../src/components/ui/Screen';
import { ToggleRow } from '../../../../src/components/ui/Toggle';
import { useDataStore } from '../../../../src/store/dataStore';
import { useUIStore } from '../../../../src/store/uiStore';
import { useDriveStore } from '../../../../src/store/driveStore';
import {
  createAuthRequest,
  hasDriveCredentials,
  getConnectedAccount,
  clearCredentials,
  revokeAccess,
} from '../../../../src/services/driveAuth';
import { listDriveBackupFiles, type DriveBackupFile } from '../../../../src/services/driveClient';
import {
  triggerManualBackup,
  onBackupStatusChange,
} from '../../../../src/services/backupService';
import { colors, fontFamily, fontSize, radius } from '../../../../src/theme';

WebBrowser.maybeCompleteAuthSession();

export default function DriveBackupScreen() {
  const router = useRouter();
  const { section } = useLocalSearchParams<{ section?: string }>();
  const showToast = useUIStore((s) => s.showToast);
  const requestConfirm = useUIStore((s) => s.requestConfirm);
  const celebrate = useUIStore((s) => s.celebrate);

  const drive = useDriveStore((s) => ({
    connected: s.connected,
    accountEmail: s.accountEmail,
    accountName: s.accountName,
    connectedAt: s.connectedAt,
    jobs: s.jobs,
    latestJob: s.latestJob,
    driveBackups: s.driveBackups,
    checking: s.checking,
    lastChecked: s.lastChecked,
    autoBackupEnabled: s.autoBackupEnabled,
    eligibleRestore: s.eligibleRestore,
    lastHandledBackupId: s.lastHandledBackupId,
    setAuthStatus: s.setAuthStatus,
    setAutoBackup: s.setAutoBackup,
    markBackupHandled: s.markBackupHandled,
    clearEligibleRestore: s.clearEligibleRestore,
    disconnect: s.disconnect,
    checkForBackups: s.checkForBackups,
    listBackups: s.listBackups,
    refreshStatus: s.refreshStatus,
  }));

  const [isConnecting, setIsConnecting] = useState(false);
  const [authResult, setAuthResult] = useState<{
    type: 'success' | 'cancel' | 'error';
    params?: Record<string, string>;
  } | null>(null);

  // --- OAuth flow ----------------------------------------------------------

  const [request, response, promptAsync] = useAuthRequest(createAuthRequest(), null);

  useEffect(() => {
    if (response) {
      handleAuthResponse(response);
    }
  }, [response]);

  const handleAuthResponse = async (response: {
    type: string;
    params?: Record<string, string>;
  }) => {
    setIsConnecting(false);

    if (response.type === 'success' && response.params) {
      const { access_token, refresh_token } = response.params;

      // Get user info from Google
      try {
        const userInfo = await fetch(
          'https://www.googleapis.com/oauth2/v2/userinfo',
          { headers: { Authorization: `Bearer ${access_token}` } },
        );
        let email = null;
        let name = null;
        if (userInfo.ok) {
          const info = await userInfo.json();
          email = info.email;
          name = info.name;
        }

        // Store credentials
        const { storeCredentials } = await import('../../../../src/services/driveAuth');
        await storeCredentials({
          accessToken: access_token,
          refreshToken: refresh_token ?? undefined,
          email,
          name,
        });

        drive.setAuthStatus('authorized');
        await drive.refreshStatus();
        await drive.checkForBackups();
        celebrate('Google Drive connected', 'Automatic backups enabled.');
        showToast('Google Drive connected.', 'success');
      } catch {
        showToast('Connected but could not load account info.', 'info');
        drive.setAuthStatus('authorized');
        await drive.refreshStatus();
      }
    } else if (response.type === 'cancel') {
      drive.setAuthStatus('denied');
      showToast('Google Drive connection cancelled.', 'info');
    } else if (response.type === 'error') {
      drive.setAuthStatus('denied');
      showToast('Google Drive connection failed.', 'error');
    }

    setAuthResult({
      type: response.type as 'success' | 'cancel' | 'error',
      params: response.params,
    });
  };

  const startAuthFlow = async () => {
    setIsConnecting(true);
    try {
      await promptAsync();
    } catch {
      setIsConnecting(false);
      showToast('Could not start Google Drive connection.', 'error');
    }
  };

  const handleConnect = async () => {
    if (drive.connected) return;
    await startAuthFlow();
  };

  const handleDisconnect = async () => {
    const ok = await requestConfirm({
      title: 'Disconnect Google Drive?',
      body:
        'Automatic backups will stop. Existing backups on Drive will remain.',
      confirmLabel: 'Disconnect',
      cancelLabel: 'Keep connected',
      tone: 'danger',
      icon: XIcon,
    });
    if (!ok) return;

    try {
      await drive.disconnect();
      showToast('Google Drive disconnected.', 'success');
    } catch {
      showToast('Could not disconnect.', 'error');
    }
  };

  const handleBackUpNow = async () => {
    try {
      const job = await triggerManualBackup();
      if (job) {
        celebrate('Backup uploaded', `${job.recordCount ?? 0} records`);
        showToast('Backup uploaded to Google Drive.', 'success');
      }
    } catch {
      showToast('Backup could not be uploaded.', 'error');
    }
  };

  const handleRestore = () => {
    router.push('/(tabs)/more/settings/restore-prompt' as never);
  };

  const handleSkip = () => {
    if (drive.eligibleRestore) {
      drive.markBackupHandled(drive.eligibleRestore.id);
    }
  };

  const latestLocal = useDataStore.getState().data.backups.find(
    (b) => b.kind === 'Google Drive backup',
  );

  return (
    <Screen
      title="Google Drive Backup"
      large
      subtitle="Optional cloud backup for your Bright Cakes & Snacks data"
    >
      {drive.connected ? (
        <>
          <View style={styles.connectionCard}>
            <View style={styles.connectionHeader}>
              <ShieldCheckIcon
                size={24}
                color={colors.primary}
                strokeWidth={1.75}
              />
              <View style={styles.connectionTitle}>
                <Text style={styles.connectionTitleText}>
                  Connected to Google Drive
                </Text>
                {drive.accountEmail ? (
                  <Text style={styles.connectionAccount}>{drive.accountEmail}</Text>
                ) : null}
              </View>
              <Pressable
                onPress={handleDisconnect}
                style={styles.disconnectButton}
              >
                <XIcon size={20} color={colors.mute} strokeWidth={1.75} />
              </Pressable>
            </View>

            <View style={styles.autoBackupRow}>
              <ToggleRow
                label="Automatic backup"
                description={
                  'Backs up automatically after changes (orders, customers, products, inventory)'
                }
                checked={drive.autoBackupEnabled}
                onChange={(v) => {
                  drive.setAutoBackup(v);
                  showToast(
                    v
                      ? 'Automatic backup enabled.'
                      : 'Automatic backup disabled.',
                    'info',
                  );
                }}
              />
            </View>

            {drive.latestJob && (
              <View style={styles.lastBackupRow}>
                <Text style={styles.lastBackupLabel}>Last backup</Text>
                <View style={styles.lastBackupValue}>
                  <Text style={styles.lastBackupStatus}>
                    {drive.latestJob.status === 'completed'
                      ? 'Completed'
                      : drive.latestJob.status === 'failed'
                        ? 'Failed'
                        : drive.latestJob.status === 'uploading'
                          ? 'Uploading…'
                          : 'Pending'}
                  </Text>
                  {drive.latestJob.recordCount !== undefined && (
                    <Text style={styles.lastBackupCount}>
                      {drive.latestJob.recordCount} records
                    </Text>
                  )}
                </View>
              </View>
            )}

            <View style={styles.actions}>
              <Button
                size="lg"
                full
                icon={DatabaseIcon}
                onPress={handleBackUpNow}
              >
                Back Up Now
              </Button>
              <Button
                variant="secondary"
                size="lg"
                full
                icon={RotateCcwIcon}
                onPress={handleRestore}
              >
                Restore Backup
              </Button>
            </View>

            {drive.checking && (
              <View style={styles.checkingRow}>
                <Text style={styles.checkingText}>Checking for backups…</Text>
              </View>
            )}

            {drive.eligibleRestore && !drive.lastHandledBackupId ? (
              <View style={styles.restorePrompt}>
                <View style={styles.restorePromptBody}>
                  <Text style={styles.restorePromptTitle}>
                    Google Drive Backup Available
                  </Text>
                  <Text style={styles.restorePromptBodyText}>
                    We found a backup from {new Date(
                      drive.eligibleRestore.createdTime,
                    ).toLocaleDateString()}.
                  </Text>
                </View>
                <View style={styles.restorePromptActions}>
                  <Pressable
                    onPress={() => {
                      drive.markBackupHandled(drive.eligibleRestore!.id);
                      router.push(
                        '/(tabs)/more/settings/restore-prompt' as never,
                      );
                    }}
                    style={styles.restoreButton}
                  >
                    <Text style={styles.restoreButtonText}>Restore Backup</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleSkip}
                    style={styles.skipButton}
                  >
                    <Text style={styles.skipButtonText}>Skip for Now</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}

            {drive.driveBackups.length > 0 && (
              <View style={styles.historySection}>
                <Text style={styles.historyTitle}>Backup History</Text>
                <View style={styles.historyList}>
                  {drive.driveBackups.slice(0, 5).map((b) => (
                    <View key={b.id} style={styles.historyRow}>
                      <View style={styles.historyIcon}>
                        <DatabaseIcon size={16} color={colors.cocoaSoft} strokeWidth={1.75} />
                      </View>
                      <View style={styles.historyBody}>
                        <Text style={styles.historyTitleText}>
                          {new Date(b.createdTime).toLocaleDateString()}
                        </Text>
                        <Text style={styles.historyMeta}>
                          {b.size} KB · {new Date(b.modifiedTime).toLocaleDateString()}
                        </Text>
                      </View>
                      <Pressable
                        onPress={() => {
                          drive.markBackupHandled(b.id);
                          router.push(
                            `/(tabs)/more/settings/restore-prompt?backupId=${b.id}` as never,
                          );
                        }}
                        style={styles.historyRestore}
                      >
                        <Text style={styles.historyRestoreText}>Restore</Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        </>
      ) : (
        <>
          <View style={styles.disconnectedCard}>
            <CloudIcon
              size={48}
              color={colors.mute}
              strokeWidth={1.75}
              style={styles.disconnectedIcon}
            />
            <Text style={styles.disconnectedTitle}>
              Google Drive not connected
            </Text>
            <Text style={styles.disconnectedBody}>
              Optional cloud backup for your order, customer, product, and
              inventory data. Backups are stored in your private Google Drive
              appData folder — nothing is shared publicly.
            </Text>
            <Button
              size="lg"
              full
              icon={CloudIcon}
              loading={isConnecting}
              onPress={handleConnect}
              disabled={isConnecting}
            >
              Connect Google Drive
            </Button>
            <Text style={styles.disconnectedNote}>
              App continues to work normally without cloud backup.
            </Text>
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  connectionCard: {
    marginHorizontal: 16,
    marginBottom: 28,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    padding: 20,
  },
  connectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  connectionTitle: {
    flex: 1,
    minWidth: 0,
  },
  connectionTitleText: {
    fontFamily: fontFamily.sansMedium,
    fontWeight: '500',
    fontSize: fontSize.md,
    color: colors.cocoa,
  },
  connectionAccount: {
    marginTop: 2,
    fontFamily: fontFamily.sans,
    fontSize: fontSize['sm+'],
    color: colors.mute,
  },
  disconnectButton: {
    padding: 4,
  },
  autoBackupRow: {
    marginBottom: 16,
  },
  lastBackupRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    borderTopColor: colors.line,
    marginBottom: 16,
  },
  lastBackupLabel: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize.md,
    color: colors.mute,
  },
  lastBackupValue: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  lastBackupStatus: {
    fontFamily: fontFamily.sansMedium,
    fontWeight: '500',
    fontSize: fontSize.md,
    color: colors.cocoa,
  },
  lastBackupCount: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize['sm+'],
    color: colors.mute,
  },
  actions: {
    gap: 10,
  },
  checkingRow: {
    marginTop: 12,
    alignItems: 'center',
    gap: 8,
  },
  checkingText: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize.sm,
    color: colors.mute,
  },
  restorePrompt: {
    marginTop: 16,
    borderRadius: radius['2xl'],
    backgroundColor: colors.primaryLight,
    padding: 16,
  },
  restorePromptBody: {
    flex: 1,
    minWidth: 0,
  },
  restorePromptTitle: {
    fontFamily: fontFamily.sansMedium,
    fontWeight: '500',
    fontSize: fontSize.md,
    color: colors.primary,
    marginBottom: 4,
  },
  restorePromptBodyText: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize.sm,
    color: colors.cocoaSoft,
    marginBottom: 12,
  },
  restorePromptActions: {
    flexDirection: 'row',
    gap: 8,
  },
  restoreButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: radius.xl,
    backgroundColor: colors.primary,
  },
  restoreButtonText: {
    fontFamily: fontFamily.sansMedium,
    fontWeight: '500',
    fontSize: fontSize.md,
    color: colors.white,
  },
  skipButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.line,
  },
  skipButtonText: {
    fontFamily: fontFamily.sansMedium,
    fontWeight: '500',
    fontSize: fontSize.md,
    color: colors.cocoaSoft,
  },
  historySection: {
    marginTop: 28,
  },
  historyTitle: {
    fontFamily: fontFamily.serif,
    fontSize: fontSize['md++'],
    color: colors.cocoa,
    marginBottom: 12,
  },
  historyList: {
    gap: 8,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderRadius: radius.xl,
    backgroundColor: colors.sand,
  },
  historyIcon: {
    padding: 8,
    backgroundColor: colors.white,
    borderRadius: radius.xl,
  },
  historyBody: {
    flex: 1,
    minWidth: 0,
  },
  historyTitleText: {
    fontFamily: fontFamily.sansMedium,
    fontWeight: '500',
    fontSize: fontSize.md,
    color: colors.cocoa,
  },
  historyMeta: {
    marginTop: 2,
    fontFamily: fontFamily.sans,
    fontSize: fontSize.sm,
    color: colors.mute,
  },
  historyRestore: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radius.xl,
    backgroundColor: colors.primary,
  },
  historyRestoreText: {
    fontFamily: fontFamily.sansMedium,
    fontWeight: '500',
    fontSize: fontSize.sm,
    color: colors.white,
  },
  disconnectedCard: {
    marginHorizontal: 16,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    padding: 24,
    alignItems: 'center',
  },
  disconnectedIcon: {
    marginBottom: 12,
  },
  disconnectedTitle: {
    fontFamily: fontFamily.serif,
    fontSize: fontSize['md++'],
    color: colors.cocoa,
    marginBottom: 8,
    textAlign: 'center',
  },
  disconnectedBody: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize.md,
    color: colors.cocoaSoft,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  disconnectedNote: {
    marginTop: 12,
    fontFamily: fontFamily.sans,
    fontSize: fontSize.sm,
    color: colors.mute,
    textAlign: 'center',
  },
});
