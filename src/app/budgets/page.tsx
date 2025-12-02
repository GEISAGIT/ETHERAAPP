import { AppLayout } from '@/components/layout/app-layout';
import { BudgetsClient } from '@/components/budgets/budgets-client';
import { budgets } from '@/lib/data';

export default function BudgetsPage() {
  const data = budgets;

  return (
    <AppLayout>
      <BudgetsClient data={data} />
    </AppLayout>
  );
}
