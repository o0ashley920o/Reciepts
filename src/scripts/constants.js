export const APP_VERSION = '2.0.0-phase2';

export const DEFAULT_BUSINESSES = [
  { id: 'business-personal', name: 'Personal', abn: '', address: '', defaultCategoryId: '', colour: '#2563eb', createdAt: new Date(0).toISOString() },
  { id: 'business-main', name: 'Main Business', abn: '', address: '', defaultCategoryId: '', colour: '#14b8a6', createdAt: new Date(0).toISOString() },
];

export const DEFAULT_CATEGORIES = [
  { id: 'category-office', name: 'Office Supplies', parentId: null, taxCode: 'GST', colour: '#2563eb', createdAt: new Date(0).toISOString() },
  { id: 'category-travel', name: 'Travel', parentId: null, taxCode: 'GST', colour: '#14b8a6', createdAt: new Date(0).toISOString() },
  { id: 'category-meals', name: 'Meals', parentId: null, taxCode: 'GST', colour: '#f59e0b', createdAt: new Date(0).toISOString() },
  { id: 'category-software', name: 'Software', parentId: null, taxCode: 'GST', colour: '#8b5cf6', createdAt: new Date(0).toISOString() },
];

export const DEFAULT_SETTINGS = {
  theme: 'light',
  currency: 'AUD',
  locale: 'en-AU',
  googleClientId: '',
  googleBackupFileName: 'receipt-backup.json',
  googleDriveFolder: 'appDataFolder',
};

export const PAYMENT_METHODS = [
  'Unknown',
  'Cash',
  'Card',
  'Visa',
  'Mastercard',
  'AMEX',
  'EFTPOS',
  'Apple Pay',
  'Google Pay',
  'PayPal',
  'Bank Transfer',
];

export const RECEIPT_STATUSES = ['new', 'reviewed', 'duplicate'];
