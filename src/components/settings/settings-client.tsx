'use client';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, Wallet, ReceiptText, FileText } from 'lucide-react';
import Link from 'next/link';

const settingOptions = [
  {
    title: 'Configurador de Despesa',
    description: 'Gerencie grupos, categorias e descrições para suas despesas.',
    href: '/settings/expenses',
    icon: Wallet,
  },
  {
    title: 'Configurador de Receita',
    description: 'Gerencie as categorias para suas fontes de receita.',
    href: '/settings/income',
    icon: ReceiptText,
  },
  {
    title: 'Contratos',
    description: 'Gerencie seus contratos e cobranças recorrentes.',
    href: '/settings/contracts',
    icon: FileText,
  },
];

export function SettingsClient() {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-headline text-3xl font-bold tracking-tight">
          Configurações
        </h1>
        <p className="text-muted-foreground">
          Escolha qual área do sistema você deseja configurar.
        </p>
      </header>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {settingOptions.map((option) => (
          <Link href={option.href} key={option.href} className="group">
            <Card className="flex h-full flex-col justify-between transition-all group-hover:border-primary group-hover:shadow-lg">
              <CardHeader>
                <div className="mb-4 flex justify-center">
                  <div className="rounded-lg bg-primary/10 p-3 text-primary">
                    <option.icon className="h-8 w-8" />
                  </div>
                </div>
                <CardTitle className="text-center font-headline">{option.title}</CardTitle>
                <CardDescription className="text-center">
                  {option.description}
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
