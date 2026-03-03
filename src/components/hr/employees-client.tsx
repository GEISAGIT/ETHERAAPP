
'use client';
import type { Employee, EmployeeStatus, UserProfile } from '@/lib/types';
import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Search, MoreHorizontal, Edit, Trash2, UserPlus, Phone, Mail, Building2, Briefcase } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
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
import { AddEmployeeDialog } from './add-employee-dialog';
import { EditEmployeeDialog } from './edit-employee-dialog';
import { DeleteEmployeeAlert } from './delete-employee-alert';
import { useFirestore, deleteDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const statusConfig: Record<EmployeeStatus, { text: string; variant: "default" | "secondary" | "destructive" }> = {
    active: { text: "Ativo", variant: "default" },
    inactive: { text: "Inativo", variant: "destructive" },
    on_leave: { text: "Afastado", variant: "secondary" }
};

export function EmployeesClient({ data, isLoading, userProfile }: { data: Employee[], isLoading: boolean, userProfile: UserProfile | null | undefined }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteAlertOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  const firestore = useFirestore();
  const { toast } = useToast();

  const isAdmin = userProfile?.role === 'admin';
  const canCreate = !!(isAdmin || userProfile?.permissions?.employees?.create);
  const canEdit = !!(isAdmin || userProfile?.permissions?.employees?.edit);
  const canDelete = !!(isAdmin || userProfile?.permissions?.employees?.delete);

  const filteredData = useMemo(() => {
    return data.filter(employee => 
        employee.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.cpf.includes(searchTerm) ||
        employee.position?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [data, searchTerm]);

  const handleEdit = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsEditOpen(true);
  };

  const handleDelete = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsDeleteAlertOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!firestore || !selectedEmployee) return;
    const docRef = doc(firestore, 'employees', selectedEmployee.id);
    deleteDocumentNonBlocking(docRef);
    toast({ title: 'Funcionário Excluído', description: 'O registro foi removido com sucesso.' });
    setIsDeleteAlertOpen(false);
    setSelectedEmployee(null);
  };

  if (isLoading) {
    return (
        <div className="space-y-8">
            <header className="flex items-center justify-between">
                <div>
                    <Skeleton className="h-9 w-64" />
                    <Skeleton className="h-5 w-80 mt-2" />
                </div>
                <Skeleton className="h-10 w-44" />
            </header>
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-[400px] w-full" />
        </div>
    )
  }

  return (
    <>
      <AddEmployeeDialog open={isAddOpen} onOpenChange={setIsAddOpen} />
      <EditEmployeeDialog open={isEditOpen} onOpenChange={setIsEditOpen} employee={selectedEmployee} />
      <DeleteEmployeeAlert open={isDeleteOpen} onOpenChange={setIsDeleteAlertOpen} onConfirm={handleConfirmDelete} />

      <div className="space-y-8">
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="font-headline text-3xl font-bold tracking-tight">Funcionários</h1>
            <p className="text-muted-foreground">Gerencie o cadastro de colaboradores da clínica.</p>
          </div>
          {canCreate && (
            <Button onClick={() => setIsAddOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              Novo Funcionário
            </Button>
          )}
        </header>

        <div className="flex items-center space-x-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, CPF ou cargo..."
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
                  <TableHead>Nome</TableHead>
                  <TableHead>Cargo / Depto</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      Nenhum funcionário encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{employee.fullName}</span>
                          <span className="text-xs text-muted-foreground">CPF: {employee.cpf}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col text-sm">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Briefcase className="h-3 w-3" />
                            <span>{employee.position || 'Não definido'}</span>
                          </div>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Building2 className="h-3 w-3" />
                            <span>{employee.department || 'Não definido'}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col text-sm">
                          {employee.email && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Mail className="h-3 w-3" />
                              <span className="truncate max-w-[150px]">{employee.email}</span>
                            </div>
                          )}
                          {employee.phone && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              <span>{employee.phone}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusConfig[employee.status].variant}>
                          {statusConfig[employee.status].text}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {(canEdit || canDelete) && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Ações</DropdownMenuLabel>
                              {canEdit && (
                                <DropdownMenuItem onClick={() => handleEdit(employee)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Editar
                                </DropdownMenuItem>
                              )}
                              {canDelete && (
                                <DropdownMenuItem 
                                  onClick={() => handleDelete(employee)}
                                  className="text-red-600 focus:text-red-600"
                                >
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
    </>
  );
}
