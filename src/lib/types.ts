import { Timestamp } from 'firebase/firestore';

export type Transaction = {
  id: string;
  date: Timestamp;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: Category;
};

export type Budget = {
  id: string;
  name: Category;
  amount: number;
  spent: number;
};

export type IncomeCategory = {
  id: string;
  name: string;
  description?: string;
};

export type ExpenseCategory = {
  id: string;
  name: string;
  description?: string;
};

export type Category = 
  | 'Salários'
  | 'Aluguel'
  | 'Suprimentos'
  | 'Equipamentos'
  | 'Marketing'
  | 'Seguros'
  | 'Serviços Públicos'
  | 'Receita de Paciente'
  | 'Receita de Investimento'
  | 'Pagamento de Empréstimo'
  | 'Outros';
