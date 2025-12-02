'use client';

import { usePathname } from 'next/navigation';
import {
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarHeader,
} from '@/components/ui/sidebar';
import { ClinicFlowLogo } from '@/components/icons';
import { ArrowRightLeft, BarChart3, LayoutDashboard, PiggyBank } from 'lucide-react';
import Link from 'next/link';

const menuItems = [
  { href: '/dashboard', label: 'Painel', icon: LayoutDashboard },
  { href: '/transactions', label: 'Transações', icon: ArrowRightLeft },
  { href: '/budgets', label: 'Orçamentos', icon: PiggyBank },
  { href: '/reports', label: 'Relatórios', icon: BarChart3 },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <>
      <SidebarHeader>
        <div className="flex items-center gap-2">
          <ClinicFlowLogo className="h-8 w-8 text-primary" />
          <span className="font-headline text-lg font-semibold">ClinicFlow</span>
        </div>
      </SidebarHeader>
      <SidebarContent className="p-2">
        <SidebarMenu>
          {menuItems.map(({ href, label, icon: Icon }) => (
            <SidebarMenuItem key={href}>
              <Link href={href} legacyBehavior passHref>
                <SidebarMenuButton
                  asChild
                  isActive={pathname.startsWith(href)}
                  tooltip={{ children: label, side: 'right' }}
                >
                  <a>
                    <Icon />
                    <span>{label}</span>
                  </a>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
    </>
  );
}
