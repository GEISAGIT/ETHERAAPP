
import type { Permissions, ExpenseCategoryGroup, CrudActions } from './types';

const fullCrud: CrudActions = { view: true, create: true, edit: true, delete: true };
const noCrud: CrudActions = { view: false, create: false, edit: false, delete: false };
const viewOnly: CrudActions = { view: true, create: false, edit: false, delete: false };

export const defaultPermissions: Record<'admin' | 'user', Permissions> = {
  admin: {
    home: fullCrud,
    dashboard: fullCrud,
    transactions: fullCrud,
    contracts: fullCrud,
    expenses: fullCrud,
    budgets: fullCrud,
    reports: fullCrud,
    upload: fullCrud,
    apiBank: fullCrud,
    userManagement: fullCrud,
    profile: fullCrud,
    settings: fullCrud,
    hrTimesheet: fullCrud,
    employees: fullCrud,
    timeTracking: fullCrud,
    suppliesStock: fullCrud,
    addresses: fullCrud,
    activities: fullCrud,
  },
  user: {
    home: viewOnly,
    dashboard: noCrud,
    transactions: noCrud,
    contracts: noCrud,
    expenses: noCrud,
    budgets: noCrud,
    reports: noCrud,
    upload: noCrud,
    apiBank: noCrud,
    userManagement: noCrud,
    profile: { view: true, create: false, edit: true, delete: false },
    settings: noCrud,
    hrTimesheet: noCrud,
    employees: noCrud,
    timeTracking: { view: true, create: true, edit: false, delete: false },
    suppliesStock: noCrud,
    addresses: noCrud,
    activities: { view: true, create: true, edit: true, delete: false },
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
