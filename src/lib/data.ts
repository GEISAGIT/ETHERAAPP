
import type { Permissions, ExpenseCategoryGroup } from './types';

// This is now deprecated and will be replaced by the hierarchical structure.
const rawExpenseCategories = [
  "Aluguel",
  "Condomínio",
  "IPTU",
  "Luz",
  "Água",
  "Telefone/Internet",
  "Seguro",
  "Sistema/Software",
  "Contabilidade",
  "Marketing Fixo",
  "Salário",
  "Pró-labore",
  "Benefícios (VT, VA)",
  "Impostos sobre a folha (INSS, FGTS)",
  "Taxas de Cartão",
  "Anuidades de Conselhos",
  "Outros Custos Fixos",
  "Material de escritório",
  "Material de limpeza",
  "Material médico descartável",
  "Medicamentos",
  "Uniformes",
  "Manutenção de Equipamentos",
  "Marketing Variável (Campanhas)",
  "Comissões",
  "Serviços Terceirizados",
  "Viagens e Deslocamentos",
  "Outros Custos Variáveis",
];

export const defaultExpenseCategories = [...new Set(rawExpenseCategories)];


export const defaultIncomeCategories = [
  "Receita de Paciente",
  "Receita de Convênio",
  "Aluguel de Sala",
  "Venda de Produtos",
  "Outras Receitas",
];

export const defaultPermissions: Record<'admin' | 'user', Permissions> = {
  admin: {
    home: { view: true },
    dashboard: { view: true },
    transactions: { view: true, create: true, edit: true, delete: true },
    budgets: { view: true, create: true, edit: true, delete: true },
    reports: { view: true },
    upload: { view: true, create: true, edit: true, delete: true },
    apiBank: { view: true },
    userManagement: { view: true, create: true, edit: true, delete: true },
    profile: { view: true, edit: true },
    settings: { view: true },
    hrTimesheet: { view: true, create: true, edit: true, delete: true },
    employees: { view: true, create: true, edit: true, delete: true },
  },
  user: {
    home: { view: true },
    dashboard: { view: false },
    transactions: { view: false, create: false, edit: false, delete: false },
    budgets: { view: false, create: false, edit: false, delete: false },
    reports: { view: false },
    upload: { view: false, create: false, edit: false, delete: false },
    apiBank: { view: false },
    userManagement: { view: false, create: false, edit: false, delete: false },
    profile: { view: true, edit: true },
    settings: { view: false },
    hrTimesheet: { view: false, create: false, edit: false, delete: false },
    employees: { view: false, create: false, edit: false, delete: false },
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
