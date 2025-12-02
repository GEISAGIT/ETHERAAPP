
'use server';
/**
 * @fileOverview An AI agent to categorize transactions.
 *
 * - categorizeTransaction - A function that categorizes a transaction.
 * - CategorizeTransactionInput - The input type for the categorizeTransaction function.
 * - CategorizeTransactionOutput - The return type for the categorizeTransaction function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CategorizeTransactionInputSchema = z.object({
  transactionDescription: z.string().describe('The description of the transaction.'),
  transactionType: z.enum(['income', 'expense']).describe('The type of the transaction (income or expense).'),
});
export type CategorizeTransactionInput = z.infer<typeof CategorizeTransactionInputSchema>;

const CategorizeTransactionOutputSchema = z.object({
  category: z.string().describe('The predicted category of the transaction.'),
  confidence: z.number().describe('The confidence level of the categorization (0-1).'),
});
export type CategorizeTransactionOutput = z.infer<typeof CategorizeTransactionOutputSchema>;

export async function categorizeTransaction(input: CategorizeTransactionInput): Promise<CategorizeTransactionOutput> {
  return categorizeTransactionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'categorizeTransactionPrompt',
  input: {schema: CategorizeTransactionInputSchema},
  output: {schema: CategorizeTransactionOutputSchema},
  prompt: `Você é um assistente financeiro especialista em categorizar transações financeiras para uma clínica.

  Dada a descrição e o tipo da transação, preveja a categoria mais apropriada.
  Retorne um nível de confiança entre 0 e 1 representando a certeza da sua previsão.

  Descrição da Transação: {{{transactionDescription}}}
  Tipo da Transação: {{{transactionType}}}

  Considere as seguintes categorias:
  - Aluguel
  - Luz
  - Condomínio
  - IPTU
  - Celular recarga
  - Internet
  - Empréstimo
  - Marketing
  - Tráfego pago
  - Salário Fernanda Aleixo
  - Salário Kelly
  - Salário Liliane
  - 13° Salário
  - Oxigênio
  - FGTS
  - DARF
  - DAS
  - Aux. funeral
  - Cont. assistencial
  - Limpeza
  - Contabilidade (Córion + Ethera)
  - Estacionamento
  - Capital social Unicred
  - Plus Sante
  - Impressora
  - Feegow
  - C2 manutenção ar cond
  - Material médico
  - Insat medicina trabalho
  - Tirzepatida
  - Injetáveis
  - Mercado + material limpeza
  - Itens escritório
  - Ressarcimento Lilli (mercado +)
  - Banco
  - Le Care
  - Taxa renovação Unicred
  - Metrolbras calibração equipamentos
  - Uber
  - Vistoria bombeiros / taxa vigilância sanitária
  - Comodato dispenser + material Sentax
  - Material gráfico
  - Medx sistema
  - Certificado digital
  - CRM
  - Seguro
  - DEA+ kit emergência
  - Enfermeira
  - Estratégia Mkt
  - Uniformes
  - Material spa
  - Chaveiro
  - Dedetização
  - Adesivos
  - Presentes / recompensa funcionárias
  - Raísa acompanhamento obra
  - Luiz Engenharia
  - Material obra
  - Ar condicionado
  - Persianas
  - Marcenaria Maiks ASP
  - Marmoraria
  - Poltronas
  - Paisagismo
  - Macas
  - Vidraçaria Montrelux
  - Louças / filtro água
  - Impermeabilização
  - Extintores
  - Marido de Aluguel / Vandir
  - Pintura pendentes
  - Decoração
  - Nobreak conserto
  - Computador / teclado e mouse
  - Lixeiras
  - Eletrônicos (tv, cabos)
  - Eletricista
  - Receita de Paciente
  - Receita de Investimento
  - Outros
`,
});

const categorizeTransactionFlow = ai.defineFlow(
  {
    name: 'categorizeTransactionFlow',
    inputSchema: CategorizeTransactionInputSchema,
    outputSchema: CategorizeTransactionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
