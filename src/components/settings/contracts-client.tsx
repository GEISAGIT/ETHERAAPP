
'use client';
import type { Contract } from '@/lib/types';
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';
import { AddContractDialog } from './add-contract-dialog';

export function ContractsClient({
    contracts,
    isLoading
}: {
    contracts: Contract[],
    isLoading: boolean
}) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-8">
        <header className="flex items-center justify-between">
          <div>
            <Skeleton className="h-9 w-80" />
            <Skeleton className="h-5 w-96 mt-2" />
          </div>
          <Skeleton className="h-10 w-44" />
        </header>
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-72" />
          </CardHeader>
          <CardContent className="flex h-60 items-center justify-center">
            <Skeleton className="h-12 w-12 rounded-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <AddContractDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
      />
      <div className="space-y-8">
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="font-headline text-3xl font-bold tracking-tight">
              Gerenciador de Contratos
            </h1>
            <p className="text-muted-foreground">
              Cadastre e gerencie suas cobranças recorrentes.
            </p>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Adicionar Contrato
          </Button>
        </header>

        {contracts.length === 0 ? (
          <div className="flex h-60 items-center justify-center rounded-md border-2 border-dashed">
            <div className="text-center">
                <h3 className="text-lg font-semibold">Nenhum contrato cadastrado</h3>
                <p className="text-sm text-muted-foreground">Comece adicionando seu primeiro contrato recorrente.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {/* Contract cards will go here */}
            <p>Contratos serão listados aqui.</p>
          </div>
        )}
      </div>
    </>
  );
}

    