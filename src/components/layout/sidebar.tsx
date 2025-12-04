'use client';

import { usePathname } from 'next/navigation';
import {
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarHeader,
} from '@/components/ui/sidebar';
import { EtheraLogo } from '@/components/icons';
import { ArrowRightLeft, BarChart3, LayoutDashboard, PiggyBank, Settings, User, Upload } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

const menuItems = [
  { href: '/dashboard', label: 'Painel', icon: LayoutDashboard },
  { href: '/transactions', label: 'Transações', icon: ArrowRightLeft },
  { href: '/budgets', label: 'Orçamentos', icon: PiggyBank },
  { href: '/reports', label: 'Relatórios', icon: BarChart3 },
  { href: '/profile', label: 'Perfil', icon: User },
  { href: '/upload', label: 'Upload', icon: Upload },
  { href: '/settings', label: 'Configurações', icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();
  const imageUrl = 'https://firebasestorage.googleapis.com/v0/b/studio-1445297951-c95ca.appspot.com/o/teste%2Fsimbolo_semfundo_verdeclaro.png?alt=media';

  return (
    <>
      <SidebarHeader>
        <div className="flex items-center gap-3 py-2">
          <Image src={imageUrl} alt="Ethera Logo" width={40} height={40} />
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
