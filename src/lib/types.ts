
'use client';

import { Timestamp } from 'firebase/firestore';

export type IncomeTransaction = {
  id: string;
  userId: string;
  createdByName: string;
  date: Timestamp;
  description: string;
  amount: number;
  type: 'income';
  category: string;
  notes?: string;
  receiptUrl?: string;
  updatedAt?: Timestamp;
  updatedBy?: string;
}

export type ExpenseTransaction = {
  id:string;
  userId: string;
  createdByName: string;
  date: Timestamp;
  description: string;
  amount: number;
  type: 'expense';
  category: string;
  costType?: 'fixed' | 'variable';
  notes?: string;
  receiptUrl?: string;
  updatedAt?: Timestamp;
  updatedBy?: string;
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

export type IncomeCategory = {
  id: string;
  name: string;
  description?: string;
};

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

export type CrudActions = {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
};

export type Permissions = {
  // Financeiro
  dashboard: CrudActions;
  transactions: CrudActions;
  contracts: CrudActions;
  expenses: CrudActions;
  budgets: CrudActions;
  reports: CrudActions;
  apiBank: CrudActions;
  // RH
  timeTracking: CrudActions;
  employees: CrudActions;
  hrTimesheet: CrudActions;
  // Suprimentos
  suppliesStock: CrudActions;
  stockCategories: CrudActions;
  addresses: CrudActions;
  // Operacional
  activities: CrudActions;
  // Administração
  upload: CrudActions;
  userManagement: CrudActions;
  // Geral
  home: CrudActions;
  profile: CrudActions;
  settings: CrudActions;
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
export type WorkScheduleType = '5x2' | '6x1' | '12x36' | 'custom';

export interface DailySchedule {
  workDay: boolean;
  start: string; // HH:mm
  end: string;
  lunchStart: string;
  lunchEnd: string;
}

export interface WorkSchedule {
  type: WorkScheduleType;
  days: Record<number, DailySchedule>; // 0 (Dom) a 6 (Sab)
}

export type AdjustmentType = 'absence' | 'medical_certificate' | 'holiday' | 'day_off' | 'compensation' | 'other';

export interface EmployeeDiscount {
  id: string;
  name: string;
  percentage: number;
}

export interface TimeAdjustment {
  id: string;
  date: Timestamp;
  type: AdjustmentType;
  description: string;
  hoursToAcknowledge?: number;
  attachmentUrl?: string;
  attachmentName?: string;
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
  userId: string;
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
  workSchedule?: WorkSchedule;
  createdAt: Timestamp;
  updatedAt: Timestamp;
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
  manual?: boolean;
  notes?: string;
  updatedBy?: string;
  updatedByName?: string;
};

export type TimeClockEntry = {
  id: string;
  userId: string;
  userName: string;
  timestamp: Timestamp;
  type: 'entrada' | 'saida_almoco' | 'volta_almoco' | 'saida';
  dateStr: string;
}

export type StorageLocation = {
  id: string;
  userId: string;
  name: string;
  description?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type Address = StorageLocation;

export type StockItem = {
  id: string;
  name: string;
  category: string;
  quantity: number;
  minQuantity: number;
  unit: string;
  locationId: string;
  locationName?: string;
  manufacturingDate?: Timestamp;
  expiryDate?: Timestamp;
  lastRestock?: Timestamp;
  updatedAt: Timestamp;
  updatedBy: string;
}

export type StockCategory = {
  id: string;
  name: string;
}

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

export type CoraStatementEntry = {
  id: string;
  type: 'CREDIT' | 'DEBIT';
  amount: number;
  createdAt: string;
  transaction: {
    description: string;
    counterParty?: { name: string };
  };
};

export type CoraStatement = {
  entries: CoraStatementEntry[];
};

export type CoraInvoiceRequestBody = {
    code?: string;
    customer: {
        name: string;
        email: string;
        document: { identity: string; type: 'CPF' | 'CNPJ' };
        address: { street: string; number: string; district: string; city: string; state: string; zip_code: string; complement?: string };
    };
    services: Array<{ name: string; description: string; amount: number }>;
    payment_terms: { due_date: string };
    payment_forms: Array<'BANK_SLIP' | 'PIX'>;
};

export type CoraInvoiceResponse = {
    id: string;
    bank_slip?: { digitable_line: string; barcode: string; url: string };
    pix?: { emv: string; image_url?: string };
    payment_options?: { bank_slip?: { url: string }, pix?: { emv: string; image_url?: string } };
};

export type CoraPaymentInitiationResponse = {
    id: string;
    status: string;
    amount: number;
    creditor: { name: string };
};

export type ActivityStatus = 'pending' | 'in_progress' | 'waiting_validation' | 'completed' | 'rework';
export type ActivityPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface ActivityHistoryItem {
  content: string;
  timestamp: Timestamp;
  userName: string;
  userId: string;
}

export type Activity = {
  id: string;
  title: string;
  description: string;
  status: ActivityStatus;
  priority: ActivityPriority;
  requesterId: string;
  requesterName: string;
  assigneeId?: string;
  assigneeName?: string;
  deadline?: Timestamp;
  startDescription?: string;
  completionDescription?: string;
  rejectionReason?: string;
  history?: ActivityHistoryItem[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
};
