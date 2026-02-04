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


// --- BOLETO TYPES ---

export type CoraBoletoCustomer = {
    name: string;
    email: string;
    document: {
        identity: string;
        type: 'CPF' | 'CNPJ';
    };
};

export type CoraBoletoService = {
    name: string;
    description: string;
    amount: number; // in cents
};

export type CoraBoletoPaymentTerms = {
    due_date: string; // YYYY-MM-DD
};

export type CoraBoletoRequestBody = {
    customer: CoraBoletoCustomer;
    services: CoraBoletoService[];
    payment_terms: CoraBoletoPaymentTerms;
    payment_forms: ('BANK_SLIP' | 'PIX')[];
};

export type CoraBoletoResponse = {
    id: string;
    status: string;
    created_at: string;
    total_amount: number; // in cents
    payment_options: {
        bank_slip: {
            barcode: string;
            digitable: string;
            url: string; // PDF link
        }
    };
    // ... other fields are optional for our purpose
}
