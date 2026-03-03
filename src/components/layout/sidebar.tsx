'use client';

import { usePathname } from 'next/navigation';
import {
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarHeader,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from '@/components/ui/sidebar';
import { 
  ArrowRightLeft, 
  BarChart3, 
  LayoutDashboard, 
  PiggyBank, 
  Settings, 
  User, 
  Upload, 
  Users, 
  Banknote,
  Briefcase,
  Clock,
  Wallet
} from 'lucide-react';
import Link from 'next/link';
import { useUser, useFirestore } from '@/firebase';
import { useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { MenuItemKey, UserProfile, Permissions } from '@/lib/types';
import { useMemo } from 'react';

// Items definitions by group
const dashboardItem = { key: 'dashboard' as MenuItemKey, href: '/dashboard', label: 'Painel', icon: LayoutDashboard };

const financialMenuItems = [
  { key: 'transactions' as MenuItemKey, href: '/transactions', label: 'Transações', icon: ArrowRightLeft },
  { key: 'budgets' as MenuItemKey, href: '/budgets', label: 'Orçamentos', icon: PiggyBank },
  { key: 'reports' as MenuItemKey, href: '/reports', label: 'Relatórios', icon: BarChart3 },
  { key: 'apiBank' as MenuItemKey, href: '/api-bank', label: 'API BANK (BETA)', icon: Banknote },
];

const hrMenuItems = [
  { key: 'hrTimesheet' as MenuItemKey, href: '/hr/timesheet', label: 'Controle de Folha Ponto', icon: Clock },
];

const managementMenuItems = [
  { key: 'upload' as MenuItemKey, href: '/upload', label: 'Upload', icon: Upload },
  { key: 'userManagement' as MenuItemKey, href: '/user-management', label: 'Gerenciar Usuários', icon: Users, adminOnly: true },
];

const userMenuItems = [
  { key: 'profile' as MenuItemKey, href: '/profile', label: 'Perfil', icon: User },
  { key: 'settings' as MenuItemKey, href: '/settings', label: 'Configurações', icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();
  const logoUrl = 'https://firebasestorage.googleapis.com/v0/b/studio-1445297951-c95ca.firebasestorage.app/o/uploads%2FjZm8ue98mEO7A0GSDTmExq8HYD82%2Fsimbolo_semfundo_verdeclaro.png?alt=media&token=c68144ba-c10e-4921-8fe7-eb791d34eebe';
  const { user } = useUser();
  const firestore = useFirestore();

  const userDocRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userProfile } = useDoc<UserProfile>(userDocRef);
  
  const filterMenuItems = (items: any[]) => {
    const isAdmin = userProfile?.role === 'admin';

    if (!userProfile) {
        return items.filter(item => !item.adminOnly && (item.key === 'profile' || item.key === 'dashboard'));
    }

    return items.filter(item => {
        if (isAdmin) return true;
        if (item.adminOnly) return false;

        const pagePermissions = userProfile.permissions?.[item.key as keyof Permissions];
        if (pagePermissions && 'view' in pagePermissions) {
          return pagePermissions.view;
        }
        return false;
    });
  };

  const dashboardVisible = useMemo(() => filterMenuItems([dashboardItem]).length > 0, [userProfile]);
  const financialItems = useMemo(() => filterMenuItems(financialMenuItems), [userProfile]);
  const hrItems = useMemo(() => filterMenuItems(hrMenuItems), [userProfile]);
  const managementItems = useMemo(() => filterMenuItems(managementMenuItems), [userProfile]);
  const userItems = useMemo(() => filterMenuItems(userMenuItems), [userProfile]);

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
      <SidebarContent className="p-2 space-y-4">
        {/* Principal Group */}
        <SidebarGroup>
          <SidebarMenu>
            {dashboardVisible && (
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={isActive(dashboardItem.href)}
                  tooltip={{ children: dashboardItem.label, side: 'right' }}
                >
                  <Link href={dashboardItem.href}>
                    <dashboardItem.icon />
                    <span>{dashboardItem.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
          </SidebarMenu>
        </SidebarGroup>

        {/* Financeiro Group */}
        {financialItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="flex items-center gap-2 px-2 text-primary font-semibold uppercase tracking-wider text-[10px]">
              <Wallet className="h-3 w-3" />
              Financeiro
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {financialItems.map(({ href, label, icon: Icon }) => (
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
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Recursos Humanos Group */}
        {hrItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="flex items-center gap-2 px-2 text-primary font-semibold uppercase tracking-wider text-[10px]">
              <Briefcase className="h-3 w-3" />
              Recursos Humanos
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {hrItems.map(({ href, label, icon: Icon }) => (
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
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Gestão e Administração Group */}
        {managementItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="flex items-center gap-2 px-2 text-primary font-semibold uppercase tracking-wider text-[10px]">
              <Settings className="h-3 w-3" />
              Administração
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {managementItems.map(({ href, label, icon: Icon }) => (
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
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* User Group */}
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-2 px-2 text-primary font-semibold uppercase tracking-wider text-[10px]">
            <User className="h-3 w-3" />
            Usuário
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {userItems.map(({ href, label, icon: Icon }) => (
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
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </>
  );
}
