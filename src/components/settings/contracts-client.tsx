

'use client';
import type { Contract } from '@/lib/types';
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Calendar, Tag, FileText, Repeat, FolderTree, CalendarClock } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';
import { AddContractDialog } from './add-contract-dialog';
import { Badge } from '../ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const formatCurrency = (value?: number) => {
  if (value === undefined) return 'N/A';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const frequencyMap = {
  monthly: 'Mensal',
  bimonthly: 'Bimestral',
  quarterly: 'Trimestral',
  semiannually: 'Semestral',
  annually: 'Anual',
};


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
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
        </div>
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
            {contracts.map(contract => (
              <Card key={contract.id} className="flex flex-col">
                <CardHeader>
                  <CardTitle className="font-headline flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    {contract.name}
                  </CardTitle>
                  <CardDescription>
                    {contract.description || 'Sem descrição.'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-grow space-y-3 text-sm">
                   <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4 text-muted-foreground" />
                      <Badge variant={contract.type === 'fixed' ? 'default' : 'secondary'}>
                        {contract.type === 'fixed' ? 'Fixo' : 'Variável'}
                      </Badge>
                      <span className="font-semibold text-foreground">
                        {formatCurrency(contract.amount)}
                      </span>
                  </div>
                   <div className="flex items-center gap-2">
                      <Repeat className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Frequência:</span>
                      <span className="font-medium text-foreground">{frequencyMap[contract.paymentFrequency]}</span>
                   </div>
                    {contract.paymentDueDate && (
                       <div className="flex items-center gap-2">
                         <CalendarClock className="h-4 w-4 text-muted-foreground" />
                         <span className="text-muted-foreground">Vencimento:</span>
                         <span className="font-medium text-foreground">
                            Todo dia {contract.paymentDueDate}
                         </span>
                       </div>
                    )}
                  {contract.expirationDate && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Fim do Contrato:</span>
                      <span className="font-medium text-foreground">
                        {format(contract.expirationDate.toDate(), 'dd/MM/yyyy', { locale: ptBR })}
                      </span>
                    </div>
                  )}
                  {contract.fullCategoryPath && (
                     <div className="flex items-start gap-2 pt-2 border-t border-dashed">
                      <FolderTree className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div className="flex flex-col">
                        <span className="font-semibold text-foreground">
                          {contract.fullCategoryPath.description}
                        </span>
                         <span className="text-xs text-muted-foreground">
                          {contract.fullCategoryPath.group} / {contract.fullCategoryPath.category}
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
                <CardFooter>
                    {/* Actions can go here later */}
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

    
