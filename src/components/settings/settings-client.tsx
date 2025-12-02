'use client';
import type { IncomeCategory, ExpenseCategory } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, MoreVertical, Trash2, Edit } from 'lucide-react';
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

interface CategoryTableProps {
  title: string;
  description: string;
  categories: (IncomeCategory | ExpenseCategory)[];
  onAdd: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

function CategoryTable({ title, description, categories, onAdd, onEdit, onDelete }: CategoryTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead className="w-[64px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.length > 0 ? (
              categories.map((category) => (
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
                          <span>Editar</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onDelete(category.id)} className="text-red-600" disabled>
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
      </CardContent>
      <CardFooter>
        <Button onClick={onAdd} variant="outline" disabled>
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

  const handleAddCategory = (type: 'income' | 'expense') => {
    // Logic to open a dialog to add a new category
    console.log(`Add new ${type} category`);
  };

  const handleEditCategory = (id: string) => {
    console.log(`Edit category ${id}`);
  };
  
  const handleDeleteCategory = (id: string) => {
    console.log(`Delete category ${id}`);
  };

  return (
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
          onAdd={() => handleAddCategory('income')}
          onEdit={handleEditCategory}
          onDelete={handleDeleteCategory}
        />
        <CategoryTable
          title="Categorias de Despesa"
          description="Categorias usadas para classificar seus diferentes tipos de despesas."
          categories={expenseCategories}
          onAdd={() => handleAddCategory('expense')}
          onEdit={handleEditCategory}
          onDelete={handleDeleteCategory}
        />
      </div>
    </div>
  );
}
