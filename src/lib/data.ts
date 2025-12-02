import type { Transaction, Budget, Category } from './types';
import { Timestamp } from 'firebase/firestore';

// This file now contains only static category data.
// Transaction and Budget data will be fetched from Firestore.

export const categories: Category[] = [
  'Salários', 'Aluguel', 'Suprimentos', 'Equipamentos', 'Marketing', 'Seguros', 'Serviços Públicos', 'Receita de Paciente', 'Receita de Investimento', 'Pagamento de Empréstimo', 'Outros'
];
