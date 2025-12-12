'use client';
import type { IncomeCategory } from '@/lib/types';
import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, MoreVertical, Trash2, Edit, Search } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from '@/components/ui/input';
import { AddCategoryDialog } from './add-category-dialog';
import { EditCategoryDialog } from './edit-category-dialog';
import { DeleteCategoryAlert } from './delete-category-alert';
import { useFirestore, addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

export function IncomeSettingsClient({ 
    incomeCategories,
    isLoading 
}: { 
    incomeCategories: IncomeCategory[], 
    isLoading: boolean 
}) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<IncomeCategory | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const firestore = useFirestore();
  const { toast } = useToast();

  const filteredCategories = useMemo(() => {
    if (!searchTerm) {
      return incomeCategories;
    }
    return incomeCategories.filter(category =>
      category.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [incomeCategories, searchTerm]);
    
  if (isLoading) {
    return (
      <div className="space-y-8">
        <header>
          <Skeleton className="h-9 w-80" />
          <Skeleton className="h-5 w-96 mt-2" />
        </header>
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-5 w-80 mt-2" />
          </CardHeader>
          <CardContent className="space-y-4">
             <Skeleton className="h-10 w-1/2" />
             <Skeleton className="h-32 w-full" />
          </CardContent>
          <CardFooter>
            <Skeleton className="h-10 w-44" />
          </CardFooter>
        </Card>
      </div>
    );
  }

  const handleAddCategory = (name: string) => {
    if (!firestore) {
      toast({ variant: 'destructive', title: 'Erro de inicialização' });
      return;
    }
    const categoryCollection = collection(firestore, 'incomeCategories');
    addDocumentNonBlocking(categoryCollection, { name });
    toast({ title: 'Categoria Adicionada' });
  };

  const handleEditClick = (category: IncomeCategory) => {
    setSelectedCategory(category);
    setIsEditDialogOpen(true);
  };

  const handleEditCategory = (id: string, name: string) => {
    if (!firestore) return;
    const docRef = doc(firestore, 'incomeCategories', id);
    updateDocumentNonBlocking(docRef, { name });
    toast({ title: 'Categoria Atualizada' });
  };
  
  const handleDeleteClick = (id: string) => {
    setCategoryToDelete(id);
    setIsDeleteDialogOpen(true);
  };
  
  const handleConfirmDelete = () => {
    if (!firestore || !categoryToDelete) return;
    const docRef = doc(firestore, 'incomeCategories', categoryToDelete);
    deleteDocumentNonBlocking(docRef);
    toast({ title: 'Categoria Excluída' });
    setIsDeleteDialogOpen(false);
    setCategoryToDelete(null);
  }

  return (
    <>
      <AddCategoryDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onAddCategory={handleAddCategory}
        categoryType="income"
      />
      <EditCategoryDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onEditCategory={handleEditCategory}
        category={selectedCategory}
      />
      <DeleteCategoryAlert
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
      />
      <div className="space-y-8">
        <header>
          <h1 className="font-headline text-3xl font-bold tracking-tight">
            Configurador de Receitas
          </h1>
          <p className="text-muted-foreground">
            Gerencie as categorias usadas para classificar suas fontes de receita.
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Categorias de Receita</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Pesquisar categoria..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead className="w-[64px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCategories.length > 0 ? (
                    filteredCategories.map((category) => (
                      <TableRow key={category.id}>
                        <TableCell className="font-medium">{category.name}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Abrir menu</span>
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditClick(category)}>
                                <Edit className="mr-2 h-4 w-4" />
                                <span>Editar</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDeleteClick(category.id)} className="text-red-600 focus:text-red-600">
                                <Trash2 className="mr-2 h-4 w-4" />
                                <span>Excluir</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={2} className="h-24 text-center">
                        Nenhuma categoria encontrada.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={() => setIsAddDialogOpen(true)} variant="outline">
              <PlusCircle className="mr-2 h-4 w-4" />
              Adicionar Categoria
            </Button>
          </CardFooter>
        </Card>
      </div>
    </>
  );
}
