export const APP_VERSION = '1.0.0-phase1';

export const DEFAULT_BUSINESSES = [
  { id: 'business-personal', name: 'Personal' },
  { id: 'business-main', name: 'Main Business' },
];

export const DEFAULT_CATEGORIES = [
  { id: 'category-office', name: 'Office Supplies' },
  { id: 'category-travel', name: 'Travel' },
  { id: 'category-meals', name: 'Meals' },
  { id: 'category-software', name: 'Software' },
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
