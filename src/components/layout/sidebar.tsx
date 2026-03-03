
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
  Wallet,
  ChevronRight,
  Home
} from 'lucide-react';
import Link from 'next/link';
import { useUser, useFirestore } from '@/firebase';
import { useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { MenuItemKey, UserProfile, Permissions } from '@/lib/types';
import { useMemo } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

// Primary items
const homeItem = { key: 'home' as MenuItemKey, href: '/home', label: 'Início', icon: Home };

const dashboardItem = { key: 'dashboard' as MenuItemKey, href: '/dashboard', label: 'Painel Geral', icon: LayoutDashboard };

const financialMenuItems = [
  { key: 'transactions' as MenuItemKey, href: '/transactions', label: 'Transações', icon: ArrowRightLeft },
  { key: 'budgets' as MenuItemKey, href: '/budgets', label: 'Orçamentos', icon: PiggyBank },
  { key: 'reports' as MenuItemKey, href: '/reports', label: 'Relatórios', icon: BarChart3 },
  { key: 'apiBank' as MenuItemKey, href: '/api-bank', label: 'API BANK (BETA)', icon: Banknote },
];

const hrMenuItems = [
  { key: 'employees' as MenuItemKey, href: '/hr/employees', label: 'Funcionários', icon: Users },
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
        return items.filter(item => !item.adminOnly && (item.key === 'profile' || item.key === 'home'));
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

  const homeVisible = useMemo(() => filterMenuItems([homeItem]).length > 0, [userProfile]);
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
      <SidebarContent className="p-2 space-y-2">
        {/* Main Links - Fixed */}
        <SidebarGroup>
          <SidebarMenu>
            {homeVisible && (
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={isActive(homeItem.href)}
                  tooltip={{ children: homeItem.label, side: 'right' }}
                  className={isActive(homeItem.href) ? 'text-primary font-bold' : 'text-primary'}
                >
                  <Link href={homeItem.href}>
                    <homeItem.icon className={isActive(homeItem.href) ? 'text-primary' : ''} />
                    <span>{homeItem.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
            {dashboardVisible && (
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={isActive(dashboardItem.href)}
                  tooltip={{ children: dashboardItem.label, side: 'right' }}
                  className={isActive(dashboardItem.href) ? 'text-primary font-bold' : 'text-primary'}
                >
                  <Link href={dashboardItem.href}>
                    <dashboardItem.icon className={isActive(dashboardItem.href) ? 'text-primary' : ''} />
                    <span>{dashboardItem.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
          </SidebarMenu>
        </SidebarGroup>

        {/* Financeiro Group */}
        {financialItems.length > 0 && (
          <Collapsible asChild defaultOpen={false} className="group/collapsible">
            <SidebarGroup>
              <SidebarGroupLabel asChild>
                <CollapsibleTrigger className="flex w-full items-center gap-2 px-2 text-primary font-bold uppercase tracking-wider text-[11px] cursor-pointer hover:bg-sidebar-accent/50 rounded-sm transition-colors py-2">
                  <Wallet className="h-3.5 w-3.5 text-primary" />
                  <span>Financeiro</span>
                  <ChevronRight className="ml-auto h-3.5 w-3.5 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 text-primary" />
                </CollapsibleTrigger>
              </SidebarGroupLabel>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {financialItems.map(({ href, label, icon: Icon }) => (
                      <SidebarMenuItem key={href}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive(href)}
                          tooltip={{ children: label, side: 'right' }}
                          className={isActive(href) ? 'text-primary font-bold' : 'text-primary'}
                        >
                          <Link href={href}>
                            <Icon className={isActive(href) ? 'text-primary' : ''} />
                            <span>{label}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        )}

        {/* Recursos Humanos Group */}
        {hrItems.length > 0 && (
          <Collapsible asChild defaultOpen={false} className="group/collapsible">
            <SidebarGroup>
              <SidebarGroupLabel asChild>
                <CollapsibleTrigger className="flex w-full items-center gap-2 px-2 text-primary font-bold uppercase tracking-wider text-[11px] cursor-pointer hover:bg-sidebar-accent/50 rounded-sm transition-colors py-2">
                  <Briefcase className="h-3.5 w-3.5 text-primary" />
                  <span>Recursos Humanos</span>
                  <ChevronRight className="ml-auto h-3.5 w-3.5 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 text-primary" />
                </CollapsibleTrigger>
              </SidebarGroupLabel>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {hrItems.map(({ href, label, icon: Icon }) => (
                      <SidebarMenuItem key={href}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive(href)}
                          tooltip={{ children: label, side: 'right' }}
                          className={isActive(href) ? 'text-primary font-bold' : 'text-primary'}
                        >
                          <Link href={href}>
                            <Icon className={isActive(href) ? 'text-primary' : ''} />
                            <span>{label}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        )}

        {/* Gestão e Administração Group */}
        {managementItems.length > 0 && (
          <Collapsible asChild defaultOpen={false} className="group/collapsible">
            <SidebarGroup>
              <SidebarGroupLabel asChild>
                <CollapsibleTrigger className="flex w-full items-center gap-2 px-2 text-primary font-bold uppercase tracking-wider text-[11px] cursor-pointer hover:bg-sidebar-accent/50 rounded-sm transition-colors py-2">
                  <Settings className="h-3.5 w-3.5 text-primary" />
                  <span>Administração</span>
                  <ChevronRight className="ml-auto h-3.5 w-3.5 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 text-primary" />
                </CollapsibleTrigger>
              </SidebarGroupLabel>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {managementItems.map(({ href, label, icon: Icon }) => (
                      <SidebarMenuItem key={href}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive(href)}
                          tooltip={{ children: label, side: 'right' }}
                          className={isActive(href) ? 'text-primary font-bold' : 'text-primary'}
                        >
                          <Link href={href}>
                            <Icon className={isActive(href) ? 'text-primary' : ''} />
                            <span>{label}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        )}

        {/* User Group */}
        <Collapsible asChild defaultOpen={false} className="group/collapsible">
          <SidebarGroup>
            <SidebarGroupLabel asChild>
              <CollapsibleTrigger className="flex w-full items-center gap-2 px-2 text-primary font-bold uppercase tracking-wider text-[11px] cursor-pointer hover:bg-sidebar-accent/50 rounded-sm transition-colors py-2">
                <User className="h-3.5 w-3.5 text-primary" />
                <span>Usuário</span>
                <ChevronRight className="ml-auto h-3.5 w-3.5 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 text-primary" />
              </CollapsibleTrigger>
            </SidebarGroupLabel>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  {userItems.map(({ href, label, icon: Icon }) => (
                    <SidebarMenuItem key={href}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive(href)}
                        tooltip={{ children: label, side: 'right' }}
                        className={isActive(href) ? 'text-primary font-bold' : 'text-primary'}
                      >
                        <Link href={href}>
                          <Icon className={isActive(href) ? 'text-primary' : ''} />
                          <span>{label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>
      </SidebarContent>
    </>
  );
}
