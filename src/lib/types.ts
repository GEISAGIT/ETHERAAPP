
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
  home: ViewOnlyActions;
  dashboard: ViewOnlyActions;
  transactions: CrudActions;
  budgets: CrudActions;
  reports: ViewOnlyActions;
  upload: CrudActions;
  apiBank: ViewOnlyActions;
  userManagement: CrudActions;
  profile: ViewEditActions;
  settings: ViewOnlyActions;
  hrTimesheet: CrudActions;
  employees: CrudActions;
  timeTracking: CrudActions;
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
    mustChangePassword?: boolean;
    statusText?: string;
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

export type EmployeeStatus = 'active' | 'inactive' | 'on_leave';
export type EmployeeRegime = 'CLT' | 'PJ' | 'intern' | 'other';
export type OvertimePolicy = 'overtime' | 'time_bank';
export type WorkStatus = 'regular' | 'temporary' | 'probation' | 'inactive';

export interface EmployeeDiscount {
  id: string;
  name: string;
  percentage: number;
}

export interface TimeAdjustment {
  id: string;
  startDate: Timestamp;
  endDate: Timestamp;
  reason: string;
}

export interface CompensationRecord {
  id: string;
  date?: Timestamp;
  startDate?: Timestamp;
  endDate?: Timestamp;
  type: 'date' | 'period';
  description: string;
}

export interface EmployeeDocument {
  id: string;
  name: string;
  url: string;
  uploadedAt: Timestamp;
}

export type Employee = {
  id: string;
  userId: string; // Creator
  fullName: string;
  cpf: string;
  email?: string;
  phone?: string;
  position?: string;
  department?: string;
  hireDate?: Timestamp;
  dismissalDate?: Timestamp;
  status: EmployeeStatus;
  regimeType: EmployeeRegime;
  overtimePolicy: OvertimePolicy;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  
  // Novas propriedades de Folha/Ponto
  registrationNumber?: string;
  pisPasep?: string;
  ctps?: string;
  workStatus?: WorkStatus;
  discounts?: EmployeeDiscount[];
  experienceEndDate?: Timestamp;
  adjustments?: TimeAdjustment[];
  compensations?: CompensationRecord[];
  vacationExpirationDate?: Timestamp;
  documents?: EmployeeDocument[];
};

export type AttendanceType = 'clock_in' | 'clock_out' | 'break_start' | 'break_end';

export type AttendanceRecord = {
  id: string;
  employeeId: string;
  employeeName: string;
  timestamp: Timestamp;
  type: AttendanceType;
  photoUrl?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
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


// --- INVOICE (BOLETO/PIX V2) TYPES ---

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
    amount: number; // in cents
};

export type CoraPaymentTerms = {
    due_date: string; // YYYY-MM-DD
    fine?: CoraFine;
};

export type CoraInvoiceRequestBody = {
    code?: string;
    customer: CoraCustomer;
    services: CoraService[];
    payment_terms: CoraPaymentTerms;
    payment_forms: Array<'BANK_SLIP' | 'PIX'>;
    instructions?: string;
};

export type CoraInvoiceResponse = {
    id: string;
    code?: string;
    status: string;

    // Boleto specific
    bank_slip?: {
        digitable_line: string;
        barcode: string;
        url: string;
    };

    // Pix specific
    pix?: {
        emv: string; // Copia e Cola
    };
    payment_options?: {
        bank_slip?: {
            url: string; // PNG URL of QR code
        };
    };
};
