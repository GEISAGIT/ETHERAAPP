'use client';
import type { ExpenseCategoryGroup } from '@/lib/types';
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export function ExpenseSettingsClient({ 
    expenseCategoryGroups,
    isLoading
}: { 
    expenseCategoryGroups: ExpenseCategoryGroup[],
    isLoading: boolean 
}) {

  if (isLoading) {
    return (
      <div className="space-y-8">
        <header>
          <Skeleton className="h-9 w-80" />
          <Skeleton className="h-5 w-96 mt-2" />
        </header>
        <Card>
            <CardHeader>
                <Skeleton className="h-8 w-72" />
            </CardHeader>
            <CardContent className="space-y-4">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </CardContent>
            <CardFooter>
                <Skeleton className="h-10 w-48" />
            </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-8">
        <header>
          <h1 className="font-headline text-3xl font-bold tracking-tight">
            Configurador de Despesas
          </h1>
          <p className="text-muted-foreground">
            Gerencie a estrutura hierárquica para classificar suas despesas.
          </p>
        </header>
          
          <Card>
            <CardHeader>
              <CardTitle className="font-headline">Estrutura de Categorias de Despesa</CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="multiple" className="w-full">
                {expenseCategoryGroups.map(group => (
                  <AccordionItem value={group.id} key={group.id}>
                    <AccordionTrigger className="text-lg font-semibold">{group.name}</AccordionTrigger>
                    <AccordionContent>
                      <div className="pl-4">
                        {group.categories.length > 0 ? (
                          <Accordion type="multiple" className="w-full">
                            {group.categories.map(category => (
                              <AccordionItem value={category.id} key={category.id}>
                                <AccordionTrigger className="text-md font-medium">{category.name}</AccordionTrigger>
                                <AccordionContent>
                                  <ul className="pl-4 list-disc list-inside text-muted-foreground space-y-1">
                                    {category.subCategories.map(sub => (
                                      <li key={sub.id}>{sub.name}</li>
                                    ))}
                                  </ul>
                                </AccordionContent>
                              </AccordionItem>
                            ))}
                          </Accordion>
                        ) : (
                          <p className="text-sm text-muted-foreground italic py-4">Nenhuma categoria neste grupo.</p>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
            <CardFooter>
              <Button variant="outline" disabled>
                <PlusCircle className="mr-2 h-4 w-4" />
                Adicionar Grupo (Em Breve)
              </Button>
            </CardFooter>
          </Card>
      </div>
    </>
  );
}
