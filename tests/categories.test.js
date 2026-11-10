import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CATEGORIES, SHOPS } from '../src/lib/categories.js';

test('the eight categories come in the order given', () => {
  assert.deepEqual(CATEGORIES, [
    { key: 'groceries', label: 'Groceries' },
    { key: 'eating_out', label: 'Eating out' },
    { key: 'transport', label: 'Transport' },
    { key: 'bills', label: 'Bills' },
    { key: 'shopping', label: 'Shopping' },
    { key: 'health', label: 'Health' },
    { key: 'income', label: 'Income' },
    { key: 'other', label: 'Other' },
  ]);
});

test('each shop in the spec maps to its category key', () => {
  assert.deepEqual(SHOPS, [
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
  ]);
});
