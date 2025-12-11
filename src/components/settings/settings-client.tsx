'use client';
import type { IncomeCategory, ExpenseCategory } from '@/lib/types';
import { useState, useMemo, useEffect } from 'react';
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
import { useFirestore, addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { defaultExpenseCategories, defaultIncomeCategories } from '@/lib/data';
import type { UserProfile } from '@/lib/types';

type CategoryType = 'income' | 'expense';

interface CategoryTableProps {
  title: string;
  description: string;
  categories: (IncomeCategory | ExpenseCategory)[];
  onAdd: () => void;
  onEdit: (category: IncomeCategory | ExpenseCategory) => void;
  onDelete: (id: string, type: CategoryType) => void;
  type: CategoryType;
}

function CategoryTable({ title, description, categories, onAdd, onEdit, onDelete, type }: CategoryTableProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCategories = useMemo(() => {
    if (!searchTerm) {
      return categories;
    }
    return categories.filter(category =>
      category.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [categories, searchTerm]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
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
                          <DropdownMenuItem onClick={() => onEdit(category)}>
                            <Edit className="mr-2 h-4 w-4" />
                            <span>Editar</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onDelete(category.id, type)} className="text-red-600 focus:text-red-600">
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
        <Button onClick={onAdd} variant="outline">
          <PlusCircle className="mr-2 h-4 w-4" />
          Adicionar Categoria
        </Button>
      </CardFooter>
    </Card>
  );
}


export function SettingsClient({ 
    incomeCategories, 
    expenseCategories, 
    isLoading: areCategoriesLoading 
}: { 
    incomeCategories: IncomeCategory[], 
    expenseCategories: ExpenseCategory[], 
    isLoading: boolean 
}) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<IncomeCategory | ExpenseCategory | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<{ id: string; type: CategoryType } | null>(null);

  const [categoryType, setCategoryType] = useState<CategoryType>('income');
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
    
  useEffect(() => {
    // Any user can seed categories if they are missing.
    if (!areCategoriesLoading && firestore) {
      if (incomeCategories.length === 0) {
        console.log("Seeding income categories...");
        const incomeCollection = collection(firestore, 'incomeCategories');
        defaultIncomeCategories.forEach(name => {
          addDocumentNonBlocking(incomeCollection, { name });
        });
      }
      if (expenseCategories.length === 0) {
        console.log("Seeding expense categories...");
        const expenseCollection = collection(firestore, 'expenseCategories');
        defaultExpenseCategories.forEach(name => {
          addDocumentNonBlocking(expenseCollection, { name });
        });
      }
    }
  }, [areCategoriesLoading, firestore, incomeCategories.length, expenseCategories.length]);

  const isLoading = areCategoriesLoading || isUserLoading;

  if (isLoading) {
    return (
      <div className="space-y-8">
        <header>
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-5 w-96 mt-2" />
        </header>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            <Skeleton className="h-96" />
            <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  const handleAddCategoryClick = (type: CategoryType) => {
    setCategoryType(type);
    setIsAddDialogOpen(true);
  };

  const handleAddCategory = (name: string) => {
    if (!firestore) {
      toast({
        variant: 'destructive',
        title: 'Erro de inicialização',
        description: 'O banco de dados não está pronto.'
      });
      return;
    }

    const collectionName = categoryType === 'income' ? 'incomeCategories' : 'expenseCategories';
    const categoryCollection = collection(firestore, collectionName);
    
    addDocumentNonBlocking(categoryCollection, { name });

    toast({
      title: 'Categoria Adicionada',
      description: `A categoria "${name}" foi adicionada com sucesso.`
    });
  };

  const handleEditClick = (category: IncomeCategory | ExpenseCategory) => {
    setSelectedCategory(category);
    setIsEditDialogOpen(true);
  };

  const handleEditCategory = (id: string, name: string) => {
    if (!firestore || !selectedCategory) return;
    
    const type = incomeCategories.some(c => c.id === id) ? 'income' : 'expense';
    const collectionName = type === 'income' ? 'incomeCategories' : 'expenseCategories';
    const docRef = doc(firestore, collectionName, id);

    updateDocumentNonBlocking(docRef, { name });
    
    toast({
      title: 'Categoria Atualizada',
      description: 'O nome da categoria foi alterado com sucesso.'
    });
  };
  
  const handleDeleteClick = (id: string, type: CategoryType) => {
    setCategoryToDelete({ id, type });
    setIsDeleteDialogOpen(true);
  };
  
  const handleConfirmDelete = () => {
    if (!firestore || !categoryToDelete) return;

    const { id, type } = categoryToDelete;
    const collectionName = type === 'income' ? 'incomeCategories' : 'expenseCategories';
    const docRef = doc(firestore, collectionName, id);
    
    deleteDocumentNonBlocking(docRef);

    toast({
      title: 'Categoria Excluída',
      description: 'A categoria foi excluída com sucesso.'
    });

    setIsDeleteDialogOpen(false);
    setCategoryToDelete(null);
  }

  return (
    <>
      <AddCategoryDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onAddCategory={handleAddCategory}
        categoryType={categoryType}
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
            Configurações
          </h1>
          <p className="text-muted-foreground">
            Gerencie as categorias de receitas e despesas do seu aplicativo.
          </p>
        </header>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <CategoryTable
            title="Categorias de Receita"
            description="Categorias usadas para classificar suas fontes de receita."
            categories={incomeCategories}
            onAdd={() => handleAddCategoryClick('income')}
            onEdit={handleEditClick}
            onDelete={handleDeleteClick}
            type="income"
          />
          <CategoryTable
            title="Categorias de Despesa"
            description="Categorias usadas para classificar seus diferentes tipos de despesas."
            categories={expenseCategories}
            onAdd={() => handleAddCategoryClick('expense')}
            onEdit={handleEditClick}
            onDelete={handleDeleteClick}
            type="expense"
          />
        </div>
      </div>
    </>
  );
}
