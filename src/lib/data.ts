import type { Transaction, Budget, Category } from './types';

export const transactions: Transaction[] = [
  {
    id: 'txn_1',
    date: new Date('2024-07-15'),
    description: 'Patient Consultation - J. Doe',
    amount: 300,
    type: 'income',
    category: 'Patient Income',
  },
  {
    id: 'txn_2',
    date: new Date('2024-07-14'),
    description: 'July Office Rent',
    amount: 2500,
    type: 'expense',
    category: 'Rent',
  },
  {
    id: 'txn_3',
    date: new Date('2024-07-14'),
    description: 'Medical supplies order - MedSupply Co.',
    amount: 850,
    type: 'expense',
    category: 'Supplies',
  },
  {
    id: 'txn_4',
    date: new Date('2024-07-13'),
    description: 'Patient Procedure - A. Smith',
    amount: 1200,
    type: 'income',
    category: 'Patient Income',
  },
  {
    id: 'txn_5',
    date: new Date('2024-07-12'),
    description: 'Electricity Bill',
    amount: 250,
    type: 'expense',
    category: 'Utilities',
  },
  {
    id: 'txn_6',
    date: new Date('2024-07-10'),
    description: 'Staff Salaries - July',
    amount: 12000,
    type: 'expense',
    category: 'Salaries',
  },
  {
    id: 'txn_7',
    date: new Date('2024-07-09'),
    description: 'New Ultrasound Machine',
    amount: 15000,
    type: 'expense',
    category: 'Equipment',
  },
  {
    id: 'txn_8',
    date: new Date('2024-07-08'),
    description: 'Follow-up visit - B. Taylor',
    amount: 150,
    type: 'income',
    category: 'Patient Income',
  },
  {
    id: 'txn_9',
    date: new Date('2024-07-05'),
    description: 'Facebook Ads Campaign',
    amount: 500,
    type: 'expense',
    category: 'Marketing',
  },
  {
    id: 'txn_10',
    date: new Date('2024-07-01'),
    description: 'Professional Liability Insurance',
    amount: 1200,
    type: 'expense',
    category: 'Insurance',
  },
];


export const budgets: Budget[] = [
  { id: 'bud_1', name: 'Salaries', amount: 12000, spent: 12000 },
  { id: 'bud_2', name: 'Rent', amount: 2500, spent: 2500 },
  { id: 'bud_3', name: 'Supplies', amount: 2000, spent: 850 },
  { id: 'bud_4', name: 'Equipment', amount: 5000, spent: 15000 }, // Overspent
  { id: 'bud_5', name: 'Marketing', amount: 1000, spent: 500 },
  { id: 'bud_6', name: 'Utilities', amount: 500, spent: 250 },
  { id: 'bud_7', name: 'Insurance', amount: 1200, spent: 1200 },
];

export const categories: Category[] = [
  'Salaries', 'Rent', 'Supplies', 'Equipment', 'Marketing', 'Insurance', 'Utilities', 'Patient Income', 'Investment Income', 'Loan Payment', 'Other'
];
