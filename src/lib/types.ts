
import { Timestamp } from 'firebase/firestore';

export type IncomeTransaction = {
  id: string;
  userId: string; // Creator's UID
  createdByName: string;
  date: Timestamp;
  description: string;
  amount: number;
  type: 'income';
  category: string;
  notes?: string;
  updatedAt?: Timestamp;
  updatedBy?: string; // UID of user who last updated
}

export type ExpenseTransaction = {
  id:string;
  userId: string; // Creator's UID
  createdByName: string;
  date: Timestamp;
  description: string;
  amount: number;
  type: 'expense';
  category: string;
  costType?: 'fixed' | 'variable';
  notes?: string;
  updatedAt?: Timestamp;
  updatedBy?: string; // UID of user who last updated
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

export type Permissions = {
  dashboard: boolean;
  transactions: boolean;
  budgets: boolean;
  reports: boolean;
  upload: boolean;
  profile: boolean;
  settings: boolean;
  userManagement: boolean;
};

export type UserStatus = 'pending' | 'active' | 'rejected';

export type UserProfile = {
    uid: string;
    displayName: string;
    email: string;
    role: 'admin' | 'user';
    status: UserStatus;
    createdAt: Timestamp;
    permissions: Permissions;
}

export type UserManagement = Omit<UserProfile, 'permissions'>;


export type Role = {
  id: 'admin' | 'user';
  permissions: Omit<Permissions, 'accessControl'> & { accessControl?: boolean };
};

export type MenuItemKey = keyof Omit<Permissions, 'accessControl'> | 'accessControl';
    