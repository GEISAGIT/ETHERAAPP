'use client';
import { AppLayout } from '@/components/layout/app-layout';
import { SettingsClient } from '@/components/settings/settings-client';

export default function SettingsPage() {
  return (
    <AppLayout>
      <SettingsClient />
    </AppLayout>
  );
}
