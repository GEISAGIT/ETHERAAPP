import { AppLayout } from '@/components/layout/app-layout';
import { ReportsClient } from '@/components/reports/reports-client';
import { transactions } from '@/lib/data';

export default function ReportsPage() {
  const data = transactions;

  return (
    <AppLayout>
      <ReportsClient data={data} />
    </AppLayout>
  );
}
