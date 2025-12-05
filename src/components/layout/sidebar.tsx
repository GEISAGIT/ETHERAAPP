
'use client';

import { usePathname } from 'next/navigation';
import {
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarHeader,
} from '@/components/ui/sidebar';
import { ArrowRightLeft, BarChart3, LayoutDashboard, PiggyBank, Settings, User, Upload, Users, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useUser } from '@/firebase';
import { useDoc, useMemoFirebase } from '@/firebase';
import { doc, getFirestore } from 'firebase/firestore';
import type { Role, MenuItemKey } from '@/lib/types';
import { useMemo } from 'react';

const allMenuItems = [
  { key: 'dashboard' as MenuItemKey, href: '/dashboard', label: 'Painel', icon: LayoutDashboard },
  { key: 'transactions' as MenuItemKey, href: '/transactions', label: 'Transações', icon: ArrowRightLeft },
  { key: 'budgets' as MenuItemKey, href: '/budgets', label: 'Orçamentos', icon: PiggyBank },
  { key: 'reports' as MenuItemKey, href: '/reports', label: 'Relatórios', icon: BarChart3 },
  { key: 'upload' as MenuItemKey, href: '/upload', label: 'Upload', icon: Upload },
  { key: 'profile' as MenuItemKey, href: '/profile', label: 'Perfil', icon: User },
  { key: 'settings' as MenuItemKey, href: '/settings', label: 'Configurações', icon: Settings },
  { key: 'userManagement' as MenuItemKey, href: '/user-management', label: 'Gerenciar Usuários', icon: Users, adminOnly: true },
  { key: 'accessControl' as MenuItemKey, href: '/settings/access-control', label: 'Controle de Acesso', icon: ShieldCheck, adminOnly: true },
];


export function AppSidebar() {
  const pathname = usePathname();
  const logoUrl = 'https://firebasestorage.googleapis.com/v0/b/studio-1445297951-c95ca.firebasestorage.app/o/uploads%2FjZm8ue98mEO7A0GSDTmExq8HYD82%2Fsimbolo_semfundo_verdeclaro.png?alt=media&token=c68144ba-c10e-4921-8fe7-eb791d34eebe';
  const { user } = useUser();
  const firestore = getFirestore();

  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userProfile } = useDoc<{role?: string}>(userDocRef);
  const roleId = userProfile?.role || 'user';

  const roleDocRef = useMemoFirebase(() => {
    // Admins don't need to fetch permissions, they see everything.
    if (roleId === 'admin') return null;
    return doc(firestore, 'roles', roleId);
  }, [firestore, roleId]);

  const { data: rolePermissions } = useDoc<Role>(roleDocRef);
  
  const menuItems = useMemo(() => {
    if (roleId === 'admin') {
      return allMenuItems;
    }

    if (!rolePermissions) {
        // If permissions are not loaded for a regular user, hide everything as a security measure
        // Except for profile and settings which are always visible by default for users.
        return allMenuItems.filter(item => item.key === 'profile' || item.key === 'settings' || item.key === 'dashboard');
    }

    return allMenuItems.filter(item => {
        // Admin only items should not be evaluated for non-admins
        if (item.adminOnly) return false;

        // Use a type guard to ensure item.key is a valid key of permissions
        const hasPermission = (key: string): key is keyof typeof rolePermissions.permissions => {
            return key in rolePermissions.permissions;
        }

        if (hasPermission(item.key)) {
            return rolePermissions.permissions[item.key];
        }
        return false;
    });
  }, [roleId, rolePermissions]);

  return (
    <>
      <SidebarHeader>
        <div className="flex items-center justify-center gap-2 py-2">
          <img src={logoUrl} alt="Ethera Logo" className="w-8 h-8" />
          <span className="font-headline text-xl font-semibold text-primary">Ethera</span>
        </div>
      </SidebarHeader>
      <SidebarContent className="p-2">
        <SidebarMenu>
          {menuItems.map(({ href, label, icon: Icon }) => (
            <SidebarMenuItem key={href}>
              <SidebarMenuButton
                asChild
                isActive={pathname.startsWith(href)}
                tooltip={{ children: label, side: 'right' }}
              >
                <Link href={href}>
                  <Icon />
                  <span>{label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
    </>
  );
}
    
