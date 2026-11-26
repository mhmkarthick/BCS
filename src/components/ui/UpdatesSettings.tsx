/**
 * Bright Cakes & Snacks — Application Updates settings section.
 *
 * Displays the installed app version, update status, last check date,
 * and a manual "Check for Updates" action. OTA updates (Expo Updates)
   are automatic and not exposed here — this section is for native APK
   update checks through GitHub Releases.
 */

import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { DownloadIcon } from 'lucide-react-native';
import { Button } from '../../../src/components/ui/Button';
import { InfoRow, NavRow, RowGroup } from '../../../src/components/ui/NavRow';
import { Screen } from '../../../src/components/ui/Screen';
import { useUIStore } from '../../../src/store/uiStore';
import { colors, fontFamily, fontSize, radius } from '../../../src/theme';
import {
  checkForUpdateIfDue,
  getInstalledVersion,
  type StoredRelease,
} from '../../../src/services/updates';
import { UpdateCheckDialog } from '../../../src/components/ui/UpdateCheckDialog';

export function UpdatesSettings(): React.ReactNode {
  const showToast = useUIStore((s) => s.showToast);
  const installedVersion = getInstalledVersion();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [availableRelease, setAvailableRelease] = useState<StoredRelease | null>(null);
  const [checking, setChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<string | null>(null);

  const handleCheck = useCallback(async () => {
    setChecking(true);
    try {
      const release = await checkForUpdateIfDue();
      if (release) {
        setAvailableRelease(release);
        setDialogOpen(true);
        setLastChecked(new Date().toLocaleString());
        showToast('Update available', 'info');
      } else {
        setLastChecked(new Date().toLocaleString());
        showToast('You are on the latest version', 'info');
      }
    } catch {
      showToast('Could not check for updates', 'error');
    } finally {
      setChecking(false);
    }
  }, [showToast]);

  const handleClose = () => {
    setDialogOpen(false);
    setAvailableRelease(null);
  };

  return (
    <Screen title="Application Updates" large>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.padded}>
          <Text style={styles.sectionTitle}>Application Updates</Text>
          <Text style={styles.note}>
            Bright Cakes & Snacks checks for new native builds on GitHub
            Releases. Compatible JavaScript and UI improvements arrive
            automatically through Expo OTA updates — no action needed.
          </Text>

          <View style={styles.infoCard}>
            <InfoRow label="Installed version" value={installedVersion} />
            <InfoRow
              label="Build type"
              value="Release (APK)"
            />
            <InfoRow
              label="Last checked"
              value={lastChecked ?? 'Never'}
            />
          </View>

          <View style={styles.actions}>
            <Button
              icon={checking ? undefined : DownloadIcon}
              loading={checking}
              onPress={handleCheck}
              disabled={checking}
              style={styles.checkButton}
            >
              Check for Updates
            </Button>
          </View>

          <View style={styles.spacer}>
            <RowGroup title="How updates work">
              <NavRow
                label="OTA updates (automatic)"
                description="UI and JavaScript improvements download automatically and apply on next launch"
              />
              <NavRow
                label="Native APK updates"
                description="New native builds are distributed through GitHub Releases — you download and install them manually"
              />
              <NavRow
                label="No account needed"
                description="No login or cloud account is required to use the app or receive updates"
              />
            </RowGroup>
          </View>
        </View>
      </ScrollView>

      <UpdateCheckDialog
        open={dialogOpen}
        onClose={handleClose}
        release={
          availableRelease ?? {
            version: '',
            releaseNotes: '',
            publishedAt: '',
            apkUrl: '',
          }
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    flexGrow: 1,
  },
  padded: {
    gap: 16,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontFamily: fontFamily.serif,
    fontSize: fontSize['2xl+'],
    color: colors.cocoa,
    marginBottom: 4,
  },
  note: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize['sm++'],
    color: colors.mute,
    marginBottom: 16,
  },
  infoCard: {
    marginHorizontal: 16,
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    padding: 16,
  },
  actions: {
    marginHorizontal: 16,
    gap: 12,
    marginBottom: 20,
  },
  checkButton: {
    flex: 1,
    height: 52,
    borderRadius: 10,
  },
  spacer: {
    marginTop: 32,
  },
});
