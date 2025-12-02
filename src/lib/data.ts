import type { Transaction, Budget, Category } from './types';

export const transactions: Transaction[] = [
  {
    id: 'txn_1',
    date: new Date('2024-07-15'),
    description: 'Consulta Paciente - J. Silva',
    amount: 300,
    type: 'income',
    category: 'Receita de Paciente',
  },
  {
    id: 'txn_2',
    date: new Date('2024-07-14'),
    description: 'Aluguel do Consultório - Julho',
    amount: 2500,
    type: 'expense',
    category: 'Aluguel',
  },
  {
    id: 'txn_3',
    date: new Date('2024-07-14'),
    description: 'Pedido de material médico - MedSupply Co.',
    amount: 850,
    type: 'expense',
    category: 'Suprimentos',
  },
  {
    id: 'txn_4',
    date: new Date('2024-07-13'),
    description: 'Procedimento Paciente - A. Santos',
    amount: 1200,
    type: 'income',
    category: 'Receita de Paciente',
  },
  {
    id: 'txn_5',
    date: new Date('2024-07-12'),
    description: 'Conta de Energia Elétrica',
    amount: 250,
    type: 'expense',
    category: 'Serviços Públicos',
  },
  {
    id: 'txn_6',
    date: new Date('2024-07-10'),
    description: 'Salários da Equipe - Julho',
    amount: 12000,
    type: 'expense',
    category: 'Salários',
  },
  {
    id: 'txn_7',
    date: new Date('2024-07-09'),
    description: 'Novo Aparelho de Ultrassom',
    amount: 15000,
    type: 'expense',
    category: 'Equipamentos',
  },
  {
    id: 'txn_8',
    date: new Date('2024-07-08'),
    description: 'Consulta de retorno - B. Oliveira',
    amount: 150,
    type: 'income',
    category: 'Receita de Paciente',
  },
  {
    id: 'txn_9',
    date: new Date('2024-07-05'),
    description: 'Campanha de Anúncios no Facebook',
    amount: 500,
    type: 'expense',
    category: 'Marketing',
  },
  {
    id: 'txn_10',
    date: new Date('2024-07-01'),
    description: 'Seguro de Responsabilidade Civil Profissional',
    amount: 1200,
    type: 'expense',
    category: 'Seguros',
  },
];


export const budgets: Budget[] = [
  { id: 'bud_1', name: 'Salários', amount: 12000, spent: 12000 },
  { id: 'bud_2', name: 'Aluguel', amount: 2500, spent: 2500 },
  { id: 'bud_3', name: 'Suprimentos', amount: 2000, spent: 850 },
  { id: 'bud_4', name: 'Equipamentos', amount: 5000, spent: 15000 }, // Overspent
  { id: 'bud_5', name: 'Marketing', amount: 1000, spent: 500 },
  { id: 'bud_6', name: 'Serviços Públicos', amount: 500, spent: 250 },
  { id: 'bud_7', name: 'Seguros', amount: 1200, spent: 1200 },
];

export const categories: Category[] = [
  'Salários', 'Aluguel', 'Suprimentos', 'Equipamentos', 'Marketing', 'Seguros', 'Serviços Públicos', 'Receita de Paciente', 'Receita de Investimento', 'Pagamento de Empréstimo', 'Outros'
];
