export type Transaction = {
  id: string;
  date: Date;
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

export type Category = 
  | 'Salaries'
  | 'Rent'
  | 'Supplies'
  | 'Equipment'
  | 'Marketing'
  | 'Insurance'
  | 'Utilities'
  | 'Patient Income'
  | 'Investment Income'
  | 'Loan Payment'
  | 'Other';
