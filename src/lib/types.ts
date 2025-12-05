import { Timestamp } from 'firebase/firestore';

export type IncomeTransaction = {
  id: string;
  date: Timestamp;
  description: string;
  amount: number;
  type: 'income';
  category: string;
  notes?: string;
}

export type ExpenseTransaction = {
  id: string;
  date: Timestamp;
  description: string;
  amount: number;
  type: 'expense';
  category: string;
  costType?: 'fixed' | 'variable';
  notes?: string;
}

export type Transaction = IncomeTransaction | ExpenseTransaction;


export type Budget = {
  id: string;
  name: string;
  amount: number;
  spent: number;
};

export type IncomeCategory = {
  id: string;
  name: string;
  description?: string;
};

export type ExpenseCategory = {
  id: string;
  name: string;
  description?: string;
};

export type Category = string;

export type UserManagement = {
    uid: string;
    displayName: string;
    email: string;
    role: 'admin' | 'user';
    createdAt: Timestamp;
}

export type Permissions = {
  dashboard: boolean;
  transactions: boolean;
  budgets: boolean;
  reports: boolean;
  upload: boolean;
  profile: boolean;
  settings: boolean;
  userManagement: boolean;
  accessControl: boolean;
};

export type Role = {
  id: 'admin' | 'user';
  permissions: Permissions;
};

export type MenuItemKey = keyof Permissions;

    