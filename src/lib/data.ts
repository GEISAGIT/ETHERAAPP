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
    dashboard: true,
    transactions: true,
    budgets: true,
    reports: true,
    upload: true,
    userManagement: true,
    profile: true,
    settings: true,
  },
  user: {
    dashboard: true,
    transactions: true,
    budgets: true,
    reports: true,
    upload: true,
    userManagement: false,
    profile: true,
    settings: true,
  },
};

export const defaultExpenseCategoryGroups: Omit<ExpenseCategoryGroup, 'id'>[] = [
    {
        name: 'PESSOAL E ENCARGOS',
        categories: [
            { id: 'cat1-1', name: 'BENEFICIOS', subCategories: [{ id: 'sub1-1-1', name: 'VA - VALE ALIMENTACAO' }] }
        ]
    },
    {
        name: 'MATERIAIS MEDICOS E MEDICAMENTOS',
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
