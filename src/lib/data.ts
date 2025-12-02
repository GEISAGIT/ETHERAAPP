

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

// Remove duplicates to prevent React key errors
export const defaultExpenseCategories = [...new Set(rawExpenseCategories)];


export const defaultIncomeCategories = [
  "Receita de Paciente",
  "Receita de Convênio",
  "Aluguel de Sala",
  "Venda de Produtos",
  "Outras Receitas",
];
