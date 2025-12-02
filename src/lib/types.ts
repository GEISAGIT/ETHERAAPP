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
