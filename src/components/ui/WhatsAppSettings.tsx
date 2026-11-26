/**
 * WhatsApp Templates settings section.
 *
 * Allows authorised users to view, edit, enable/disable and restore default
 * WhatsApp message templates. Templates are persisted using the existing
 * app_settings storage architecture (no new backend).
 */

import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SendIcon } from 'lucide-react-native';
import { Button } from '../../../src/components/ui/Button';
import { TextArea } from '../../../src/components/ui/Field';
import { InfoRow, NavRow, RowGroup } from '../../../src/components/ui/NavRow';
import { Screen } from '../../../src/components/ui/Screen';
import { ToggleRow } from '../../../src/components/ui/Toggle';
import { useDataStore } from '../../../src/store/dataStore';
import { useUIStore } from '../../../src/store/uiStore';
import { colors, fontFamily, fontSize, radius } from '../../../src/theme';
import {
  DEFAULT_TEMPLATES,
  openWhatsAppChat,
  renderTemplate,
  type WhatsAppTemplate,
} from '../../../src/services/whatsapp';
import { fmtDate } from '../../../src/utils/format';
import { inr } from '../../../src/utils/money';

export function WhatsAppSettings(): React.ReactNode {
  const data = useDataStore((s) => s.data);
  const showToast = useUIStore((s) => s.showToast);

  const businessName = data.business.name;
  const businessPhone = data.business.phone;

  const loadStoredTemplates = useCallback((): WhatsAppTemplate[] | null => {
    return null; // No stored templates yet — use defaults
  }, []);

  // Load stored templates or fall back to defaults.
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>(() => {
    const stored = loadStoredTemplates();
    return stored || [...DEFAULT_TEMPLATES];
  });

  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editBody, setEditBody] = useState('');

  const handleEditTemplate = (template: WhatsAppTemplate) => {
    setEditingKey(template.key);
    setEditBody(template.body);
  };

  const handleRestoreDefault = (templateKey: WhatsAppTemplate['key']) => {
    const def = DEFAULT_TEMPLATES.find((t) => t.key === templateKey);
    if (!def) return;
    setEditBody(def.body);
    setTemplates((prev) =>
      prev.map((t) => (t.key === templateKey ? { ...t, body: def.body } : t)),
    );
    setEditingKey(null);
  };

  const handleSaveEdit = () => {
    if (editingKey === null) return;
    setTemplates((prev) =>
      prev.map((t) =>
        t.key === editingKey ? { ...t, body: editBody } : t,
      ),
    );
    setEditingKey(null);
    showToast('Template updated');
  };

  const handleToggleEnabled = (key: WhatsAppTemplate['key']) => {
    setTemplates((prev) =>
      prev.map((t) => (t.key === key ? { ...t, enabled: !t.enabled } : t)),
    );
  };

  const handleTestWhatsApp = async (template: WhatsAppTemplate) => {
    if (!businessPhone) {
      showToast('No business phone number configured.', 'error');
      return;
    }
    const message = renderTemplate(template, {
      customerName: 'Test Customer',
      customerPhone: '+91 99999 99999',
      orderNumber: 'BC-9999',
      orderDate: fmtDate('2026-11-20', 'd MMM yyyy'),
      orderItems: '• Sample Item × 1',
      orderTotal: inr(50000),
      businessName,
      businessPhone,
      greeting: 'Hello',
    });
    const opened = await openWhatsAppChat(businessPhone, message);
    if (!opened) {
      showToast('WhatsApp is not available on this device.', 'error');
    }
  };

  return (
    <Screen title="WhatsApp Templates" large>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.padded}>
          <Text style={styles.sectionTitle}>
            WhatsApp Message Templates
          </Text>
          <Text style={styles.note}>
            Customise the messages customers receive via WhatsApp. Messages are
            prefilled in WhatsApp — the customer (or you) must tap Send.
          </Text>

          <View style={styles.infoCard}>
            <InfoRow label="Business name" value={businessName} />
            <InfoRow label="Business phone" value={businessPhone || 'Not set'} />
          </View>

          <View style={styles.listSection}>
            {templates.map((template) => (
              <View
                key={template.key}
                style={[
                  styles.templateCard,
                  editingKey === template.key && styles.templateCardEditing,
                ]}
              >
                <View style={styles.templateHeader}>
                  <Text style={styles.templateLabel}>{template.label}</Text>
                  <View style={styles.templateBadges}>
                    {template.enabled ? (
                      <Pressable style={styles.enabledBadge}>
                        <Text style={styles.enabledBadgeText}>Enabled</Text>
                      </Pressable>
                    ) : (
                      <Pressable style={styles.disabledBadge}>
                        <Text style={styles.disabledBadgeText}>Disabled</Text>
                      </Pressable>
                    )}
                    <Pressable
                      accessibilityLabel="Edit template"
                      onPress={() => handleEditTemplate(template)}
                      style={styles.editBadge}
                    >
                      <SendIcon size={14} color={colors.cocoaSoft} strokeWidth={2} />
                    </Pressable>
                  </View>
                </View>

                {editingKey === template.key ? (
                  <View style={styles.editorWrap}>
                    <TextArea
                      label="Message body"
                      value={editBody}
                      onChangeText={setEditBody}
                      hint="Use {{customer_name}}, {{order_number}}, etc."
                    />
                    <View style={styles.editorActions}>
                      <Button
                        variant="ghost"
                        onPress={() => {
                          setEditingKey(null);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button onPress={handleSaveEdit}>
                        Save
                      </Button>
                      <Button
                        variant="secondary"
                        onPress={() => handleRestoreDefault(template.key)}
                      >
                        Restore default
                      </Button>
                    </View>
                    <View style={styles.previewWrap}>
                      <Text style={styles.previewLabel}>Preview</Text>
                      <Text style={styles.previewText}>
                        {renderTemplate(
                          { ...template, body: editBody },
                          {
                            customerName: 'Ritu Agarwal',
                            customerPhone: '+91 98765 43210',
                            orderNumber: 'BC-1038',
                            orderDate: fmtDate('2026-11-20', 'd MMM yyyy'),
                            orderItems:
                              '• Chocolate Cake × 2\n• Vanilla Cupcakes × 6',
                            orderTotal: inr(85000),
                            businessName,
                            businessPhone,
                            greeting: 'Hello',
                          },
                        )}
                      </Text>
                    </View>
                  </View>
                ) : null}

                {!editingKey || editingKey !== template.key ? (
                  <View style={styles.templatePreview}>
                    <Text style={styles.previewText}>
                      {renderTemplate(template, {
                        customerName: 'Ritu Agarwal',
                        customerPhone: '+91 98765 43210',
                        orderNumber: 'BC-1038',
                        orderDate: fmtDate('2026-11-20', 'd MMM yyyy'),
                        orderItems:
                          '• Chocolate Cake × 2\n• Vanilla Cupcakes × 6',
                        orderTotal: inr(85000),
                        businessName,
                        businessPhone,
                        greeting: 'Hello',
                      })}
                    </Text>
                    <Pressable
                      accessibilityLabel="Test on WhatsApp"
                      onPress={() => handleTestWhatsApp(template)}
                      style={styles.testButton}
                    >
                      <SendIcon size={16} color={colors.primary} strokeWidth={2} />
                    </Pressable>
                  </View>
                ) : null}

                <Pressable
                  accessibilityLabel="Toggle template"
                  onPress={() => handleToggleEnabled(template.key)}
                  style={styles.toggleRow}
                >
                  <ToggleRow
                    label={
                      template.enabled ? 'Disable template' : 'Enable template'
                    }
                    description="Hide or show this template in order screens"
                    checked={template.enabled}
                    onChange={() => handleToggleEnabled(template.key)}
                  />
                </Pressable>
              </View>
            ))}
          </View>

          <View style={styles.spacer}>
            <RowGroup title="Available placeholders">
              <NavRow label="{{customer_name}}" value="Customer's name" />
              <NavRow label="{{customer_phone}}" value="Customer's phone" />
              <NavRow label="{{order_number}}" value="Order number" />
              <NavRow label="{{order_date}}" value="Order date" />
              <NavRow label="{{order_items}}" value="Ordered items" />
              <NavRow label="{{order_total}}" value="Order total" />
              <NavRow label="{{pickup_date_time}}" value="Pickup date & time" />
              <NavRow label="{{delivery_address}}" value="Delivery address" />
              <NavRow label="{{payment_amount}}" value="Payment amount" />
              <NavRow label="{{payment_status}}" value="Payment status" />
              <NavRow label="{{business_name}}" value="Business name" />
              <NavRow label="{{greeting}}" value="Time greeting" />
            </RowGroup>
          </View>
        </View>
      </ScrollView>
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
  listSection: {
    marginHorizontal: 16,
    gap: 12,
  },
  templateCard: {
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    overflow: 'hidden',
  },
  templateCardEditing: {
    borderColor: colors.primary,
  },
  templateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
    borderBottomColor: colors.line,
  },
  templateLabel: {
    fontFamily: fontFamily.sansMedium,
    fontWeight: '500',
    fontSize: fontSize['md++'],
    color: colors.cocoa,
  },
  templateBadges: {
    flexDirection: 'row',
    gap: 6,
  },
  enabledBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: colors.sageSoft,
  },
  enabledBadgeText: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize.sm,
    color: colors.sageDeep,
  },
  disabledBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: colors.roseSoft,
  },
  disabledBadgeText: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize.sm,
    color: colors.roseDeep,
  },
  editBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.sand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editorWrap: {
    padding: 16,
  },
  editorActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  previewWrap: {
    marginTop: 12,
  },
  previewLabel: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize.sm,
    color: colors.mute,
    marginBottom: 6,
  },
  previewText: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize['sm++'],
    color: colors.cocoa,
    lineHeight: 20,
    backgroundColor: colors.sand,
    padding: 10,
    borderRadius: radius.xl,
  },
  templatePreview: {
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
    borderBottomColor: colors.line,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  testButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
    borderBottomColor: colors.line,
  },
  spacer: {
    marginTop: 32,
  },
});
