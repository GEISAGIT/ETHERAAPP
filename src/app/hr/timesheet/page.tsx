'use client';

import { AppLayout } from '@/components/layout/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useCollection, useFirestore, useUser, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { collection, doc, query, Timestamp, serverTimestamp } from 'firebase/firestore';
import type { Employee, EmployeeDiscount, TimeAdjustment, CompensationRecord, WorkStatus } from '@/lib/types';
import { useState, useMemo, useEffect } from 'react';
import { CalendarIcon, Loader2, Save, Plus, Trash2, Clock, UserCheck, CreditCard, CalendarDays, History } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

export default function HRTimesheetPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  // Fetch employees for selection
  const employeesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'employees'));
  }, [firestore, user]);

  const { data: employees, isLoading: employeesLoading } = useCollection<Employee>(employeesQuery);

  const selectedEmployee = useMemo(() => 
    employees?.find(e => e.id === selectedEmployeeId) || null
  , [employees, selectedEmployeeId]);

  // Form State
  const [formData, setFormData] = useState<Partial<Employee>>({});

  useEffect(() => {
    if (selectedEmployee) {
      setFormData({
        registrationNumber: selectedEmployee.registrationNumber || '',
        pisPasep: selectedEmployee.pisPasep || '',
        ctps: selectedEmployee.ctps || '',
        workStatus: selectedEmployee.workStatus || 'regular',
        hireDate: selectedEmployee.hireDate,
        dismissalDate: selectedEmployee.dismissalDate,
        experienceEndDate: selectedEmployee.experienceEndDate,
        discounts: selectedEmployee.discounts || [],
        adjustments: selectedEmployee.adjustments || [],
        compensations: selectedEmployee.compensations || [],
      });
    } else {
      setFormData({});
    }
  }, [selectedEmployee]);

  const handleUpdateField = (field: keyof Employee, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (!firestore || !selectedEmployeeId) return;
    setIsSaving(true);

    const employeeRef = doc(firestore, 'employees', selectedEmployeeId);
    updateDocumentNonBlocking(employeeRef, {
      ...formData,
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

  const addDiscount = () => {
    const newDiscount: EmployeeDiscount = { id: crypto.randomUUID(), name: '', percentage: 0 };
    handleUpdateField('discounts', [...(formData.discounts || []), newDiscount]);
  };

  const removeDiscount = (id: string) => {
    handleUpdateField('discounts', formData.discounts?.filter(d => d.id !== id));
  };

  const addAdjustment = () => {
    const newAdj: TimeAdjustment = { id: crypto.randomUUID(), startDate: Timestamp.now(), endDate: Timestamp.now(), reason: '' };
    handleUpdateField('adjustments', [...(formData.adjustments || []), newAdj]);
  };

  const addCompensation = (type: 'date' | 'period') => {
    const newComp: CompensationRecord = { 
      id: crypto.randomUUID(), 
      type, 
      description: '',
      date: type === 'date' ? Timestamp.now() : undefined,
      startDate: type === 'period' ? Timestamp.now() : undefined,
      endDate: type === 'period' ? Timestamp.now() : undefined,
    };
    handleUpdateField('compensations', [...(formData.compensations || []), newComp]);
  };

  if (employeesLoading) {
    return (
      <AppLayout>
        <div className="flex h-full items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-8">
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="font-headline text-3xl font-bold tracking-tight text-primary">
              Dados do Ponto & Contrato
            </h1>
            <p className="text-muted-foreground">
              Gestão detalhada de admissão, demissão e configurações de folha.
            </p>
          </div>
          {selectedEmployeeId && (
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Salvar Alterações
            </Button>
          )}
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
          <Tabs defaultValue="contract" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
              <TabsTrigger value="contract">Contrato & Docs</TabsTrigger>
              <TabsTrigger value="experience">Status & Experiência</TabsTrigger>
              <TabsTrigger value="discounts">Descontos</TabsTrigger>
              <TabsTrigger value="adjustments">Ajustes & Compensação</TabsTrigger>
            </TabsList>

            <TabsContent value="contract">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Datas de Vigência</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Data de Admissão</Label>
                      <div className="flex gap-2">
                        <Input 
                          value={formData.hireDate ? format(formData.hireDate.toDate(), 'dd/MM/yyyy') : ''} 
                          readOnly 
                          className="bg-muted"
                        />
                        <Badge variant="outline" className="h-10">Fixo no Cadastro</Badge>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Data de Demissão (Opcional)</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !formData.dismissalDate && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {formData.dismissalDate ? format(formData.dismissalDate.toDate(), "PPP", { locale: ptBR }) : <span>Definir data...</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={formData.dismissalDate?.toDate()}
                            onSelect={(date) => handleUpdateField('dismissalDate', date ? Timestamp.fromDate(date) : null)}
                            initialFocus
                            locale={ptBR}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Documentação & Identificação</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Número de Matrícula</Label>
                        <Input 
                          placeholder="Ex: 00452" 
                          value={formData.registrationNumber || ''} 
                          onChange={(e) => handleUpdateField('registrationNumber', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>PIS / PASEP</Label>
                        <Input 
                          placeholder="000.00000.00-0" 
                          value={formData.pisPasep || ''} 
                          onChange={(e) => handleUpdateField('pisPasep', e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>RNE / CTPS</Label>
                      <Input 
                        placeholder="Número da Carteira de Trabalho" 
                        value={formData.ctps || ''} 
                        onChange={(e) => handleUpdateField('ctps', e.target.value)}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="experience">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <History className="h-5 w-5 text-primary" />
                    Situação do Colaborador
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Status de Trabalho</Label>
                      <Select 
                        value={formData.workStatus} 
                        onValueChange={(v: WorkStatus) => handleUpdateField('workStatus', v)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
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
                          <Calendar
                            mode="single"
                            selected={formData.experienceEndDate?.toDate()}
                            onSelect={(date) => handleUpdateField('experienceEndDate', date ? Timestamp.fromDate(date) : null)}
                            initialFocus
                            locale={ptBR}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="discounts">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <CreditCard className="h-5 w-5 text-primary" />
                      Configurador de Descontos
                    </CardTitle>
                    <CardDescription>Atribua descontos percentuais fixos na folha (ex: Vale Transporte, Convênio).</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={addDiscount}>
                    <Plus className="h-4 w-4 mr-2" /> Novo Desconto
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  {formData.discounts?.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8 italic">Nenhum desconto configurado.</p>
                  ) : (
                    formData.discounts?.map((discount, index) => (
                      <div key={discount.id} className="flex items-end gap-4 border p-4 rounded-md relative group">
                        <div className="flex-1 space-y-2">
                          <Label>Nome do Desconto</Label>
                          <Input 
                            placeholder="Ex: Vale Transporte" 
                            value={discount.name}
                            onChange={(e) => {
                              const newDiscounts = [...(formData.discounts || [])];
                              newDiscounts[index].name = e.target.value;
                              handleUpdateField('discounts', newDiscounts);
                            }}
                          />
                        </div>
                        <div className="w-32 space-y-2">
                          <Label>Percentual (%)</Label>
                          <Input 
                            type="number"
                            placeholder="0.00" 
                            value={discount.percentage}
                            onChange={(e) => {
                              const newDiscounts = [...(formData.discounts || [])];
                              newDiscounts[index].percentage = parseFloat(e.target.value) || 0;
                              handleUpdateField('discounts', newDiscounts);
                            }}
                          />
                        </div>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => removeDiscount(discount.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="adjustments" className="space-y-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Clock className="h-5 w-5 text-primary" />
                      Ajustes de Ponto por Período
                    </CardTitle>
                    <CardDescription>Configurações excepcionais de horário para períodos específicos.</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={addAdjustment}>
                    <Plus className="h-4 w-4 mr-2" /> Novo Ajuste
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  {formData.adjustments?.map((adj, index) => (
                    <div key={adj.id} className="grid grid-cols-1 md:grid-cols-3 gap-4 border p-4 rounded-md">
                      <div className="space-y-2">
                        <Label>Início do Período</Label>
                        <Input 
                          type="date" 
                          value={format(adj.startDate.toDate(), 'yyyy-MM-dd')}
                          onChange={(e) => {
                            const newAdjs = [...(formData.adjustments || [])];
                            newAdjs[index].startDate = Timestamp.fromDate(new Date(e.target.value));
                            handleUpdateField('adjustments', newAdjs);
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Fim do Período</Label>
                        <Input 
                          type="date" 
                          value={format(adj.endDate.toDate(), 'yyyy-MM-dd')}
                          onChange={(e) => {
                            const newAdjs = [...(formData.adjustments || [])];
                            newAdjs[index].endDate = Timestamp.fromDate(new Date(e.target.value));
                            handleUpdateField('adjustments', newAdjs);
                          }}
                        />
                      </div>
                      <div className="space-y-2 flex items-end gap-2">
                        <div className="flex-1 space-y-2">
                          <Label>Motivo / Descrição</Label>
                          <Input 
                            placeholder="Ex: Treinamento externo" 
                            value={adj.reason}
                            onChange={(e) => {
                              const newAdjs = [...(formData.adjustments || [])];
                              newAdjs[index].reason = e.target.value;
                              handleUpdateField('adjustments', newAdjs);
                            }}
                          />
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => handleUpdateField('adjustments', formData.adjustments?.filter(a => a.id !== adj.id))}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <CalendarDays className="h-5 w-5 text-primary" />
                      Compensações
                    </CardTitle>
                    <CardDescription>Atribuir dias de compensação ou folgas por banco de horas.</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => addCompensation('date')}>
                      Data Única
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => addCompensation('period')}>
                      Por Período
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {formData.compensations?.map((comp, index) => (
                    <div key={comp.id} className="flex flex-col md:flex-row items-end gap-4 border p-4 rounded-md">
                      <div className="flex-1 space-y-2 w-full">
                        <Label>Descrição da Compensação</Label>
                        <Input 
                          placeholder="Ex: Compensação feriado" 
                          value={comp.description}
                          onChange={(e) => {
                            const newComps = [...(formData.compensations || [])];
                            newComps[index].description = e.target.value;
                            handleUpdateField('compensations', newComps);
                          }}
                        />
                      </div>
                      {comp.type === 'date' ? (
                        <div className="w-full md:w-48 space-y-2">
                          <Label>Data</Label>
                          <Input 
                            type="date" 
                            value={comp.date ? format(comp.date.toDate(), 'yyyy-MM-dd') : ''}
                            onChange={(e) => {
                              const newComps = [...(formData.compensations || [])];
                              newComps[index].date = Timestamp.fromDate(new Date(e.target.value));
                              handleUpdateField('compensations', newComps);
                            }}
                          />
                        </div>
                      ) : (
                        <>
                          <div className="w-full md:w-40 space-y-2">
                            <Label>Início</Label>
                            <Input 
                              type="date" 
                              value={comp.startDate ? format(comp.startDate.toDate(), 'yyyy-MM-dd') : ''}
                              onChange={(e) => {
                                const newComps = [...(formData.compensations || [])];
                                newComps[index].startDate = Timestamp.fromDate(new Date(e.target.value));
                                handleUpdateField('compensations', newComps);
                              }}
                            />
                          </div>
                          <div className="w-full md:w-40 space-y-2">
                            <Label>Fim</Label>
                            <Input 
                              type="date" 
                              value={comp.endDate ? format(comp.endDate.toDate(), 'yyyy-MM-dd') : ''}
                              onChange={(e) => {
                                const newComps = [...(formData.compensations || [])];
                                newComps[index].endDate = Timestamp.fromDate(new Date(e.target.value));
                                handleUpdateField('compensations', newComps);
                              }}
                            />
                          </div>
                        </>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => handleUpdateField('compensations', formData.compensations?.filter(c => c.id !== comp.id))}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="flex h-64 items-center justify-center rounded-lg border-2 border-dashed bg-muted/10">
            <p className="text-muted-foreground font-medium">Selecione um colaborador acima para começar a gestão dos dados.</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
