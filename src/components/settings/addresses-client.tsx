
'use client';

import { useState, useMemo } from 'react';
import type { StorageLocation, UserProfile } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
    PlusCircle, 
    Search, 
    MoreHorizontal, 
    Edit, 
    Trash2, 
    MapPin,
    Box,
    Archive,
    Clock
} from 'lucide-react';
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
import { AddAddressDialog } from './add-address-dialog';
import { useFirestore, deleteDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export function AddressesClient({ data, userProfile }: { data: StorageLocation[], userProfile: UserProfile | null | undefined }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<StorageLocation | null>(null);

  const firestore = useFirestore();
  const { toast } = useToast();

  const isAdmin = userProfile?.role === 'admin';
  const canCreate = !!(isAdmin || userProfile?.permissions?.addresses?.create);
  const canEdit = !!(isAdmin || userProfile?.permissions?.addresses?.edit);
  const canDelete = !!(isAdmin || userProfile?.permissions?.addresses?.delete);

  const filteredData = useMemo(() => {
    return data.filter(loc => 
        loc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (loc.description && loc.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [data, searchTerm]);

  const handleEdit = (loc: StorageLocation) => {
    setEditingAddress(loc);
    setIsAddOpen(true);
  };

  const handleDelete = (loc: StorageLocation) => {
    if (!firestore) return;
    if (confirm(`Deseja realmente excluir o local "${loc.name}"? Isso pode afetar itens vinculados.`)) {
        deleteDocumentNonBlocking(doc(firestore, 'storageLocations', loc.id));
        toast({ title: 'Local Removido' });
    }
  };

  return (
    <div className="space-y-8">
      <AddAddressDialog 
        open={isAddOpen} 
        onOpenChange={(open) => {
            setIsAddOpen(open);
            if (!open) setEditingAddress(null);
        }} 
        editingAddress={editingAddress}
      />

      <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="font-headline text-3xl font-bold tracking-tight text-primary">Locais de Armazenamento</h1>
          <p className="text-muted-foreground">Cadastre salas, armários e prateleiras para organizar seus suprimentos.</p>
        </div>
        {canCreate && (
          <Button onClick={() => setIsAddOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Novo Local
          </Button>
        )}
      </header>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou descrição..."
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
                <TableHead>Identificação</TableHead>
                <TableHead>Detalhamento</TableHead>
                <TableHead>Data de Cadastro</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                    Nenhum local de armazenamento cadastrado.
                  </TableCell>
                </TableRow>
              ) : (
                filteredData.map((loc) => (
                  <TableRow key={loc.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-md">
                            <Box className="h-4 w-4 text-primary" />
                        </div>
                        <span className="font-bold text-foreground">{loc.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-muted-foreground">{loc.description || '-'}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {loc.createdAt ? format(loc.createdAt.toDate(), 'dd/MM/yyyy HH:mm') : 'N/A'}
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
                            <DropdownMenuLabel>Gerenciar</DropdownMenuLabel>
                            {canEdit && (
                              <DropdownMenuItem onClick={() => handleEdit(loc)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Editar Local
                              </DropdownMenuItem>
                            )}
                            {canDelete && (
                              <DropdownMenuItem onClick={() => handleDelete(loc)} className="text-red-600 focus:text-red-600">
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
