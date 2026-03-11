
'use client';

import { useState, useMemo } from 'react';
import type { Address, UserProfile } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
    PlusCircle, 
    Search, 
    MoreHorizontal, 
    Edit, 
    Trash2, 
    MapPin,
    Calendar,
    Clock,
    CheckCircle2,
    XCircle,
    AlertTriangle
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
import { AddAddressDialog } from './add-address-dialog';
import { useFirestore, deleteDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { format, isAfter, isBefore, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export function AddressesClient({ data, userProfile }: { data: Address[], userProfile: UserProfile | null | undefined }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);

  const firestore = useFirestore();
  const { toast } = useToast();

  const isAdmin = userProfile?.role === 'admin';
  const canCreate = !!(isAdmin || userProfile?.permissions?.addresses?.create);
  const canEdit = !!(isAdmin || userProfile?.permissions?.addresses?.edit);
  const canDelete = !!(isAdmin || userProfile?.permissions?.addresses?.delete);

  const filteredData = useMemo(() => {
    return data.filter(address => 
        address.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        address.street.toLowerCase().includes(searchTerm.toLowerCase()) ||
        address.city.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [data, searchTerm]);

  const handleEdit = (address: Address) => {
    setEditingAddress(address);
    setIsAddOpen(true);
  };

  const handleDelete = (address: Address) => {
    if (!firestore) return;
    if (confirm(`Deseja realmente excluir o endereço "${address.label}"?`)) {
        deleteDocumentNonBlocking(doc(firestore, 'addresses', address.id));
        toast({ title: 'Endereço Removido' });
    }
  };

  const getValidityBadge = (validityDate?: any) => {
    if (!validityDate) return <Badge variant="outline" className="font-normal">Indeterminado</Badge>;
    
    const date = validityDate.toDate();
    const now = new Date();
    const soon = addDays(now, 30);

    if (isBefore(date, now)) {
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Vencido</Badge>;
    }
    if (isBefore(date, soon)) {
        return <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-200 gap-1"><AlertTriangle className="h-3 w-3" /> Vence em breve</Badge>;
    }
    return <Badge variant="secondary" className="text-emerald-600 bg-emerald-500/10 border-emerald-500/20 gap-1"><CheckCircle2 className="h-3 w-3" /> Válido</Badge>;
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
          <h1 className="font-headline text-3xl font-bold tracking-tight text-primary">Cadastro de Endereços</h1>
          <p className="text-muted-foreground">Gerencie seus endereços comerciais e pontos de atendimento.</p>
        </div>
        {canCreate && (
          <Button onClick={() => setIsAddOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Novo Endereço
          </Button>
        )}
      </header>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por apelido, rua ou cidade..."
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
                <TableHead>Localização</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    Nenhum endereço encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                filteredData.map((address) => (
                  <TableRow key={address.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold text-primary">{address.label}</span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Criado em: {format(address.createdAt.toDate(), 'dd/MM/yy')}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col text-sm">
                        <span className="font-medium">{address.street}, {address.number}</span>
                        <span className="text-muted-foreground">{address.district}, {address.city} - {address.state}</span>
                        <span className="text-xs text-muted-foreground">CEP: {address.zipCode}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {address.validityDate 
                            ? format(address.validityDate.toDate(), 'dd/MM/yyyy') 
                            : 'N/A'
                        }
                      </div>
                    </TableCell>
                    <TableCell>
                      {getValidityBadge(address.validityDate)}
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
                              <DropdownMenuItem onClick={() => handleEdit(address)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Editar Endereço
                              </DropdownMenuItem>
                            )}
                            {canDelete && (
                              <DropdownMenuItem onClick={() => handleDelete(address)} className="text-red-600 focus:text-red-600">
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
