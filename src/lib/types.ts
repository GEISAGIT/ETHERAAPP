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
  receiptUrl?: string; // Added for consistency, though less common for income
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
  category: string; // This will eventually be hierarchical
  costType?: 'fixed' | 'variable';
  notes?: string;
  receiptUrl?: string;
  updatedAt?: Timestamp;
  updatedBy?: string; // UID of user who last updated
  fullCategoryPath?: {
    group: string;
    category: string;
    description: string;
  }
}

export type Transaction = IncomeTransaction | ExpenseTransaction;


export type Budget = {
  id: string;
  name: string;
  amount: number;
  spent: number;
};

// Old simple category type
export type IncomeCategory = {
  id: string;
  name: string;
  description?: string;
};

// NEW HIERARCHICAL EXPENSE CATEGORY STRUCTURE
export interface ExpenseSubCategory {
  id: string;
  name: string;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  subCategories: ExpenseSubCategory[];
}

export interface ExpenseCategoryGroup {
  id: string;
  name: string;
  categories: ExpenseCategory[];
}

export type Category = string;

export type CrudActions = {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
};

export type ViewEditActions = {
    view: boolean;
    edit: boolean;
}

export type ViewOnlyActions = {
    view: boolean;
}

export type Permissions = {
  dashboard: ViewOnlyActions;
  transactions: CrudActions;
  budgets: CrudActions;
  reports: ViewOnlyActions;
  upload: CrudActions;
  userManagement: CrudActions;
  profile: ViewEditActions;
  settings: ViewOnlyActions;
};


export type UserStatus = 'pending' | 'active' | 'rejected';

export type UserProfile = {
    uid: string;
    displayName: string;
    email: string;
    photoURL?: string;
    role: 'admin' | 'user';
    status: UserStatus;
    createdAt: Timestamp;
    permissions: Permissions;
}

export type UserManagement = Omit<UserProfile, 'permissions'>;


export type Role = {
  id: 'admin' | 'user';
  permissions: Permissions;
};

export type MenuItemKey = keyof Permissions;

export type ContractStatus = 'active' | 'cancelled' | 'expired';

export type Contract = {
  id: string;
  userId: string;
  name: string;
  description?: string;
  type: 'fixed' | 'variable';
  amount?: number;
  status: ContractStatus;
  paymentFrequency: 'monthly' | 'bimonthly' | 'quarterly' | 'semiannually' | 'annually';
  paymentDueDate?: number;
  expirationDate?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  fullCategoryPath?: {
    group: string;
    category: string;
    description: string;
  }
};
