import { Timestamp } from 'firebase/firestore';

export type IncomeTransaction = {
  id: string;
  date: Timestamp;
  description: string;
  amount: number;
  type: 'income';
  category: string;
}

export type ExpenseTransaction = {
  id: string;
  date: Timestamp;
  description: string;
  amount: number;
  type: 'expense';
  category: string;
  costType?: 'fixed' | 'variable';
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

export type ExpenseCategory = {
  id: string;
  name: string;
  description?: string;
};

export type Category = string;
