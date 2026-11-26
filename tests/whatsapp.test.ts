/**
 * WhatsApp service tests.
 *
 * Covers phone normalisation, deep-link URL building, message template
 * rendering and status-to-template mapping.
 */

import {
  buildMessageVariables,
  buildWhatsAppUrl,
  normalizePhone,
  openWhatsAppChat,
  renderTemplate,
  resolveTemplate,
  statusToTemplateKey,
  type MessageVariables,
  type WhatsAppTemplate,
} from '../src/services/whatsapp';

describe('normalizePhone', () => {
  it('normalises a plain 10-digit Indian mobile number', () => {
    expect(normalizePhone('9876543210')).toBe('919876543210');
  });

  it('strips spaces and formatting', () => {
    expect(normalizePhone('+91 98765 43210')).toBe('919876543210');
  });

  it('removes leading zero trunk prefix', () => {
    expect(normalizePhone('09876543210')).toBe('919876543210');
  });

  it('does not duplicate country code', () => {
    expect(normalizePhone('+919876543210')).toBe('919876543210');
    expect(normalizePhone('919876543210')).toBe('919876543210');
  });

  it('removes brackets and dashes', () => {
    expect(normalizePhone('(+91) 98765-43210')).toBe('919876543210');
  });

  it('returns null for empty input', () => {
    expect(normalizePhone('')).toBeNull();
    expect(normalizePhone('   ')).toBeNull();
  });

  it('returns null for too-short numbers', () => {
    expect(normalizePhone('12345')).toBeNull();
  });

  it('returns null for too-long numbers', () => {
    expect(normalizePhone('91987654321099999')).toBeNull();
  });
});

describe('buildWhatsAppUrl', () => {
  it('builds a wa.me URL with encoded message', () => {
    const url = buildWhatsAppUrl('9876543210', 'Hello 🎂');
    expect(url).toContain('https://wa.me/919876543210?text=');
    expect(url).toContain('Hello');
  });

  it('returns null for invalid phone', () => {
    expect(buildWhatsAppUrl('', 'Hello')).toBeNull();
    expect(buildWhatsAppUrl('123', 'Hello')).toBeNull();
  });
});

describe('renderTemplate', () => {
  const template: WhatsAppTemplate = {
    key: 'order_placed',
    label: 'Order placed',
    body:
      'Hi {{customer_name}}, your order #{{order_number}} is ready. Total: {{order_total}}.',
    enabled: true,
  };

  it('replaces all placeholders', () => {
    const vars: MessageVariables = {
      customerName: 'Ritu',
      orderNumber: 'BC-1038',
      orderTotal: '₹850.00',
    };
    expect(renderTemplate(template, vars)).toBe(
      'Hi Ritu, your order #BC-1038 is ready. Total: ₹850.00.',
    );
  });

  it('omits missing values cleanly', () => {
    const vars: MessageVariables = {
      customerName: 'Ritu',
      orderNumber: 'BC-1038',
    };
    const result = renderTemplate(template, vars);
    expect(result).not.toContain('undefined');
    expect(result).not.toContain('null');
    expect(result).not.toContain('{{order_status}}');
    expect(result).not.toContain('{{order_total}}');
  });

  it('handles empty template body', () => {
    const empty: WhatsAppTemplate = {
      key: 'custom',
      label: 'Custom',
      body: '',
      enabled: true,
    };
    expect(renderTemplate(empty, {})).toBe('');
  });
});

describe('statusToTemplateKey', () => {
  it('maps pending to order_placed', () => {
    expect(statusToTemplateKey('pending')).toBe('order_placed');
  });
  it('maps confirmed to order_confirmed', () => {
    expect(statusToTemplateKey('confirmed')).toBe('order_confirmed');
  });
  it('maps preparing to order_preparing', () => {
    expect(statusToTemplateKey('preparing')).toBe('order_preparing');
  });
  it('maps ready to order_ready', () => {
    expect(statusToTemplateKey('ready')).toBe('order_ready');
  });
  it('maps delivered to order_delivered', () => {
    expect(statusToTemplateKey('delivered')).toBe('order_delivered');
  });
  it('maps cancelled to order_cancelled', () => {
    expect(statusToTemplateKey('cancelled')).toBe('order_cancelled');
  });
  it('defaults unknown status to custom', () => {
    expect(statusToTemplateKey('unknown' as any)).toBe('custom');
  });
});

describe('resolveTemplate', () => {
  it('returns the default template when no stored templates', () => {
    const result = resolveTemplate('order_placed', null);
    expect(result.key).toBe('order_placed');
    expect(result.label).toBe('Order placed');
  });

  it('returns stored template override', () => {
    const stored: WhatsAppTemplate[] = [
      {
        key: 'order_placed',
        label: 'Custom placed',
        body: 'Custom body {{order_number}}',
        enabled: true,
      },
    ];
    const result = resolveTemplate('order_placed', stored);
    expect(result.label).toBe('Custom placed');
    expect(result.body).toBe('Custom body {{order_number}}');
  });
});

describe('openWhatsAppChat', () => {
  it('returns false for invalid phone', async () => {
    const result = await openWhatsAppChat('', 'Hello');
    expect(result).toBe(false);
  });
});
