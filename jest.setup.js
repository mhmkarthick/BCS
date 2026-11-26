/* eslint-env jest */
/* global jest */

// Reanimated 4 is built on react-native-worklets, whose native module cannot
// load inside Jest. The local mock implements the slice of the Reanimated API
// the app uses, with every animation resolved immediately.
jest.mock('react-native-reanimated', () =>
  require('./tests/helpers/reanimated-mock'),
);

// expo-sqlite is a native module; the database unit tests exercise the pure
// calculation + validation layers and use an in-memory repository double.
jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(async () => ({
    execAsync: jest.fn(async () => undefined),
    runAsync: jest.fn(async () => ({ lastInsertRowId: 0, changes: 0 })),
    getAllAsync: jest.fn(async () => []),
    getFirstAsync: jest.fn(async () => null),
    withTransactionAsync: jest.fn(async (fn) => fn()),
    closeAsync: jest.fn(async () => undefined),
  })),
  SQLiteProvider: ({ children }) => children,
  useSQLiteContext: () => ({
    execAsync: jest.fn(),
    runAsync: jest.fn(),
    getAllAsync: jest.fn(async () => []),
  }),
}));
