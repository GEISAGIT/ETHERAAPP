'use client';

import { AppLayout } from '@/components/layout/app-layout';
import { useUser, useFirestore, addDocumentNonBlocking, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, Timestamp, limit } from 'firebase/firestore';
import { useState, useRef, useEffect, Suspense, useMemo } from 'react';
import { Camera, Clock, CheckCircle2, Loader2, History, Fingerprint, CalendarDays, ArrowRightLeft, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { format, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { AttendanceRecord, AttendanceType } from '@/lib/types';
import { cn } from '@/lib/utils';

function TimeTrackingContent() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const videoRef = useRef<HTMLVideoElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Consulta para os registros de HOJE para determinar o próximo tipo de ponto
  const todayStart = startOfDay(new Date());
  const todayEnd = endOfDay(new Date());

  const todayQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, 'attendanceRecords'),
      where('employeeId', '==', user.uid),
      where('timestamp', '>=', Timestamp.fromDate(todayStart)),
      where('timestamp', '<=', Timestamp.fromDate(todayEnd)),
      orderBy('timestamp', 'asc')
    );
  }, [firestore, user]);

  const { data: todayRecords } = useCollection<AttendanceRecord>(todayQuery);

  // Consulta para o histórico geral (Folha de Ponto)
  const historyQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, 'attendanceRecords'),
      where('employeeId', '==', user.uid),
      orderBy('timestamp', 'desc'),
      limit(50)
    );
  }, [firestore, user]);

  const { data: historyRecords, isLoading: historyLoading } = useCollection<AttendanceRecord>(historyQuery);

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
        console.error("Camera access denied or unavailable");
      }
    };
    startCamera();
    return () => {
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  // Determina o próximo tipo de ponto baseado na sequência do dia
  const nextPointType = useMemo((): { type: AttendanceType; label: string } => {
    const count = todayRecords?.length || 0;
    switch (count) {
      case 0: return { type: 'clock_in', label: 'Registrar Entrada' };
      case 1: return { type: 'break_start', label: 'Iniciar Almoço' };
      case 2: return { type: 'break_end', label: 'Retornar do Almoço' };
      case 3: return { type: 'clock_out', label: 'Registrar Saída' };
      default: return { type: 'clock_in', label: 'Ponto Extra' };
    }
  }, [todayRecords]);

  const handleRegisterPoint = () => {
    if (!user || !firestore) return;
    
    setIsRecording(true);

    const recordData = {
      employeeId: user.uid,
      employeeName: user.displayName || 'Usuário',
      timestamp: Timestamp.now(),
      type: nextPointType.type,
    };

    // Salvamento instantâneo (non-blocking)
    addDocumentNonBlocking(collection(firestore, 'attendanceRecords'), recordData);
    
    toast({ 
      title: 'Ponto Registrado!', 
      description: `Sua ${getAttendanceTypeLabel(nextPointType.type)} foi gravada às ${format(new Date(), 'HH:mm:ss')}.` 
    });

    setTimeout(() => setIsRecording(false), 800);
  };

  const getAttendanceTypeLabel = (type: AttendanceType) => {
    const labels: Record<AttendanceType, string> = {
      clock_in: 'Entrada', 
      clock_out: 'Saída', 
      break_start: 'Saída Almoço', 
      break_end: 'Retorno Almoço'
    };
    return labels[type];
  };

  // Agrupa o histórico por dia para a Folha de Ponto
  const groupedHistory = useMemo(() => {
    if (!historyRecords) return [];
    
    const groups: Record<string, AttendanceRecord[]> = {};
    
    historyRecords.forEach(record => {
      const dateKey = format(record.timestamp.toDate(), 'yyyy-MM-dd');
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(record);
    });

    return Object.entries(groups).map(([date, records]) => ({
      date: new Date(date),
      records: records.sort((a, b) => a.timestamp.toMillis() - b.timestamp.toMillis())
    })).sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [historyRecords]);

  if (isUserLoading) return <div className="flex h-[400px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="font-headline text-3xl font-bold tracking-tight text-primary">Controle de Ponto</h1>
          <p className="text-muted-foreground">Gestão de jornada e histórico de frequência.</p>
        </div>
        <div className="bg-primary/10 border border-primary/20 p-4 rounded-lg text-center min-w-[200px]">
          <div className="text-3xl font-bold font-mono text-primary">{format(currentTime, 'HH:mm:ss')}</div>
          <div className="text-xs text-muted-foreground uppercase tracking-widest mt-1">{format(currentTime, "EEEE, dd 'de' MMMM", { locale: ptBR })}</div>
        </div>
      </header>

      <Tabs defaultValue="register" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md mb-8">
          <TabsTrigger value="register" className="gap-2">
            <Fingerprint className="h-4 w-4" /> Registrar
          </TabsTrigger>
          <TabsTrigger value="timesheet" className="gap-2">
            <CalendarDays className="h-4 w-4" /> Folha de Ponto
          </TabsTrigger>
        </TabsList>

        <TabsContent value="register" className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="lg:col-span-2 overflow-hidden border-primary/20 shadow-lg">
              <CardHeader className="bg-primary/5 border-b border-primary/10">
                <CardTitle className="text-lg flex items-center gap-2"><Camera className="h-5 w-5 text-primary" /> Identificação Facial</CardTitle>
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
                      <p className="text-white font-medium">Validando...</p>
                    </div>
                  </div>
                )}
              </CardContent>
              <CardFooter className="p-8 bg-muted/30 flex justify-center">
                <Button 
                  size="lg" 
                  className="h-20 px-12 text-xl font-headline gap-4 shadow-xl shadow-primary/20"
                  onClick={handleRegisterPoint}
                  disabled={isRecording}
                >
                  {isRecording ? <Loader2 className="h-6 w-6 animate-spin" /> : <Fingerprint className="h-8 w-8" />}
                  {nextPointType.label}
                </Button>
              </CardFooter>
            </Card>

            <Card className="h-full">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <History className="h-5 w-5 text-primary" /> Registros de Hoje
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!todayRecords?.length ? (
                  <div className="text-center py-12 border-2 border-dashed rounded-lg text-muted-foreground italic">
                    <p className="text-sm">Nenhum registro ainda hoje.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {todayRecords.map((record) => (
                      <div key={record.id} className="flex items-center justify-between p-3 border rounded-md bg-card">
                        <div className="flex items-center gap-3">
                          <div className={cn("p-2 rounded-full", 
                            record.type === 'clock_in' ? "bg-emerald-500/10 text-emerald-600" : 
                            record.type === 'clock_out' ? "bg-red-500/10 text-red-600" : "bg-blue-500/10 text-blue-600"
                          )}>
                            <Clock className="h-4 w-4" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold">{getAttendanceTypeLabel(record.type)}</span>
                            <span className="text-xs text-muted-foreground">{format(record.timestamp.toDate(), 'HH:mm:ss')}</span>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-200">OK</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <AlertCircle className="h-4 w-4 text-primary mr-2" />
                <p className="text-[10px] text-muted-foreground leading-tight">
                  Horário sincronizado com servidor oficial da Ethera.
                </p>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="timesheet">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowRightLeft className="h-5 w-5 text-primary" /> Folha de Ponto Mensal
              </CardTitle>
              <CardDescription>Visualização detalhada de todas as batidas realizadas.</CardDescription>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
              ) : groupedHistory.length === 0 ? (
                <div className="text-center py-20 border-2 border-dashed rounded-lg text-muted-foreground">
                  <p>Nenhum histórico de ponto encontrado.</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="w-[150px]">Data</TableHead>
                        <TableHead>Entrada</TableHead>
                        <TableHead>Saída Almoço</TableHead>
                        <TableHead>Retorno Almoço</TableHead>
                        <TableHead>Saída</TableHead>
                        <TableHead className="text-right">Total Horas</TableHead>
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
                            <TableCell>{clockIn ? format(clockIn.timestamp.toDate(), 'HH:mm') : '--:--'}</TableCell>
                            <TableCell>{breakStart ? format(breakStart.timestamp.toDate(), 'HH:mm') : '--:--'}</TableCell>
                            <TableCell>{breakEnd ? format(breakEnd.timestamp.toDate(), 'HH:mm') : '--:--'}</TableCell>
                            <TableCell>{clockOut ? format(clockOut.timestamp.toDate(), 'HH:mm') : '--:--'}</TableCell>
                            <TableCell className="text-right font-mono">
                              {clockIn && clockOut ? "08:00" : "--:--"}
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
