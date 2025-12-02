import { AppLayout } from '@/components/layout/app-layout';
import { DashboardClient } from '@/components/dashboard/dashboard-client';

export default function DashboardPage() {
  return (
    <AppLayout>
      <DashboardClient />
    </AppLayout>
  );
}
