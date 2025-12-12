'use client';
import type { ExpenseCategoryGroup, ExpenseCategory, ExpenseSubCategory } from '@/lib/types';
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Edit, Trash2, MoreVertical } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useFirestore, updateDocumentNonBlocking, addDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { AddCategoryDialog } from './add-category-dialog';
import { EditCategoryDialog } from './edit-category-dialog';
import { DeleteCategoryAlert } from './delete-category-alert';


export function ExpenseSettingsClient({
    expenseCategoryGroups,
    isLoading
}: {
    expenseCategoryGroups: ExpenseCategoryGroup[],
    isLoading: boolean
}) {
  const [dialogState, setDialogState] = useState<{
    mode: 'add' | 'edit' | 'delete' | null;
    type: 'group' | 'category' | 'subCategory' | null;
    data: any;
  }>({ mode: null, type: null, data: {} });

  const firestore = useFirestore();
  const { toast } = useToast();

  const openDialog = (mode: 'add' | 'edit' | 'delete', type: 'group' | 'category' | 'subCategory', data: any = {}) => {
    setDialogState({ mode, type, data });
  };

  const closeDialog = () => {
    setDialogState({ mode: null, type: null, data: {} });
  };
  
  const handleSave = (id: string, name: string) => {
    if (!firestore) return;

    const { type, data } = dialogState;
    const groupCollectionRef = collection(firestore, 'expenseCategoryGroups');

    try {
        if (type === 'group') {
            if (id === 'new') { // Adding a new group
                addDocumentNonBlocking(groupCollectionRef, { name, categories: [] });
                toast({ title: 'Grupo Adicionado', description: `O grupo "${name}" foi criado.` });
            } else { // Editing an existing group
                updateDocumentNonBlocking(doc(groupCollectionRef, id), { name });
                toast({ title: 'Grupo Atualizado', description: `O grupo foi renomeado para "${name}".` });
            }
        } else if (type === 'category') {
            const group = expenseCategoryGroups.find(g => g.id === data.groupId);
            if (!group) return;

            let newCategories;
            if (id === 'new') { // Adding new category
                 const newCategory: ExpenseCategory = { id: new Date().toISOString(), name, subCategories: [] };
                 newCategories = [...group.categories, newCategory];
                 toast({ title: 'Categoria Adicionada' });
            } else { // Editing existing category
                newCategories = group.categories.map(c => c.id === id ? { ...c, name } : c);
                toast({ title: 'Categoria Atualizada' });
            }
            updateDocumentNonBlocking(doc(groupCollectionRef, data.groupId), { categories: newCategories });

        } else if (type === 'subCategory') {
            const group = expenseCategoryGroups.find(g => g.id === data.groupId);
            const category = group?.categories.find(c => c.id === data.categoryId);
            if (!group || !category) return;
            
            let newSubCategories;
            if (id === 'new') { // Adding new subcategory
                const newSubCategory: ExpenseSubCategory = { id: new Date().toISOString(), name };
                newSubCategories = [...category.subCategories, newSubCategory];
                toast({ title: 'Descrição Adicionada' });
            } else { // Editing existing subcategory
                newSubCategories = category.subCategories.map(sc => sc.id === id ? { ...sc, name } : sc);
                toast({ title: 'Descrição Atualizada' });
            }

            const newCategories = group.categories.map(c => 
                c.id === data.categoryId ? { ...c, subCategories: newSubCategories } : c
            );
            updateDocumentNonBlocking(doc(groupCollectionRef, data.groupId), { categories: newCategories });
        }
    } catch(e) {
        toast({ variant: 'destructive', title: 'Erro ao Salvar' });
    }
    closeDialog();
  };

 const handleDelete = () => {
    if (!firestore) return;

    const { type, data } = dialogState;
    const groupCollectionRef = collection(firestore, 'expenseCategoryGroups');

    try {
        if (type === 'group') {
            deleteDocumentNonBlocking(doc(groupCollectionRef, data.id));
            toast({ title: 'Grupo Excluído' });
        } else if (type === 'category') {
            const group = expenseCategoryGroups.find(g => g.id === data.groupId);
            if (!group) return;
            const newCategories = group.categories.filter(c => c.id !== data.id);
            updateDocumentNonBlocking(doc(groupCollectionRef, data.groupId), { categories: newCategories });
            toast({ title: 'Categoria Excluída' });
        } else if (type === 'subCategory') {
            const group = expenseCategoryGroups.find(g => g.id === data.groupId);
            const category = group?.categories.find(c => c.id === data.categoryId);
            if (!group || !category) return;

            const newSubCategories = category.subCategories.filter(sc => sc.id !== data.id);
            const newCategories = group.categories.map(c =>
                c.id === data.categoryId ? { ...c, subCategories: newSubCategories } : c
            );
            updateDocumentNonBlocking(doc(groupCollectionRef, data.groupId), { categories: newCategories });
            toast({ title: 'Descrição Excluída' });
        }
    } catch (e) {
        toast({ variant: 'destructive', title: 'Erro ao Excluir' });
    }

    closeDialog();
  };


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

  const dialogTitleMap = {
    group: 'Grupo',
    category: 'Categoria',
    subCategory: 'Descrição'
  };

  return (
    <>
      <AddCategoryDialog
        open={dialogState.mode === 'add'}
        onOpenChange={closeDialog}
        onAddCategory={(name) => handleSave('new', name)}
        categoryType={dialogState.type || 'expense'}
        title={`Adicionar ${dialogTitleMap[dialogState.type as keyof typeof dialogTitleMap] || ''}`}
      />
       <EditCategoryDialog
        open={dialogState.mode === 'edit'}
        onOpenChange={closeDialog}
        onEditCategory={handleSave}
        category={dialogState.data}
        title={`Editar ${dialogTitleMap[dialogState.type as keyof typeof dialogTitleMap] || ''}`}
      />
      <DeleteCategoryAlert
        open={dialogState.mode === 'delete'}
        onOpenChange={closeDialog}
        onConfirm={handleDelete}
      />

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
                    <div className="flex items-center group">
                        <AccordionTrigger className="text-lg font-semibold flex-1">{group.name}</AccordionTrigger>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100">
                                    <MoreVertical className="h-5 w-5" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openDialog('edit', 'group', group)}>
                                    <Edit className="mr-2 h-4 w-4" /> Editar Grupo
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openDialog('add', 'category', { groupId: group.id })}>
                                    <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Categoria
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openDialog('delete', 'group', group)} className="text-red-500">
                                    <Trash2 className="mr-2 h-4 w-4" /> Excluir Grupo
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                  <AccordionContent>
                    <div className="pl-4 space-y-2">
                       <Button variant="outline" size="sm" className="mb-2" onClick={() => openDialog('add', 'category', { groupId: group.id })}>
                           <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Categoria
                       </Button>
                      {group.categories.length > 0 ? (
                        <Accordion type="multiple" className="w-full border-l pl-4">
                          {group.categories.map(category => (
                            <AccordionItem value={category.id} key={category.id}>
                                <div className="flex items-center group">
                                    <AccordionTrigger className="text-md font-medium flex-1">{category.name}</AccordionTrigger>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100">
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                             <DropdownMenuItem onClick={() => openDialog('edit', 'category', { ...category, groupId: group.id })}>
                                                <Edit className="mr-2 h-4 w-4" /> Editar Categoria
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => openDialog('add', 'subCategory', { groupId: group.id, categoryId: category.id })}>
                                                <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Descrição
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => openDialog('delete', 'category', { ...category, groupId: group.id })} className="text-red-500">
                                                <Trash2 className="mr-2 h-4 w-4" /> Excluir Categoria
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                              <AccordionContent>
                                <div className="pl-4 space-y-2">
                                  <Button variant="outline" size="sm" className="mb-2" onClick={() => openDialog('add', 'subCategory', { groupId: group.id, categoryId: category.id })}>
                                      <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Descrição
                                  </Button>
                                  <ul className="pl-4 space-y-1">
                                    {category.subCategories.map(sub => (
                                      <li key={sub.id} className="group flex items-center justify-between text-muted-foreground hover:text-foreground">
                                        <span>{sub.name}</span>
                                        <div className="opacity-0 group-hover:opacity-100">
                                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openDialog('edit', 'subCategory', { ...sub, groupId: group.id, categoryId: category.id })}>
                                                <Edit className="h-3 w-3" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={() => openDialog('delete', 'subCategory', { ...sub, groupId: group.id, categoryId: category.id })}>
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
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
            <Button variant="outline" onClick={() => openDialog('add', 'group')}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Adicionar Grupo
            </Button>
          </CardFooter>
        </Card>
      </div>
    </>
  );
}
