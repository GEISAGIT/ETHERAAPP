import { Timestamp } from 'firebase/firestore';

export type IncomeTransaction = {
  id: string;
  date: Timestamp;
  description: string;
  amount: number;
  type: 'income';
  category: Category;
}

export type ExpenseTransaction = {
  id: string;
  date: Timestamp;
  description: string;
  amount: number;
  type: 'expense';
  category: Category;
  costType?: 'fixed' | 'variable';
}

export type Transaction = IncomeTransaction | ExpenseTransaction;


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
  | 'Aluguel'
  | 'Luz'
  | 'Condomínio'
  | 'IPTU'
  | 'Celular recarga'
  | 'Internet'
  | 'Empréstimo'
  | 'Marketing'
  | 'Tráfego pago'
  | 'Salário Fernanda Aleixo'
  | 'Salário Kelly'
  | 'Salário Liliane'
  | '13° Salário'
  | 'Oxigênio'
  | 'FGTS'
  | 'DARF'
  | 'DAS'
  | 'Aux. funeral'
  | 'Cont. assistencial'
  | 'Limpeza'
  | 'Contabilidade (Córion + Ethera)'
  | 'Estacionamento'
  | 'Capital social Unicred'
  | 'Plus Sante'
  | 'Impressora'
  | 'Feegow'
  | 'C2 manutenção ar cond'
  | 'Material médico'
  | 'Insat medicina trabalho'
  | 'Tirzepatida'
  | 'Injetáveis'
  | 'Mercado + material limpeza'
  | 'Itens escritório'
  | 'Ressarcimento Lilli (mercado +)'
  | 'Banco'
  | 'Le Care'
  | 'Taxa renovação Unicred'
  | 'Metrolbras calibração equipamentos'
  | 'Uber'
  | 'Vistoria bombeiros / taxa vigilância sanitária'
  | 'Comodato dispenser + material Sentax'
  | 'Material gráfico'
  | 'Medx sistema'
  | 'Certificado digital'
  | 'CRM'
  | 'Seguro'
  | 'DEA+ kit emergência'
  | 'Enfermeira'
  | 'Estratégia Mkt'
  | 'Uniformes'
  | 'Material spa'
  | 'Chaveiro'
  | 'Dedetização'
  | 'Adesivos'
  | 'Presentes / recompensa funcionárias'
  | 'Raísa acompanhamento obra'
  | 'Luiz Engenharia'
  | 'Material obra'
  | 'Ar condicionado'
  | 'Persianas'
  | 'Marcenaria Maiks ASP'
  | 'Marmoraria'
  | 'Poltronas'
  | 'Paisagismo'
  | 'Macas'
  | 'Vidraçaria Montrelux'
  | 'Louças / filtro água'
  | 'Impermeabilização'
  | 'Extintores'
  | 'Marido de Aluguel / Vandir'
  | 'Pintura pendentes'
  | 'Decoração'
  | 'Nobreak conserto'
  | 'Computador / teclado e mouse'
  | 'Lixeiras'
  | 'Eletrônicos (tv, cabos)'
  | 'Eletricista'
  | 'Receita de Paciente'
  | 'Receita de Investimento'
  | 'Outros';