
'use client';

import { AppLayout } from '@/components/layout/app-layout';
import { useUser, useFirestore, addDocumentNonBlocking, useCollection, useMemoFirebase, useDoc, deleteDocumentNonBlocking } from '@/firebase';
import { collection, query, where, Timestamp, limit, doc } from 'firebase/firestore';
import { useState, useRef, useEffect, Suspense, useMemo } from 'react';
import { Camera, Clock, Loader2, History, Fingerprint, CalendarDays, ArrowRightLeft, AlertCircle, Trash2, Eraser, MessageSquare } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { format, differenceInMinutes, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { AttendanceRecord, AttendanceType, UserProfile } from '@/lib/types';
import { cn } from '@/lib/utils';

const ATTENDANCE_LABELS: Record<AttendanceType, string> = {
  clock_in: 'Entrada',
  clock_out: 'Saída',
  break_start: 'Saída Almoço',
  break_end: 'Retorno Almoço'
};

function TimeTrackingContent() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const videoRef = useRef<HTMLVideoElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Estado para exclusão
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null);
  const [isClearAllOpen, setIsClearAllOpen] = useState(false);

  // Perfil do usuário para checar permissões
  const userDocRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userProfile, isLoading: profileLoading } = useDoc<UserProfile>(userDocRef);
  
  const isAdmin = userProfile?.role === 'admin';
  const canView = isAdmin || userProfile?.permissions?.timeTracking?.view;
  const canCreate = isAdmin || userProfile?.permissions?.timeTracking?.create;
  const canDelete = isAdmin || userProfile?.permissions?.timeTracking?.delete;

  // Consulta todos os registros do funcionário
  const recordsQuery = useMemoFirebase(() => {
    if (!firestore || !user || !canView) return null;
    return query(
      collection(firestore, 'attendanceRecords'),
      where('employeeId', '==', user.uid),
      limit(500)
    );
  }, [firestore, user, canView]);

  const { data: allRecords, isLoading: recordsLoading } = useCollection<AttendanceRecord>(recordsQuery);

  // Registros de hoje filtrados e ordenados em memória
  const todayRecords = useMemo(() => {
    if (!allRecords) return [];
    const today = new Date();
    return allRecords
      .filter(r => {
        const date = r.timestamp instanceof Timestamp ? r.timestamp.toDate() : new Date(r.timestamp);
        return isSameDay(date, today);
      })
      .sort((a, b) => {
        const tA = a.timestamp instanceof Timestamp ? a.timestamp.toMillis() : new Date(r.timestamp).getTime();
        const tB = b.timestamp instanceof Timestamp ? b.timestamp.toMillis() : new Date(r.timestamp).getTime();
        return tA - tB;
      });
  }, [allRecords]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch (e) {
        console.warn("Câmera indisponível");
      }
    };
    if (canView) startCamera();
    return () => {
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      }
    };
  }, [canView]);

  // Determina o próximo tipo de ponto baseado na sequência do dia
  const nextPointType = useMemo((): { type: AttendanceType; label: string } => {
    const count = todayRecords.length;
    switch (count) {
      case 0: return { type: 'clock_in', label: 'Registrar Entrada' };
      case 1: return { type: 'break_start', label: 'Iniciar Almoço' };
      case 2: return { type: 'break_end', label: 'Retornar do Almoço' };
      case 3: return { type: 'clock_out', label: 'Registrar Saída' };
      default: return { type: 'clock_in', label: 'Registrar Extra' };
    }
  }, [todayRecords]);

  const handleRegisterPoint = () => {
    if (!user || !firestore) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Usuário não autenticado.' });
      return;
    }

    if (!canCreate) {
      toast({ variant: 'destructive', title: 'Acesso Negado', description: 'Você não tem permissão para registrar pontos.' });
      return;
    }
    
    setIsRecording(true);

    const recordData = {
      employeeId: user.uid,
      employeeName: user.displayName || 'Usuário',
      timestamp: Timestamp.now(),
      type: nextPointType.type,
    };

    addDocumentNonBlocking(collection(firestore, 'attendanceRecords'), recordData);
    
    toast({ 
      title: 'Ponto Registrado!', 
      description: `${ATTENDANCE_LABELS[nextPointType.type]} às ${format(new Date(), 'HH:mm')}.` 
    });

    setTimeout(() => setIsRecording(false), 600);
  };

  const handleConfirmDelete = () => {
    if (!firestore || !recordToDelete) return;
    deleteDocumentNonBlocking(doc(firestore, 'attendanceRecords', recordToDelete));
    toast({ title: 'Registro Removido', description: 'O ponto selecionado foi excluído.' });
    setRecordToDelete(null);
  };

  const handleConfirmClearAll = () => {
    if (!firestore || !allRecords) return;
    allRecords.forEach(record => {
      deleteDocumentNonBlocking(doc(firestore, 'attendanceRecords', record.id));
    });
    toast({ title: 'Histórico Limpo', description: 'Todos os seus registros de ponto foram removidos.' });
    setIsClearAllOpen(false);
  };

  // Agrupa o histórico por dia para a Folha de Ponto
  const groupedHistory = useMemo(() => {
    if (!allRecords) return [];
    
    const groups: Record<string, AttendanceRecord[]> = {};
    
    allRecords.forEach(record => {
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
  }, [allRecords]);

  // Coleta as batidas justificadas para a legenda detalhada
  const justifiedPunches = useMemo(() => {
    const list: { date: Date; type: AttendanceType; time: string; notes: string }[] = [];
    groupedHistory.forEach(day => {
      day.records.forEach(r => {
        if (r.notes || r.manual) {
          const time = format(r.timestamp instanceof Timestamp ? r.timestamp.toDate() : new Date(r.timestamp), 'HH:mm');
          list.push({ 
            date: day.date, 
            type: r.type, 
            time, 
            notes: r.notes || 'Marcação Manual / Ajuste Administrativo' 
          });
        }
      });
    });
    return list;
  }, [groupedHistory]);

  const calculateTotalHours = (records: AttendanceRecord[]) => {
    const clockIn = records.find(r => r.type === 'clock_in')?.timestamp;
    const breakStart = records.find(r => r.type === 'break_start')?.timestamp;
    const breakEnd = records.find(r => r.type === 'break_end')?.timestamp;
    const clockOut = records.find(r => r.type === 'clock_out')?.timestamp;

    if (!clockIn || !clockOut) return "--:--";

    const dIn = clockIn instanceof Timestamp ? clockIn.toDate() : new Date(clockIn);
    const dOut = clockOut instanceof Timestamp ? clockOut.toDate() : new Date(clockOut);

    let totalMinutes = differenceInMinutes(dOut, dIn);
    
    if (breakStart && breakEnd) {
      const dBs = breakStart instanceof Timestamp ? breakStart.toDate() : new Date(breakStart);
      const dBe = breakEnd instanceof Timestamp ? breakEnd.toDate() : new Date(breakEnd);
      const breakMinutes = differenceInMinutes(dBe, dBs);
      totalMinutes -= breakMinutes;
    }

    const hours = Math.floor(Math.max(0, totalMinutes) / 60);
    const minutes = Math.max(0, totalMinutes) % 60;

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  const formatRecordTime = (record?: AttendanceRecord) => {
    if (!record) return '--:--';
    const date = record.timestamp instanceof Timestamp ? record.timestamp.toDate() : new Date(record.timestamp);
    const time = format(date, 'HH:mm');
    const isJustified = record.manual || record.notes;
    return (
      <span className="flex items-center gap-0.5">
        {time}
        {isJustified && <span className="text-[10px] align-top text-primary font-bold" title="Marcação com justificativa">*</span>}
      </span>
    );
  };

  if (isUserLoading || profileLoading) return <div className="flex h-[400px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center p-4">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-2xl font-bold">Acesso Restrito</h2>
        <p className="text-muted-foreground mt-2">Você não tem permissão para visualizar o Controle de Ponto.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Diálogos de Confirmação */}
      <AlertDialog open={!!recordToDelete} onOpenChange={(open) => !open && setRecordToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir registro de ponto?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação removerá permanentemente esta batida do sistema.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isClearAllOpen} onOpenChange={setIsClearAllOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Limpar todo o histórico?</AlertDialogTitle>
            <AlertDialogDescription>Você está prestes a excluir TODOS os seus registros de ponto. Esta ação é irreversível.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmClearAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Limpar Tudo</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="font-headline text-3xl font-bold tracking-tight text-primary">Controle de Ponto</h1>
          <p className="text-muted-foreground">Sua jornada registrada com transparência e agilidade.</p>
        </div>
        <div className="bg-primary/10 border border-primary/20 p-4 rounded-lg text-center min-w-[200px]">
          <div className="text-3xl font-bold font-mono text-primary">{format(currentTime, 'HH:mm:ss')}</div>
          <div className="text-xs text-muted-foreground uppercase tracking-widest mt-1">{format(currentTime, "EEEE, dd 'de' MMMM", { locale: ptBR })}</div>
        </div>
      </header>

      <Tabs defaultValue="register" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md mb-8">
          <TabsTrigger value="register" className="gap-2">
            <Fingerprint className="h-4 w-4" /> Registrar Ponto
          </TabsTrigger>
          <TabsTrigger value="timesheet" className="gap-2">
            <CalendarDays className="h-4 w-4" /> Minha Folha
          </TabsTrigger>
        </TabsList>

        <TabsContent value="register" className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="lg:col-span-2 overflow-hidden border-primary/20 shadow-lg">
              <CardHeader className="bg-primary/5 border-b border-primary/10">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Camera className="h-5 w-5 text-primary" /> 
                  Identificação Visual
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 relative bg-black aspect-video flex items-center justify-center">
                <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1]" />
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className={cn("w-64 h-64 border-2 rounded-full border-dashed transition-all duration-700", isRecording ? "border-primary scale-110 bg-primary/10" : "border-white/30")}>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-1 h-full bg-primary/20 animate-pulse hidden lg:block" />
                    </div>
                  </div>
                </div>
                {isRecording && (
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center">
                    <div className="text-center space-y-2">
                      <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
                      <p className="text-white font-medium">Processando...</p>
                    </div>
                  </div>
                )}
              </CardContent>
              <CardFooter className="p-8 bg-muted/30 flex justify-center">
                <Button 
                  size="lg" 
                  className="h-20 px-12 text-xl font-headline gap-4 shadow-xl shadow-primary/20"
                  onClick={handleRegisterPoint}
                  disabled={isRecording || !canCreate}
                >
                  {isRecording ? <Loader2 className="h-6 w-6 animate-spin" /> : <Fingerprint className="h-8 w-8" />}
                  {!canCreate ? 'Acesso Bloqueado' : nextPointType.label}
                </Button>
              </CardFooter>
            </Card>

            <Card className="h-full">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <History className="h-5 w-5 text-primary" /> Batidas de Hoje
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {recordsLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                ) : todayRecords.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed rounded-lg text-muted-foreground italic">
                    <p className="text-sm">Nenhum registro hoje.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {todayRecords.map((record) => (
                      <div key={record.id} className="flex items-center justify-between p-3 border rounded-md bg-card group">
                        <div className="flex items-center gap-3">
                          <div className={cn("p-2 rounded-full", 
                            record.type === 'clock_in' ? "bg-emerald-500/10 text-emerald-600" : 
                            record.type === 'clock_out' ? "bg-red-500/10 text-red-600" : "bg-blue-500/10 text-blue-600"
                          )}>
                            <Clock className="h-4 w-4" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold">{ATTENDANCE_LABELS[record.type]}</span>
                            <span className="text-xs text-muted-foreground">{formatRecordTime(record)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {canDelete && (
                            <Button 
                              variant="ghost" size="icon" 
                              className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => setRecordToDelete(record.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                          <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-200 uppercase">Sincronizado</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex flex-col items-start gap-2 border-t pt-4">
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <AlertCircle className="h-3 w-3 text-primary" />
                  <span>Registros protegidos e criptografados.</span>
                </div>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="timesheet">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ArrowRightLeft className="h-5 w-5 text-primary" /> Folha de Ponto Mensal
                </CardTitle>
                <CardDescription>Confira seus horários e total de horas trabalhadas.</CardDescription>
              </div>
              {canDelete && allRecords && allRecords.length > 0 && (
                <Button variant="outline" size="sm" className="text-destructive border-destructive/20 hover:bg-destructive/10" onClick={() => setIsClearAllOpen(true)}>
                  <Eraser className="h-4 w-4 mr-2" />
                  Limpar Histórico
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              {recordsLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
              ) : groupedHistory.length === 0 ? (
                <div className="text-center py-20 border-2 border-dashed rounded-lg text-muted-foreground">
                  <p>Nenhum histórico encontrado para este mês.</p>
                </div>
              ) : (
                <>
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="w-[150px]">Data</TableHead>
                          <TableHead>Entrada</TableHead>
                          <TableHead>Almoço</TableHead>
                          <TableHead>Retorno</TableHead>
                          <TableHead>Saída</TableHead>
                          <TableHead className="text-right">Horas Líquidas</TableHead>
                          {canDelete && <TableHead className="w-[50px]"></TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {groupedHistory.map((day) => {
                          const clockIn = day.records.find(r => r.type === 'clock_in');
                          const breakStart = day.records.find(r => r.type === 'break_start');
                          const breakEnd = day.records.find(r => r.type === 'break_end');
                          const clockOut = day.records.find(r => r.type === 'clock_out');

                          return (
                            <TableRow key={day.date.toISOString()}>
                              <TableCell className="font-medium">
                                {format(day.date, "dd/MM (eee)", { locale: ptBR })}
                              </TableCell>
                              <TableCell>{formatRecordTime(clockIn)}</TableCell>
                              <TableCell>{formatRecordTime(breakStart)}</TableCell>
                              <TableCell>{formatRecordTime(breakEnd)}</TableCell>
                              <TableCell>{formatRecordTime(clockOut)}</TableCell>
                              <TableCell className="text-right font-mono font-bold text-primary">
                                {calculateTotalHours(day.records)}
                              </TableCell>
                              {canDelete && (
                                <TableCell>
                                  <Button 
                                    variant="ghost" size="icon" 
                                    className="h-8 w-8 text-destructive"
                                    onClick={() => {
                                        // Exclui todos os registros desse dia específico
                                        day.records.forEach(r => deleteDocumentNonBlocking(doc(firestore!, 'attendanceRecords', r.id)));
                                        toast({ title: 'Dia Limpo' });
                                    }}
                                    title="Limpar dia"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              )}
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Legenda de Justificativas */}
                  {justifiedPunches.length > 0 && (
                    <div className="p-4 bg-muted/20 rounded-lg border border-primary/10">
                      <h4 className="text-xs font-bold uppercase mb-2 flex items-center gap-2 text-primary">
                        <MessageSquare className="h-3 w-3" /> Notas Explicativas de Ajustes
                      </h4>
                      <div className="grid grid-cols-1 gap-y-1">
                        {justifiedPunches.map((jp, i) => (
                          <p key={i} className="text-[11px] text-muted-foreground italic leading-tight">
                            <span className="font-bold text-primary">*</span> {format(jp.date, 'dd/MM')} - {ATTENDANCE_LABELS[jp.type]} às {jp.time}: {jp.notes}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function TimeTrackingPage() {
  return (
    <AppLayout>
      <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
        <TimeTrackingContent />
      </Suspense>
    </AppLayout>
  );
}
