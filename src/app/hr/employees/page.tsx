
'use client';
import { AppLayout } from '@/components/layout/app-layout';
import { EmployeesClient } from '@/components/hr/employees-client';
import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { collection, query, doc, where } from 'firebase/firestore';
import type { Employee, UserProfile } from '@/lib/types';

export default function EmployeesPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userProfile, isLoading: profileLoading } = useDoc<UserProfile>(userDocRef);

  const employeesQuery = useMemoFirebase(() => {
    if (!firestore || !user || !userProfile) return null;
    const isAdmin = userProfile.role === 'admin';
    const canView = userProfile.permissions?.employees?.view;

    if (!isAdmin && !canView) return null;

    // Admin/Manager can view all employees for now as it is a global list
    // or we could filter by userId if we wanted strict ownership
    return query(collection(firestore, 'employees'));
  }, [firestore, user, userProfile]);

  const { data: employees, isLoading: employeesLoading } = useCollection<Employee>(employeesQuery);

  const isLoading = profileLoading || employeesLoading;

  return (
    <AppLayout>
      <EmployeesClient 
        data={employees ?? []} 
        isLoading={isLoading}
        userProfile={userProfile}
      />
    </AppLayout>
  );
}
