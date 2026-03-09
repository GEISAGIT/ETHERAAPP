import type { Permissions, ExpenseCategoryGroup } from './types';

export const defaultPermissions: Record<'admin' | 'user', Permissions> = {
  admin: {
    home: { view: true },
    dashboard: { view: true },
    transactions: { view: true, create: true, edit: true, delete: true },
    contracts: { view: true, create: true, edit: true, delete: true },
    expenses: { view: true, create: true, edit: true, delete: true },
    budgets: { view: true, create: true, edit: true, delete: true },
    reports: { view: true },
    upload: { view: true, create: true, edit: true, delete: true },
    apiBank: { view: true },
    userManagement: { view: true, create: true, edit: true, delete: true },
    profile: { view: true, edit: true },
    settings: { view: true },
    hrTimesheet: { view: true, create: true, edit: true, delete: true },
    employees: { view: true, create: true, edit: true, delete: true },
    timeTracking: { view: true, create: true, edit: true, delete: true },
    timeCard: { view: true, create: true, edit: true, delete: true },
  },
  user: {
    home: { view: true },
    dashboard: { view: false },
    transactions: { view: false, create: false, edit: false, delete: false },
    contracts: { view: false, create: false, edit: false, delete: false },
    expenses: { view: false, create: false, edit: false, delete: false },
    budgets: { view: false, create: false, edit: false, delete: false },
    reports: { view: false },
    upload: { view: false, create: false, edit: false, delete: false },
    apiBank: { view: false },
    userManagement: { view: false, create: false, edit: false, delete: false },
    profile: { view: true, edit: true },
    settings: { view: false },
    hrTimesheet: { view: false, create: false, edit: false, delete: false },
    employees: { view: false, create: false, edit: false, delete: false },
    timeTracking: { view: true, create: true, edit: false, delete: false },
    timeCard: { view: true, create: true, edit: false, delete: false },
  },
};

export const defaultExpenseCategoryGroups: Omit<ExpenseCategoryGroup, 'id'>[] = [
    {
        name: 'PESSOAL E ENCARGOS',
        categories: []
    },
    {
        name: 'MATERIAIS MÉDICOS E MEDICAMENTOS',
        categories: []
    },
    {
        name: 'INFRAESTRUTURA',
        categories: []
    },
    {
        name: 'TECNOLOGIA E EQUIPAMENTOS',
        categories: []
    },
    {
        name: 'MARKETING E COMERCIAL',
        categories: []
    },
    {
        name: 'DESPESAS GERAIS E ADMINISTRATIVAS',
        categories: []
    },
];
