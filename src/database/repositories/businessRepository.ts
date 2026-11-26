import type { SQLiteDatabase } from 'expo-sqlite';
import type { Business } from '../../types';
import { all, one, run } from '../helpers';
import { mapBusiness, type BusinessRow } from '../mappers';

const BUSINESS_ID = 'default';

const SELECT = `SELECT * FROM business_profile WHERE id = ? LIMIT 1;`;

export const BusinessRepository = {
  async get(db: SQLiteDatabase): Promise<Business | null> {
    const row = await one<BusinessRow>(db, SELECT, [BUSINESS_ID]);
    return row ? mapBusiness(row) : null;
  },

  async list(db: SQLiteDatabase): Promise<Business[]> {
    const rows = await all<BusinessRow>(db, 'SELECT * FROM business_profile;');
    return rows.map(mapBusiness);
  },

  /** Inserts the profile when missing, otherwise updates the given columns. */
  async save(db: SQLiteDatabase, business: Business): Promise<void> {
    const existing = await one<BusinessRow>(db, SELECT, [BUSINESS_ID]);
    const payload = [
      business.name,
      business.owner,
      business.phone,
      business.email,
      business.address,
      business.currency,
      business.openTime,
      business.closeTime,
      JSON.stringify(business.workingDays),
      business.dateFormat,
      business.timeFormat,
      business.weekStartsOn,
      business.orderPrefix,
      business.leadDays,
      business.defaultFulfilment,
      business.deliveryCharge,
      business.defaultUnit,
      business.trackStock ? 1 : 0,
      business.showInactiveProducts ? 1 : 0,
      JSON.stringify(business.notifications),
      business.onboarded ? 1 : 0,
    ];

    if (existing) {
      await run(
        db,
        `UPDATE business_profile SET
           name = ?, owner = ?, phone = ?, email = ?, address = ?, currency = ?,
           open_time = ?, close_time = ?, working_days = ?, date_format = ?, time_format = ?,
           week_starts_on = ?, order_prefix = ?, lead_days = ?, default_fulfilment = ?,
           delivery_charge = ?, default_unit = ?, track_stock = ?, show_inactive_products = ?,
           notifications = ?, onboarded = ?
         WHERE id = ?;`,
        [...payload, BUSINESS_ID],
      );
    } else {
      await run(
        db,
        `INSERT INTO business_profile (
           id, name, owner, phone, email, address, currency, open_time, close_time,
           working_days, date_format, time_format, week_starts_on, order_prefix, lead_days,
           default_fulfilment, delivery_charge, default_unit, track_stock,
           show_inactive_products, notifications, onboarded
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [BUSINESS_ID, ...payload],
      );
    }
  },
};
