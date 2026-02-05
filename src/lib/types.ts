'use client';

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
  apiBank: ViewOnlyActions;
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

export type CoraToken = {
    userId: string;
    accessToken: string;
    refreshToken: string;
    expiresAt: Timestamp;
    scope: string;
    tokenType: string;
};

export type CoraAccountData = {
  agency: string;
  accountNumber: string;
  accountDigit: string;
  bankCode: string;
  bankName: string;
};

export type CoraStatementCounterParty = {
  name: string;
  identity: string;
};

export type CoraStatementTransaction = {
  id: string;
  type: string;
  description: string;
  counterParty: CoraStatementCounterParty;
};

export type CoraStatementEntry = {
  id: string;
  type: 'CREDIT' | 'DEBIT';
  amount: number; // in cents
  createdAt: string; // ISO Date string
  transaction: CoraStatementTransaction;
};

export type CoraStatementHeader = {
  businessName: string;
  businessDocument: string;
};

export type CoraStatementBoundary = {
    date: string;
    balance: number; // in cents
}

export type CoraStatement = {
  header: CoraStatementHeader;
  start: CoraStatementBoundary;
  end: CoraStatementBoundary;
  entries: CoraStatementEntry[];
};

export type CoraCreditor = {
  name: string;
  document: string;
  type: 'CPF' | 'CNPJ';
}

export type CoraPaymentInitiationResponse = {
    id: string;
    status: 'INITIATED' | string;
    amount: number;
    creditor: CoraCreditor;
    created_at: string;
    scheduled_at?: string;
    code?: string;
};


// --- BOLETO V2 TYPES ---

export type CoraCustomerAddress = {
    street: string;
    number: string;
    district: string;
    city: string;
    state: string;
    zip_code: string;
    complement?: string;
};

export type CoraCustomer = {
    name: string;
    email: string;
    document: {
        identity: string;
        type: 'CPF' | 'CNPJ';
    };
    address: CoraCustomerAddress;
};

export type CoraService = {
    name: string;
    description: string;
    amount: number; // in cents
};

export type CoraFine = {
    rate: number; // Percentage
};

export type CoraInterest = {
    rate: number; // Percentage
};

export type CoraPaymentTerms = {
    due_date: string; // YYYY-MM-DD
    fine?: CoraFine;
    interest?: CoraInterest;
};

export type CoraBoletoRequestBody = {
    external_id?: string;
    customer: CoraCustomer;
    services: CoraService[];
    payment_terms: CoraPaymentTerms;
    payment_forms: Array<'BANK_SLIP'>;
    instructions?: string;
};


export type CoraBoletoResponse = {
    bank_slip_id?: string; // Kept for compatibility with old responses
    barcode: string;
    digitable_line: string;
    // V2 responses might have a different structure
    id?: string;
    code?: string;
    status?: string;
};
