'use server';

import { categorizeTransaction, type CategorizeTransactionInput } from '@/ai/flows/categorize-transactions';

export async function suggestCategory(input: CategorizeTransactionInput) {
  try {
    const result = await categorizeTransaction(input);
    return result;
  } catch (error) {
    console.error("Error in suggestCategory server action:", error);
    // Don't re-throw, just return an empty object or a specific error structure
    return { category: null, confidence: 0, error: "Failed to get suggestion." };
  }
}
