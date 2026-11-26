/**
 * Bright Cakes & Snacks — Native APK update dialog.
 *
 * Shows when a newer APK is available on GitHub Releases. Lets the customer
 * download the update, verify its integrity, and install via Android's
 * package installer.
 *
 * The update is never forced — the customer can dismiss it and keep using
 * the app. The download respects the existing design system:
 * white background, primary red #E51B23, heading brown #4A2818, 10px button radius.
 */

import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CheckIcon, DownloadIcon, SendIcon, XIcon } from 'lucide-react-native';
import { Button } from '../ui/Button';
import { colors, fontFamily, fontSize, radius } from '../../theme';
import { useUIStore } from '../../store/uiStore';
import {
  downloadApk,
  deleteApk,
  installApk,
  verifyApkChecksum,
  type StoredRelease,
} from '../../services/updates';

interface UpdateCheckDialogProps {
  open: boolean;
  onClose: () => void;
  release: StoredRelease;
}

export function UpdateCheckDialog({
  open,
  onClose,
  release,
}: UpdateCheckDialogProps) {
  const [status, setStatus] = useState<'idle' | 'downloading' | 'verifying' | 'ready' | 'error'>('idle');
  const [progress, setProgress] = useState({ received: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
  const [fileUri, setFileUri] = useState<string | null>(null);
  const [checksumVerified, setChecksumVerified] = useState(false);

  const showToast = useUIStore((s) => s.showToast);

  const downloadPercent = progress.total > 0 ? Math.round((progress.received / progress.total) * 100) : 0;

  const handleDownload = useCallback(async () => {
    setStatus('downloading');
    setError(null);
    setProgress({ received: 0, total: 0 });
    setChecksumVerified(false);

    try {
      const uri = await downloadApk(release, (received, total) => {
        setProgress({ received, total });
      });

      // Verify SHA-256 checksum before marking ready for installation.
      setStatus('verifying');
      const verified = await verifyApkChecksum(uri, release.sha256);

      if (!verified) {
        await deleteApk(uri);
        setStatus('error');
        setError(
          'Update integrity verification failed. The downloaded file does not match the release checksum. Please try again later.',
        );
        return;
      }

      setFileUri(uri);
      setChecksumVerified(true);
      setStatus('ready');
      showToast('Update downloaded and verified', 'info');
    } catch {
      setStatus('error');
      setError('Download failed. Please check your connection and try again.');
    }
  }, [release, showToast]);

  const handleInstall = useCallback(async () => {
    if (!fileUri || !checksumVerified) return;
    const ok = await installApk(fileUri);
    if (!ok) {
      setStatus('error');
      setError('Could not launch the installer. Please try again.');
    }
  }, [fileUri, checksumVerified]);

  const handleRetry = useCallback(() => {
    setStatus('idle');
    setError(null);
    setFileUri(null);
  }, []);

  const handleDismiss = () => {
    onClose();
  };

  if (!open) return null;

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      style={styles.scroll}
    >
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <DownloadIcon size={32} color={colors.primary} strokeWidth={2} />
        </View>
        <Text style={styles.title}>New Update Available</Text>
        <Text style={styles.subtitle}>
          A new version of Bright Cakes & Snacks is ready to install.
        </Text>
      </View>

      <View style={styles.versionCard}>
        <Text style={styles.versionLabel}>Version {release.version}</Text>
        <Text style={styles.versionDate}>
          Released {new Date(release.publishedAt).toLocaleDateString(undefined, {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </Text>
      </View>

      <View style={styles.notesCard}>
        <Text style={styles.notesTitle}>What&apos;s new</Text>
        <Text style={styles.notesBody}>{release.releaseNotes}</Text>
      </View>

      {status === 'downloading' ? (
        <View style={styles.progressCard}>
          <Text style={styles.progressLabel}>Downloading update</Text>
          <View style={styles.progressBarWrap}>
            <View
              style={[
                styles.progressBar,
                { width: `${downloadPercent}%` },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {downloadPercent}% ({formatBytes(progress.total)})
          </Text>
          <Pressable
            accessibilityLabel="Cancel download"
            onPress={handleRetry}
            style={styles.cancelRow}
          >
            <XIcon size={16} color={colors.cocoaSoft} strokeWidth={2} />
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </View>
      ) : status === 'verifying' ? (
        <View style={styles.readyCard}>
          <View style={styles.readyIconWrap}>
            <DownloadIcon size={24} color={colors.cocoa} strokeWidth={2} />
          </View>
          <Text style={styles.readyTitle}>Verifying update</Text>
          <Text style={styles.readyBody}>
            Checking the integrity of the downloaded update against the
            release checksum.
          </Text>
        </View>
      ) : status === 'ready' && checksumVerified ? (
        <View style={styles.readyCard}>
          <View style={styles.readyIconWrap}>
            <CheckIcon size={24} color={colors.sageDeep} strokeWidth={2} />
          </View>
          <Text style={styles.readyTitle}>Your update is ready</Text>
          <Text style={styles.readyBody}>
            The new version has been downloaded and verified. Continue to
            Android installation to complete the update.
          </Text>
          <Button
            icon={SendIcon}
            onPress={handleInstall}
            style={styles.installButton}
          >
            Install Update
          </Button>
        </View>
      ) : status === 'error' ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
          <Button variant="secondary" onPress={handleRetry} style={styles.retryButton}>
            Try Again
          </Button>
        </View>
      ) : (
        <View style={styles.actions}>
          <Button variant="secondary" onPress={handleDismiss} style={styles.laterButton}>
            Later
          </Button>
          <Button onPress={handleDownload} style={styles.updateButton}>
            Update Now
          </Button>
        </View>
      )}

      <View style={styles.note}>
        <Text style={styles.noteText}>
          Android will ask you to confirm installation. This is normal — apps
          cannot install themselves without your approval.
        </Text>
      </View>
    </ScrollView>
  );
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes < 1024) return `${bytes ?? 0} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    flexGrow: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontFamily: fontFamily.serif,
    fontSize: fontSize['2xl+'],
    color: colors.cocoa,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 4,
    fontFamily: fontFamily.sans,
    fontSize: fontSize['sm++'],
    color: colors.mute,
    textAlign: 'center',
  },
  versionCard: {
    marginBottom: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: radius['2xl'],
    backgroundColor: colors.sand,
  },
  versionLabel: {
    fontFamily: fontFamily.sansMedium,
    fontWeight: '500',
    fontSize: fontSize['md+++'],
    color: colors.cocoa,
  },
  versionDate: {
    marginTop: 2,
    fontFamily: fontFamily.sans,
    fontSize: fontSize.sm,
    color: colors.cocoaSoft,
  },
  notesCard: {
    marginBottom: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
  },
  notesTitle: {
    fontFamily: fontFamily.sansMedium,
    fontWeight: '500',
    fontSize: fontSize.md,
    color: colors.cocoa,
    marginBottom: 8,
  },
  notesBody: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize['sm++'],
    color: colors.cocoaSoft,
    lineHeight: 20,
  },
  progressCard: {
    marginBottom: 20,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
  },
  progressLabel: {
    fontFamily: fontFamily.sansMedium,
    fontWeight: '500',
    fontSize: fontSize.md,
    color: colors.cocoa,
    marginBottom: 10,
  },
  progressBarWrap: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.faint,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  progressText: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize.sm,
    color: colors.mute,
    marginBottom: 10,
  },
  cancelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cancelText: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize['sm++'],
    color: colors.cocoaSoft,
  },
  readyCard: {
    marginBottom: 20,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
  },
  readyIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.sageSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  readyTitle: {
    fontFamily: fontFamily.sansMedium,
    fontWeight: '500',
    fontSize: fontSize.md,
    color: colors.cocoa,
    marginBottom: 6,
  },
  readyBody: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize['sm++'],
    color: colors.mute,
    lineHeight: 20,
    marginBottom: 16,
  },
  installButton: {
    height: 52,
    borderRadius: 10,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  laterButton: {
    flex: 1,
    height: 44,
    borderRadius: 10,
  },
  updateButton: {
    flex: 1,
    height: 44,
    borderRadius: 10,
  },
  retryButton: {
    height: 44,
    borderRadius: 10,
  },
  errorCard: {
    marginBottom: 20,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
  },
  errorText: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize['sm++'],
    color: colors.cocoaSoft,
    lineHeight: 20,
    marginBottom: 12,
  },
  note: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  noteText: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize.sm,
    color: colors.mute,
    lineHeight: 18,
    textAlign: 'center',
  },
});
