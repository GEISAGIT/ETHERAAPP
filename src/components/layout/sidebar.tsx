
'use client';

import { usePathname } from 'next/navigation';
import {
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarHeader,
} from '@/components/ui/sidebar';
import { ArrowRightLeft, BarChart3, LayoutDashboard, PiggyBank, Settings, User, Upload, Users } from 'lucide-react';
import Link from 'next/link';
import { useUser } from '@/firebase';
import { useDoc, useMemoFirebase } from '@/firebase';
import { doc, getFirestore } from 'firebase/firestore';
import type { MenuItemKey, UserProfile } from '@/lib/types';
import { useMemo } from 'react';

const allMenuItems = [
  { key: 'dashboard' as MenuItemKey, href: '/dashboard', label: 'Painel', icon: LayoutDashboard },
  { key: 'transactions' as MenuItemKey, href: '/transactions', label: 'Transações', icon: ArrowRightLeft },
  { key: 'budgets' as MenuItemKey, href: '/budgets', label: 'Orçamentos', icon: PiggyBank },
  { key: 'reports' as MenuItemKey, href: '/reports', label: 'Relatórios', icon: BarChart3 },
  { key: 'upload' as MenuItemKey, href: '/upload', label: 'Upload', icon: Upload },
  { key: 'userManagement' as MenuItemKey, href: '/user-management', label: 'Gerenciar Usuários', icon: Users, adminOnly: true },
  { key: 'profile' as MenuItemKey, href: '/profile', label: 'Perfil', icon: User },
  { key: 'settings' as MenuItemKey, href: '/settings', label: 'Configurações', icon: Settings },
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

  const { data: userProfile } = useDoc<UserProfile>(userDocRef);
  const role = userProfile?.role;
  
  const menuItems = useMemo(() => {
    // Admin always sees everything
    if (role === 'admin') {
      return allMenuItems;
    }
    
    // For regular users, filter based on their individual permissions
    if (userProfile?.permissions) {
      return allMenuItems.filter(item => {
        // Admin-only items are never shown to non-admins
        if (item.adminOnly) return false;

        const hasPermission = (key: string): key is keyof typeof userProfile.permissions => {
            return key in userProfile.permissions;
        }

        // Show item if permission is explicitly true
        if (hasPermission(item.key)) {
            return userProfile.permissions[item.key];
        }

        // Fallback for items that might not be in the permissions object yet
        return item.key === 'profile' || item.key === 'dashboard';
      });
    }

    // Fallback for when userProfile is loading or doesn't have permissions set
    return allMenuItems.filter(item => item.key === 'profile' || item.key === 'dashboard');
    
  }, [role, userProfile]);

  const isActive = (href: string) => {
    if (href === '/settings') {
      return pathname.startsWith('/settings');
    }
    return pathname === href;
  };

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
                isActive={isActive(href)}
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
