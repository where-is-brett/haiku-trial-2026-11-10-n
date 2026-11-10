// src/lib/categories.js

// The eight categories, in the order the spec gives them.
export const CATEGORIES = [
  { key: 'groceries', label: 'Groceries' },
  { key: 'eating_out', label: 'Eating out' },
  { key: 'transport', label: 'Transport' },
  { key: 'bills', label: 'Bills' },
  { key: 'shopping', label: 'Shopping' },
  { key: 'health', label: 'Health' },
  { key: 'income', label: 'Income' },
  { key: 'other', label: 'Other' },
];

// The shops and their categories. Matching walks this list in order,
// so when several shops match, the first one listed decides.
export const SHOPS = [
  { name: 'Greenbarrow Fresh', category: 'groceries' },
  { name: 'Pennywhistle Market', category: 'groceries' },
  { name: 'Lowtide Grocers', category: 'groceries' },
  { name: 'Harvest Lane Foods', category: 'groceries' },
  { name: 'Pasta, Pizza & Co', category: 'eating_out' },
  { name: 'Kestrel Coffee Bar', category: 'eating_out' },
  { name: 'Saltbush Noodle House', category: 'eating_out' },
  { name: 'Ember Grill', category: 'eating_out' },
  { name: 'Waverly Fuel Stop', category: 'transport' },
  { name: 'Tramline Fares', category: 'transport' },
  { name: 'Lantern Rideshare', category: 'transport' },
  { name: 'Northgate Parking', category: 'transport' },
  { name: 'Brightfield Power', category: 'bills' },
  { name: 'Clearwater Utilities', category: 'bills' },
  { name: 'Skyline Broadband', category: 'bills' },
  { name: 'Hollis Insurance', category: 'bills' },
  { name: 'Marlowe Homewares', category: 'shopping' },
  { name: 'Quillon Books', category: 'shopping' },
  { name: 'Fernhill Outfitters', category: 'shopping' },
  { name: 'Pixel Parade Tech', category: 'shopping' },
  { name: 'Larkspur Pharmacy', category: 'health' },
  { name: 'Elmgrove Physio', category: 'health' },
  { name: 'Cobalt Dental', category: 'health' },
  { name: 'Sunnyvale Optical', category: 'health' },
  { name: 'Brightwave Payroll', category: 'income' },
  { name: 'Tidepool Interest', category: 'income' },
  { name: 'Oakridge Dividends', category: 'income' },
];
