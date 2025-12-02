import { AppLayout } from '@/components/layout/app-layout';
import { TransactionsClient } from '@/components/transactions/transactions-client';
import { transactions } from '@/lib/data';

export default function TransactionsPage() {
  // In a real app, you'd fetch this data
  const data = transactions;

  return (
    <AppLayout>
      <TransactionsClient data={data} />
    </AppLayout>
  );
}
