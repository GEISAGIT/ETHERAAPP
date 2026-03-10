
'use client';

import { useState, useMemo } from 'react';
import type { StockItem, UserProfile } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
    PlusCircle, 
    Search, 
    MoreHorizontal, 
    Edit, 
    Trash2, 
    Package, 
    AlertTriangle, 
    History, 
    ArrowUpCircle, 
    ArrowDownCircle,
    Boxes
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { AddStockItemDialog } from './add-stock-item-dialog';
import { useFirestore, deleteDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export function StockClient({ data, userProfile }: { data: StockItem[], userProfile: UserProfile | null | undefined }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);

  const firestore = useFirestore();
  const { toast } = useToast();

  const isAdmin = userProfile?.role === 'admin';
  const canCreate = !!(isAdmin || userProfile?.permissions?.suppliesStock?.create);
  const canEdit = !!(isAdmin || userProfile?.permissions?.suppliesStock?.edit);
  const canDelete = !!(isAdmin || userProfile?.permissions?.suppliesStock?.delete);

  const filteredData = useMemo(() => {
    return data.filter(item => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [data, searchTerm]);

  const handleDelete = (item: StockItem) => {
    if (!firestore) return;
    if (confirm(`Deseja realmente excluir o item "${item.name}"?`)) {
        deleteDocumentNonBlocking(doc(firestore, 'stock', item.id));
        toast({ title: 'Item Excluído' });
    }
  };

  return (
    <div className="space-y-8">
      <AddStockItemDialog open={isAddOpen} onOpenChange={setIsAddOpen} />

      <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="font-headline text-3xl font-bold tracking-tight text-primary">Controle de Estoque</h1>
          <p className="text-muted-foreground">Gerencie o inventário de suprimentos e materiais da clínica.</p>
        </div>
        {canCreate && (
          <Button onClick={() => setIsAddOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Novo Item
          </Button>
        )}
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-primary/5 border-primary/20">
            <CardHeader className="pb-2">
                <CardDescription className="text-xs uppercase font-bold text-primary">Total de Itens</CardDescription>
                <CardTitle className="text-2xl font-headline">{data.length}</CardTitle>
            </CardHeader>
        </Card>
        <Card className="bg-amber-500/10 border-amber-500/20">
            <CardHeader className="pb-2">
                <CardDescription className="text-xs uppercase font-bold text-amber-600">Estoque Baixo</CardDescription>
                <CardTitle className="text-2xl font-headline text-amber-600">
                    {data.filter(i => i.quantity <= i.minQuantity).length}
                </CardTitle>
            </CardHeader>
        </Card>
        <Card>
            <CardHeader className="pb-2">
                <CardDescription className="text-xs uppercase font-bold text-muted-foreground">Última Atualização</CardDescription>
                <CardTitle className="text-sm font-medium">Hoje, às 14:30</CardTitle>
            </CardHeader>
        </Card>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou categoria..."
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
                <TableHead>Item</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead className="text-center">Quantidade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    Nenhum item encontrado no estoque.
                  </TableCell>
                </TableRow>
              ) : (
                filteredData.map((item) => {
                  const isLow = item.quantity <= item.minQuantity;
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{item.name}</span>
                          <span className="text-xs text-muted-foreground">Unidade: {item.unit}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal">{item.category}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={cn("font-bold", isLow ? "text-amber-600" : "text-primary")}>
                            {item.quantity}
                        </span>
                      </TableCell>
                      <TableCell>
                        {isLow ? (
                            <Badge variant="destructive" className="bg-amber-500 hover:bg-amber-600 border-none gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                Repor Estoque
                            </Badge>
                        ) : (
                            <Badge variant="secondary" className="text-emerald-600 bg-emerald-500/10 border-emerald-500/20 gap-1">
                                <Package className="h-3 w-3" />
                                Disponível
                            </Badge>
                        )}
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
                              <DropdownMenuLabel>Gerenciar Item</DropdownMenuLabel>
                              {canEdit && (
                                <>
                                  <DropdownMenuItem>
                                    <ArrowUpCircle className="mr-2 h-4 w-4 text-emerald-600" />
                                    Entrada de Mercadoria
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <ArrowDownCircle className="mr-2 h-4 w-4 text-amber-600" />
                                    Saída de Mercadoria
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Editar Cadastro
                                  </DropdownMenuItem>
                                </>
                              )}
                              {canDelete && (
                                <DropdownMenuItem onClick={() => handleDelete(item)} className="text-red-600 focus:text-red-600">
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Excluir Item
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
