'use client';
import { AppLayout } from '@/components/layout/app-layout';
import { UploadClient } from '@/components/upload/upload-client';

export default function UploadPage() {
  return (
    <AppLayout>
      <UploadClient />
    </AppLayout>
  );
}
