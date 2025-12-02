// categorize-transactions.ts
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
  - Salários
  - Aluguel
  - Suprimentos
  - Equipamentos
  - Marketing
  - Seguros
  - Serviços Públicos
  - Receita de Paciente
  - Receita de Investimento
  - Pagamento de Empréstimo
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
