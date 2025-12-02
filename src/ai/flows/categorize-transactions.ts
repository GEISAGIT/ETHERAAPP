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
  prompt: `You are an expert financial assistant specializing in categorizing financial transactions for a clinic.

  Given the description and type of the transaction, predict the most appropriate category.
  Return a confidence level between 0 and 1 representing the certainty of your prediction.

  Transaction Description: {{{transactionDescription}}}
  Transaction Type: {{{transactionType}}}

  Consider the following categories:
  - Salaries
  - Rent
  - Supplies
  - Equipment
  - Marketing
  - Insurance
  - Utilities
  - Patient Income
  - Investment Income
  - Loan Payment
  - Other
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
