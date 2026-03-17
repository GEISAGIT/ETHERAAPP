
'use client';

import { useState, useMemo } from 'react';
import type { StockCategory, UserProfile } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Search, MoreHorizontal, Edit, Trash2, Tag } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from '@/components/ui/table';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useFirestore, addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { AddCategoryDialog } from '@/components/settings/add-category-dialog';
import { EditCategoryDialog } from '@/components/settings/edit-category-dialog';
import { DeleteCategoryAlert } from '@/components/settings/delete-category-alert';

export function CategoriesClient({ data, userProfile }: { data: StockCategory[], userProfile: UserProfile | null | undefined }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<StockCategory | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const firestore = useFirestore();
  const { toast } = useToast();

  const isAdmin = userProfile?.role === 'admin';
  const canCreate = !!(isAdmin || userProfile?.permissions?.stockCategories?.create);
  const canEdit = !!(isAdmin || userProfile?.permissions?.stockCategories?.edit);
  const canDelete = !!(isAdmin || userProfile?.permissions?.stockCategories?.delete);

  const filteredData = useMemo(() => {
    return data.filter(cat => cat.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [data, searchTerm]);

  const handleAddCategory = (name: string) => {
    if (!firestore) return;
    addDocumentNonBlocking(collection(firestore, 'stockCategories'), { name });
    toast({ title: 'Categoria Cadastrada' });
  };

  const handleEditCategory = (id: string, name: string) => {
    if (!firestore) return;
    updateDocumentNonBlocking(doc(firestore, 'stockCategories', id), { name });
    toast({ title: 'Categoria Atualizada' });
  };

  const handleConfirmDelete = () => {
    if (!firestore || !deletingId) return;
    deleteDocumentNonBlocking(doc(firestore, 'stockCategories', deletingId));
    toast({ title: 'Categoria Removida' });
    setDeletingId(null);
  };

  return (
    <div className="space-y-8">
      <AddCategoryDialog 
        open={isAddOpen} 
        onOpenChange={setIsAddOpen} 
        onAddCategory={handleAddCategory}
        categoryType="group"
        title="Nova Categoria de Suprimentos"
      />
      
      <EditCategoryDialog 
        open={!!editingCategory} 
        onOpenChange={(open) => !open && setEditingCategory(null)} 
        onEditCategory={handleEditCategory}
        category={editingCategory}
        title="Editar Categoria"
      />

      <DeleteCategoryAlert 
        open={!!deletingId} 
        onOpenChange={(open) => !open && setDeletingId(null)} 
        onConfirm={handleConfirmDelete} 
      />

      <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="font-headline text-3xl font-bold tracking-tight text-primary">Categorias de Suprimentos</h1>
          <p className="text-muted-foreground">Gerencie as classificações dos itens em estoque.</p>
        </div>
        {canCreate && (
          <Button onClick={() => setIsAddOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Nova Categoria
          </Button>
        )}
      </header>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome da Categoria</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="h-24 text-center text-muted-foreground">
                    Nenhuma categoria cadastrada.
                  </TableCell>
                </TableRow>
              ) : (
                filteredData.map((cat) => (
                  <TableRow key={cat.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Tag className="h-4 w-4 text-primary" />
                        <span className="font-medium text-foreground">{cat.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {(canEdit || canDelete) && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Opções</DropdownMenuLabel>
                            {canEdit && (
                              <DropdownMenuItem onClick={() => setEditingCategory(cat)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Editar Nome
                              </DropdownMenuItem>
                            )}
                            {canDelete && (
                              <DropdownMenuItem onClick={() => setDeletingId(cat.id)} className="text-red-600 focus:text-red-600">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Excluir
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
