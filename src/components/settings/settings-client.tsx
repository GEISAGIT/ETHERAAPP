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
import { useFirestore, useUser, addDocumentNonBlocking } from '@/firebase';
import { collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { defaultExpenseCategories, defaultIncomeCategories } from '@/lib/data';

interface CategoryTableProps {
  title: string;
  description: string;
  categories: (IncomeCategory | ExpenseCategory)[];
  onAdd: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

function CategoryTable({ title, description, categories, onAdd, onEdit, onDelete }: CategoryTableProps) {
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
                          <DropdownMenuItem onClick={() => onEdit(category.id)} disabled>
                            <Edit className="mr-2 h-4 w-4" />
                            <span>Editar (Em breve)</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onDelete(category.id)} className="text-red-600" disabled>
                            <Trash2 className="mr-2 h-4 w-4" />
                            <span>Excluir (Em breve)</span>
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
    isLoading 
}: { 
    incomeCategories: IncomeCategory[], 
    expenseCategories: ExpenseCategory[], 
    isLoading: boolean 
}) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [categoryType, setCategoryType] = useState<'income' | 'expense'>('income');
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
    
  useEffect(() => {
    if (!isLoading && user && firestore) {
      if (incomeCategories.length === 0) {
        console.log("Seeding income categories...");
        const incomeCollection = collection(firestore, 'users', user.uid, 'incomeCategories');
        defaultIncomeCategories.forEach(name => {
          addDocumentNonBlocking(incomeCollection, { name });
        });
      }
      if (expenseCategories.length === 0) {
        console.log("Seeding expense categories...");
        const expenseCollection = collection(firestore, 'users', user.uid, 'expenseCategories');
        defaultExpenseCategories.forEach(name => {
          addDocumentNonBlocking(expenseCollection, { name });
        });
      }
    }
  }, [isLoading, user, firestore, incomeCategories, expenseCategories]);


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

  const handleAddCategoryClick = (type: 'income' | 'expense') => {
    setCategoryType(type);
    setIsDialogOpen(true);
  };

  const handleAddCategory = (name: string) => {
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Erro de autenticação',
        description: 'Você precisa estar logado para adicionar uma categoria.'
      });
      return;
    }

    const collectionName = categoryType === 'income' ? 'incomeCategories' : 'expenseCategories';
    const categoryCollection = collection(firestore, 'users', user.uid, collectionName);
    
    addDocumentNonBlocking(categoryCollection, { name });

    toast({
      title: 'Categoria Adicionada',
      description: `A categoria "${name}" foi adicionada com sucesso.`
    });
  };

  const handleEditCategory = (id: string) => {
    console.log(`Edit category ${id}`);
  };
  
  const handleDeleteCategory = (id: string) => {
    console.log(`Delete category ${id}`);
  };

  return (
    <>
      <AddCategoryDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onAddCategory={handleAddCategory}
        categoryType={categoryType}
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
            onEdit={handleEditCategory}
            onDelete={handleDeleteCategory}
          />
          <CategoryTable
            title="Categorias de Despesa"
            description="Categorias usadas para classificar seus diferentes tipos de despesas."
            categories={expenseCategories}
            onAdd={() => handleAddCategoryClick('expense')}
            onEdit={handleEditCategory}
            onDelete={handleDeleteCategory}
          />
        </div>
      </div>
    </>
  );
}
