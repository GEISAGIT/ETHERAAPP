'use client';

import { AppLayout } from '@/components/layout/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useCollection, useFirestore, useUser, useMemoFirebase, updateDocumentNonBlocking, useStorage, addDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, doc, query, Timestamp, serverTimestamp, where, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import type { Employee, EmployeeDiscount, TimeAdjustment, CompensationRecord, WorkStatus, EmployeeDocument, AttendanceRecord, AttendanceType } from '@/lib/types';
import { useState, useMemo, useEffect, Suspense } from 'react';
import { CalendarIcon, Loader2, Save, Plus, Trash2, Clock, UserCheck, CreditCard, CalendarDays, History, UploadCloud, FileText, Download, Paperclip, ClipboardList, Stethoscope, AlertCircle, Edit, Check } from 'lucide-react';
import { format, differenceInMinutes, startOfMonth, endOfMonth, isSameDay, setHours, setMinutes, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';

function HRTimesheetContent() {
  const firestore = useFirestore();
  const storage = useStorage();
  const { user } = useUser();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [activeTab, setActiveTab] = useState('contract');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  // States for manual/edit dialogs
  const [isManualRecordOpen, setIsManualRecordOpen] = useState(false);
  const [isEditRecordOpen, setIsEditRecordOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  
  const [manualDate, setManualDate] = useState<Date>(new Date());
  const [manualTime, setManualTime] = useState<string>(format(new Date(), 'HH:mm'));
  const [manualType, setManualType] = useState<AttendanceType>('clock_in');
  const [manualNotes, setManualTypeNotes] = useState('');

  // Read employee ID from URL if present
  useEffect(() => {
    const urlId = searchParams.get('id');
    if (urlId) {
      setSelectedEmployeeId(urlId);
    }
  }, [searchParams]);

  // Fetch employees for selection
  const employeesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'employees'));
  }, [firestore, user]);

  const { data: employees, isLoading: employeesLoading } = useCollection<Employee>(employeesQuery);

  const selectedEmployee = useMemo(() => 
    employees?.find(e => e.id === selectedEmployeeId) || null
  , [employees, selectedEmployeeId]);

  // Attendance Records for the selected employee
  const attendanceQuery = useMemoFirebase(() => {
    if (!firestore || !selectedEmployeeId) return null;
    return query(
      collection(firestore, 'attendanceRecords'),
      where('employeeId', '==', selectedEmployeeId)
    );
  }, [firestore, selectedEmployeeId]);

  const { data: rawAttendance, isLoading: attendanceLoading } = useCollection<AttendanceRecord>(attendanceQuery);

  // Form State for Employee Data
  const [formData, setFormData] = useState<Partial<Employee>>({});

  useEffect(() => {
    if (selectedEmployee) {
      setFormData({
        fullName: selectedEmployee.fullName,
        cpf: selectedEmployee.cpf,
        status: selectedEmployee.status,
        regimeType: selectedEmployee.regimeType,
        overtimePolicy: selectedEmployee.overtimePolicy,
        registrationNumber: selectedEmployee.registrationNumber || '',
        pisPasep: selectedEmployee.pisPasep || '',
        ctps: selectedEmployee.ctps || '',
        workStatus: selectedEmployee.workStatus || 'regular',
        hireDate: selectedEmployee.hireDate || null,
        dismissalDate: selectedEmployee.dismissalDate || null,
        experienceEndDate: selectedEmployee.experienceEndDate || null,
        vacationExpirationDate: selectedEmployee.vacationExpirationDate || null,
        discounts: selectedEmployee.discounts || [],
        adjustments: selectedEmployee.adjustments || [],
        compensations: selectedEmployee.compensations || [],
        documents: selectedEmployee.documents || [],
      });
    } else {
      setFormData({});
    }
  }, [selectedEmployee]);

  const handleUpdateField = (field: keyof Employee, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveEmployee = () => {
    if (!firestore || !selectedEmployeeId) return;

    // Validação de campos obrigatórios
    const requiredFields: { key: keyof Employee; label: string }[] = [
      { key: 'fullName', label: 'Nome Completo' },
      { key: 'cpf', label: 'CPF' },
      { key: 'status', label: 'Status' },
      { key: 'regimeType', label: 'Tipo de Regime' },
      { key: 'overtimePolicy', label: 'Política de Horas Extras' },
    ];

    for (const field of requiredFields) {
      if (!formData[field.key]) {
        toast({
          variant: 'destructive',
          title: 'Campo Obrigatório',
          description: `O campo "${field.label}" deve ser preenchido para salvar.`,
        });
        return;
      }
    }

    setIsSaving(true);

    // Limpeza de dados undefined para evitar erro do Firebase
    const cleanData = Object.entries(formData).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        (acc as any)[key] = value;
      } else {
        (acc as any)[key] = null; // Envia null em vez de undefined
      }
      return acc;
    }, {} as any);

    const employeeRef = doc(firestore, 'employees', selectedEmployeeId);
    updateDocumentNonBlocking(employeeRef, {
      ...cleanData,
      updatedAt: serverTimestamp(),
    });

    setTimeout(() => {
      toast({
        title: 'Dados Atualizados',
        description: 'As informações do colaborador foram salvas com sucesso.',
      });
      setIsSaving(false);
    }, 500);
  };

  const handleCreateManualRecord = () => {
    if (!firestore || !selectedEmployeeId || !selectedEmployee) return;
    
    // Create timestamp from date + time strings
    const [hours, minutes] = manualTime.split(':').map(Number);
    const finalDate = setMinutes(setHours(manualDate, hours), minutes);
    
    const recordData = {
      employeeId: selectedEmployeeId,
      employeeName: selectedEmployee.fullName,
      timestamp: Timestamp.fromDate(finalDate),
      type: manualType,
      notes: manualNotes || 'Registro manual inserido pelo RH',
      manual: true,
      updatedBy: user?.displayName || 'RH'
    };

    addDocumentNonBlocking(collection(firestore, 'attendanceRecords'), recordData);
    
    toast({ 
      title: 'Ponto Inserido', 
      description: `Registro de ${getAttendanceTypeLabel(manualType)} adicionado para ${format(finalDate, 'dd/MM/yyyy HH:mm')}.` 
    });
    
    setIsManualRecordOpen(false);
    setManualTypeNotes('');
  };

  const handleUpdateRecord = () => {
    if (!firestore || !editingRecord) return;

    const [hours, minutes] = manualTime.split(':').map(Number);
    const finalDate = setMinutes(setHours(manualDate, hours), minutes);

    const docRef = doc(firestore, 'attendanceRecords', editingRecord.id);
    updateDocumentNonBlocking(docRef, {
      timestamp: Timestamp.fromDate(finalDate),
      notes: manualNotes || 'Horário ajustado pelo RH',
      manual: true,
      updatedBy: user?.displayName || 'RH'
    });

    toast({ title: 'Horário Atualizado' });
    setIsEditRecordOpen(false);
    setEditingRecord(null);
    setManualTypeNotes('');
  };

  const deleteRecord = (id: string) => {
    if (!firestore) return;
    deleteDocumentNonBlocking(doc(firestore, 'attendanceRecords', id));
    toast({ title: 'Registro Removido' });
  };

  const openEditDialog = (record: AttendanceRecord) => {
    const date = record.timestamp.toDate();
    setEditingRecord(record);
    setManualDate(date);
    setManualTime(format(date, 'HH:mm'));
    setManualTypeNotes(record.notes || '');
    setIsEditRecordOpen(true);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, isAtestado: boolean = false) => {
    const file = event.target.files?.[0];
    if (!file || !storage || !selectedEmployeeId) return;

    setIsUploading(true);
    try {
      const folder = isAtestado ? 'atestados' : 'employee-docs';
      const storagePath = `${folder}/${selectedEmployeeId}/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, storagePath);
      
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      const newDoc: EmployeeDocument = {
        id: crypto.randomUUID(),
        name: isAtestado ? `ATESTADO_${format(new Date(), 'ddMMyy')}_${file.name}` : file.name,
        url: downloadURL,
        uploadedAt: Timestamp.now(),
      };

      const updatedDocs = [...(formData.documents || []), newDoc];
      handleUpdateField('documents', updatedDocs);
      
      const employeeRef = doc(firestore!, 'employees', selectedEmployeeId);
      updateDocumentNonBlocking(employeeRef, { documents: updatedDocs, updatedAt: serverTimestamp() });

      toast({ title: isAtestado ? 'Atestado Anexado' : 'Documento Anexado' });
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Erro no Upload' });
    } finally {
      setIsUploading(false);
    }
  };

  const removeDocument = (docId: string) => {
    const updatedDocs = formData.documents?.filter(d => d.id !== docId);
    handleUpdateField('documents', updatedDocs);
    if (selectedEmployeeId && firestore) {
        const employeeRef = doc(firestore, 'employees', selectedEmployeeId);
        updateDocumentNonBlocking(employeeRef, { documents: updatedDocs, updatedAt: serverTimestamp() });
    }
  };

  const getAttendanceTypeLabel = (type: AttendanceType) => {
    const labels: Record<AttendanceType, string> = {
      clock_in: 'Entrada', 
      clock_out: 'Saída', 
      break_start: 'Saída Almoço', 
      break_end: 'Retorno Almoço'
    };
    return labels[type] || 'Ponto';
  };

  const groupedHistory = useMemo(() => {
    if (!rawAttendance) return [];
    
    const groups: Record<string, AttendanceRecord[]> = {};
    
    rawAttendance.forEach(record => {
      const dateObj = record.timestamp instanceof Timestamp ? record.timestamp.toDate() : new Date(record.timestamp);
      const dateKey = format(dateObj, 'yyyy-MM-dd');
      
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(record);
    });

    return Object.entries(groups).map(([date, records]) => ({
      date: new Date(date + 'T12:00:00'),
      records: records.sort((a, b) => {
        const tA = a.timestamp instanceof Timestamp ? a.timestamp.toMillis() : new Date(a.timestamp).getTime();
        const tB = b.timestamp instanceof Timestamp ? b.timestamp.toMillis() : new Date(b.timestamp).getTime();
        return tA - tB;
      })
    })).sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [rawAttendance]);

  const calculateTotalHours = (records: AttendanceRecord[]) => {
    const clockIn = records.find(r => r.type === 'clock_in')?.timestamp.toDate();
    const breakStart = records.find(r => r.type === 'break_start')?.timestamp.toDate();
    const breakEnd = records.find(r => r.type === 'break_end')?.timestamp.toDate();
    const clockOut = records.find(r => r.type === 'clock_out')?.timestamp.toDate();

    if (!clockIn || !clockOut) return "--:--";

    let totalMinutes = differenceInMinutes(clockOut, clockIn);
    if (breakStart && breakEnd) {
      const breakMinutes = differenceInMinutes(breakEnd, breakStart);
      totalMinutes -= breakMinutes;
    }

    const hours = Math.floor(Math.max(0, totalMinutes) / 60);
    const minutes = Math.max(0, totalMinutes) % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  if (employeesLoading) return <div className="flex h-[400px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-8">
      {/* Dialog: Manual Record */}
      <Dialog open={isManualRecordOpen} onOpenChange={setIsManualRecordOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Registro Manual</DialogTitle>
            <DialogDescription>Insira uma batida de ponto retroativa para o colaborador.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Data do Ponto</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {manualDate ? format(manualDate, "PPP", { locale: ptBR }) : <span>Selecione...</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={manualDate} onSelect={(d) => d && setManualDate(d)} initialFocus locale={ptBR} />
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Horário</Label>
                <Input type="time" value={manualTime} onChange={(e) => setManualTime(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Tipo de Batida</Label>
                <Select value={manualType} onValueChange={(v: AttendanceType) => setManualType(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="clock_in">Entrada</SelectItem>
                    <SelectItem value="break_start">Sair p/ Almoço</SelectItem>
                    <SelectItem value="break_end">Retorno Almoço</SelectItem>
                    <SelectItem value="clock_out">Saída Final</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Justificativa / Nota</Label>
              <Input placeholder="Ex: Esqueceu de bater o ponto" value={manualNotes} onChange={(e) => setManualTypeNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="ghost">Cancelar</Button></DialogClose>
            <Button onClick={handleCreateManualRecord}>Salvar Registro</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Edit Existing Record */}
      <Dialog open={isEditRecordOpen} onOpenChange={setIsEditRecordOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ajustar Horário de Ponto</DialogTitle>
            <DialogDescription>Modifique o horário original registrado pelo colaborador.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Data</Label>
              <Input value={format(manualDate, 'dd/MM/yyyy')} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label>Novo Horário</Label>
              <Input type="time" value={manualTime} onChange={(e) => setManualTime(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Justificativa do Ajuste</Label>
              <Input placeholder="Ex: Ajuste solicitado via e-mail" value={manualNotes} onChange={(e) => setManualTypeNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="ghost">Cancelar</Button></DialogClose>
            <Button onClick={handleUpdateRecord}>Confirmar Ajuste</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="font-headline text-3xl font-bold tracking-tight text-primary">
            Controle de Funcionários
          </h1>
          <p className="text-muted-foreground">
            Gestão detalhada de dados cadastrais, contratuais e folha de ponto.
          </p>
        </div>
        <div className="flex gap-2">
          {selectedEmployeeId && (
            <Button variant="outline" onClick={() => setActiveTab('attendance')} className="border-primary/20 hover:bg-primary/5">
              <ClipboardList className="mr-2 h-4 w-4 text-primary" />
              Folha de Ponto
            </Button>
          )}
          {selectedEmployeeId && (activeTab !== 'attendance') && (
            <Button onClick={handleSaveEmployee} disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Salvar Alterações
            </Button>
          )}
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-xl flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-primary" />
            Seleção de Colaborador
          </CardTitle>
          <CardDescription>Escolha o funcionário para gerenciar os dados.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-w-sm">
            <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um colaborador..." />
              </SelectTrigger>
              <SelectContent>
                {employees?.map(emp => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.fullName} ({emp.position})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {selectedEmployee ? (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-6">
            <TabsTrigger value="contract">Contrato & Docs</TabsTrigger>
            <TabsTrigger value="attendance" className="gap-2">
              <Clock className="h-4 w-4" /> Folha Ponto
            </TabsTrigger>
            <TabsTrigger value="experience">Status</TabsTrigger>
            <TabsTrigger value="discounts">Descontos</TabsTrigger>
            <TabsTrigger value="adjustments">Ajustes</TabsTrigger>
            <TabsTrigger value="documents">Anexos</TabsTrigger>
          </TabsList>

          <TabsContent value="attendance" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Ações do RH</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs uppercase text-muted-foreground">Ajuste de Ponto</Label>
                    <Button variant="default" size="sm" className="w-full" onClick={() => setIsManualRecordOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" /> Registro Manual
                    </Button>
                  </div>
                  <div className="pt-4 space-y-2 border-t">
                    <Label className="text-xs uppercase text-muted-foreground">Saúde & Abono</Label>
                    <div className="relative">
                      <Input type="file" className="hidden" id="atestado-upload" onChange={(e) => handleFileUpload(e, true)} disabled={isUploading} />
                      <Button variant="secondary" size="sm" className="w-full" asChild disabled={isUploading}>
                        <label htmlFor="atestado-upload" className="cursor-pointer">
                          {isUploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Stethoscope className="h-4 w-4 mr-2" />}
                          Anexar Atestado
                        </label>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="lg:col-span-3">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ClipboardList className="h-5 w-5 text-primary" />
                    Histórico de Marcações
                  </CardTitle>
                  <CardDescription>Visualização detalhada da jornada. Clique nos horários para editar.</CardDescription>
                </CardHeader>
                <CardContent>
                  {attendanceLoading ? (
                    <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                  ) : groupedHistory.length === 0 ? (
                    <div className="text-center py-20 border-2 border-dashed rounded-lg text-muted-foreground">
                      <p>Nenhum registro de ponto encontrado para este colaborador.</p>
                    </div>
                  ) : (
                    <div className="rounded-md border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="w-[150px]">Data</TableHead>
                            <TableHead>Entrada</TableHead>
                            <TableHead>Almoço</TableHead>
                            <TableHead>Retorno</TableHead>
                            <TableHead>Saída</TableHead>
                            <TableHead className="text-right">H. Líquidas</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {groupedHistory.map((day) => {
                            const clockIn = day.records.find(r => r.type === 'clock_in');
                            const breakStart = day.records.find(r => r.type === 'break_start');
                            const breakEnd = day.records.find(r => r.type === 'break_end');
                            const clockOut = day.records.find(r => r.type === 'clock_out');

                            const RecordCell = ({ record }: { record?: AttendanceRecord }) => (
                              <div className="group flex items-center gap-1 min-h-[32px]">
                                <span className={cn(
                                  "text-sm",
                                  record?.manual ? "font-bold text-amber-600" : "text-foreground"
                                )} title={record?.notes}>
                                  {record ? format(record.timestamp.toDate(), 'HH:mm') : '--:--'}
                                </span>
                                {record && (
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => openEditDialog(record)}
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            );

                            return (
                              <TableRow key={day.date.toISOString()}>
                                <TableCell className="font-medium">
                                  {format(day.date, "dd/MM (eee)", { locale: ptBR })}
                                </TableCell>
                                <TableCell><RecordCell record={clockIn} /></TableCell>
                                <TableCell><RecordCell record={breakStart} /></TableCell>
                                <TableCell><RecordCell record={breakEnd} /></TableCell>
                                <TableCell><RecordCell record={clockOut} /></TableCell>
                                <TableCell className="text-right font-mono font-bold text-primary">
                                  {calculateTotalHours(day.records)}
                                </TableCell>
                                <TableCell>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => {
                                    day.records.forEach(r => deleteRecord(r.id));
                                  }}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="contract">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader><CardTitle className="text-lg">Datas de Vigência</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Data de Admissão</Label>
                    <Input value={formData.hireDate ? format(formData.hireDate.toDate(), 'dd/MM/yyyy') : ''} readOnly className="bg-muted" />
                  </div>
                  <div className="space-y-2">
                    <Label>Vencimento de Férias</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !formData.vacationExpirationDate && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.vacationExpirationDate ? format(formData.vacationExpirationDate.toDate(), "PPP", { locale: ptBR }) : <span>Definir data...</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar mode="single" selected={formData.vacationExpirationDate?.toDate()} onSelect={(date) => handleUpdateField('vacationExpirationDate', date ? Timestamp.fromDate(date) : null)} initialFocus locale={ptBR} />
                      </PopoverContent>
                    </Popover>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-lg">Identificação</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Matrícula</Label>
                      <Input placeholder="Ex: 00452" value={formData.registrationNumber || ''} onChange={(e) => handleUpdateField('registrationNumber', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>PIS / PASEP</Label>
                      <Input placeholder="000.00000.00-0" value={formData.pisPasep || ''} onChange={(e) => handleUpdateField('pisPasep', e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>RNE / CTPS</Label>
                    <Input placeholder="Carteira de Trabalho" value={formData.ctps || ''} onChange={(e) => handleUpdateField('ctps', e.target.value)} />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="experience">
            <Card>
              <CardHeader><CardTitle className="text-lg">Situação Profissional</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Status de Trabalho</Label>
                  <Select value={formData.workStatus} onValueChange={(v: WorkStatus) => handleUpdateField('workStatus', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="regular">Regular</SelectItem>
                      <SelectItem value="temporary">Temporário</SelectItem>
                      <SelectItem value="probation">Em Experiência</SelectItem>
                      <SelectItem value="inactive">Inativo (Desligado)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Fim do Período de Experiência</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !formData.experienceEndDate && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.experienceEndDate ? format(formData.experienceEndDate.toDate(), "PPP", { locale: ptBR }) : <span>Definir data...</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={formData.experienceEndDate?.toDate()} onSelect={(date) => handleUpdateField('experienceEndDate', date ? Timestamp.fromDate(date) : null)} initialFocus locale={ptBR} />
                    </PopoverContent>
                  </Popover>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="discounts">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Configurador de Descontos</CardTitle>
                <Button variant="outline" size="sm" onClick={() => handleUpdateField('discounts', [...(formData.discounts || []), { id: crypto.randomUUID(), name: '', percentage: 0 }])}>
                  <Plus className="h-4 w-4 mr-2" /> Novo
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {formData.discounts?.map((discount, index) => (
                  <div key={discount.id} className="flex items-end gap-4 border p-4 rounded-md">
                    <div className="flex-1 space-y-2"><Label>Nome</Label><Input value={discount.name} onChange={(e) => { const nd = [...(formData.discounts || [])]; nd[index].name = e.target.value; handleUpdateField('discounts', nd); }} /></div>
                    <div className="w-32 space-y-2"><Label>%</Label><Input type="number" value={discount.percentage} onChange={(e) => { const nd = [...(formData.discounts || [])]; nd[index].percentage = parseFloat(e.target.value) || 0; handleUpdateField('discounts', nd); }} /></div>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleUpdateField('discounts', formData.discounts?.filter(d => d.id !== discount.id))}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="adjustments">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Ajustes & Compensações</CardTitle>
                <Button variant="outline" size="sm" onClick={() => handleUpdateField('adjustments', [...(formData.adjustments || []), { id: crypto.randomUUID(), startDate: Timestamp.now(), endDate: Timestamp.now(), reason: '' }])}>
                  <Plus className="h-4 w-4 mr-2" /> Novo Ajuste
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {formData.adjustments?.map((adj, index) => (
                  <div key={adj.id} className="grid grid-cols-1 md:grid-cols-3 gap-4 border p-4 rounded-md">
                    <div className="space-y-2"><Label>Início</Label><Input type="date" value={format(adj.startDate.toDate(), 'yyyy-MM-dd')} onChange={(e) => { const na = [...(formData.adjustments || [])]; na[index].startDate = Timestamp.fromDate(new Date(e.target.value)); handleUpdateField('adjustments', na); }} /></div>
                    <div className="space-y-2"><Label>Fim</Label><Input type="date" value={format(adj.endDate.toDate(), 'yyyy-MM-dd')} onChange={(e) => { const na = [...(formData.adjustments || [])]; na[index].endDate = Timestamp.fromDate(new Date(e.target.value)); handleUpdateField('adjustments', na); }} /></div>
                    <div className="space-y-2 flex items-end gap-2">
                      <div className="flex-1 space-y-2"><Label>Motivo</Label><Input value={adj.reason} onChange={(e) => { const na = [...(formData.adjustments || [])]; na[index].reason = e.target.value; handleUpdateField('adjustments', na); }} /></div>
                      <Button variant="ghost" size="icon" onClick={() => handleUpdateField('adjustments', formData.adjustments?.filter(a => a.id !== adj.id))}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Anexos & Documentos</CardTitle>
                <div className="relative">
                  <Input type="file" className="hidden" id="doc-upload-hr-docs" onChange={(e) => handleFileUpload(e)} disabled={isUploading} />
                  <Button variant="outline" size="sm" asChild disabled={isUploading}>
                    <label htmlFor="doc-upload-hr-docs" className="cursor-pointer">
                      {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                      Anexar Novo
                    </label>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {formData.documents?.length === 0 ? (
                  <p className="text-center py-12 text-muted-foreground italic">Nenhum documento anexado.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {formData.documents?.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between p-3 border rounded-md group hover:border-primary">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <FileText className="h-5 w-5 text-primary shrink-0" />
                          <div className="flex flex-col overflow-hidden">
                            <span className="text-sm font-medium truncate">{doc.name}</span>
                            <span className="text-[10px] text-muted-foreground">{format(doc.uploadedAt.toDate(), 'dd/MM/yy')}</span>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" asChild><Link href={doc.url} target="_blank"><Download className="h-4 w-4" /></Link></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100" onClick={() => removeDocument(doc.id)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      ) : (
        <div className="flex h-64 items-center justify-center rounded-lg border-2 border-dashed bg-muted/10">
          <p className="text-muted-foreground font-medium">Selecione um colaborador acima para começar a gestão.</p>
        </div>
      )}
    </div>
  );
}

export default function HRTimesheetPage() {
  return (
    <AppLayout>
      <Suspense fallback={<div className="flex h-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
        <HRTimesheetContent />
      </Suspense>
    </AppLayout>
  );
}