
'use client';

import { AppLayout } from '@/components/layout/app-layout';
import { useUser, useFirestore, addDocumentNonBlocking, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, Timestamp, orderBy, limit } from 'firebase/firestore';
import { useState, useEffect, Suspense } from 'react';
import { Clock, Loader2, LogIn, LogOut, Coffee, History, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { TimeClockEntry } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

function TimeCardContent() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Relógio em tempo real
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Busca registros de hoje - Adicionado limit(500) para satisfazer regras de segurança de produção
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const entriesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, 'timeEntries'),
      where('userId', '==', user.uid),
      where('dateStr', '==', todayStr),
      orderBy('timestamp', 'asc'),
      limit(500)
    );
  }, [firestore, user, todayStr]);

  const { data: entries, isLoading: entriesLoading, error: entriesError } = useCollection<TimeClockEntry>(entriesQuery);

  const handleClockAction = async (type: TimeClockEntry['type']) => {
    if (!user || !firestore) return;
    setIsSubmitting(true);

    const labels = {
      entrada: 'Entrada',
      saida_almoco: 'Saída Almoço',
      volta_almoco: 'Retorno Almoço',
      saida: 'Saída Final'
    };

    const entryData: Omit<TimeClockEntry, 'id'> = {
      userId: user.uid,
      userName: user.displayName || 'Usuário',
      timestamp: Timestamp.now(),
      type,
      dateStr: todayStr
    };

    addDocumentNonBlocking(collection(firestore, 'timeEntries'), entryData);
    
    toast({
      title: 'Ponto Registrado!',
      description: `${labels[type]} registrado às ${format(new Date(), 'HH:mm')}.`
    });

    setTimeout(() => setIsSubmitting(false), 500);
  };

  const safeFormatTime = (ts: any) => {
    if (!ts) return '--:--';
    try {
      // Tratamento ultra-seguro para evitar erro de "seconds" em produção
      const date = ts instanceof Timestamp ? ts.toDate() : (ts?.seconds ? new Date(ts.seconds * 1000) : new Date());
      return format(date, 'HH:mm:ss');
    } catch (e) {
      return '--:--';
    }
  };

  if (isUserLoading) return <div className="flex h-[400px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="font-headline text-3xl font-bold tracking-tight text-primary">Cartão de Ponto</h1>
          <p className="text-muted-foreground">Registre sua jornada diária de forma simples.</p>
        </div>
        <div className="bg-primary/5 border border-primary/20 p-4 rounded-xl text-center min-w-[220px]">
          <div className="text-3xl font-bold font-mono text-primary">{format(currentTime, 'HH:mm:ss')}</div>
          <div className="text-xs text-muted-foreground uppercase tracking-widest mt-1">{format(currentTime, "EEEE, dd 'de' MMMM", { locale: ptBR })}</div>
        </div>
      </header>

      {entriesError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erro de Conexão</AlertTitle>
          <AlertDescription>
            Não foi possível carregar seus registros. Verifique sua conexão ou permissões.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Button 
          size="lg" 
          className="h-24 text-lg flex-col gap-2 shadow-sm"
          onClick={() => handleClockAction('entrada')}
          disabled={isSubmitting}
        >
          <LogIn className="h-6 w-6" /> Entrada
        </Button>
        <Button 
          size="lg" 
          variant="outline"
          className="h-24 text-lg flex-col gap-2 border-primary/20 hover:bg-primary/5"
          onClick={() => handleClockAction('saida_almoco')}
          disabled={isSubmitting}
        >
          <Coffee className="h-6 w-6" /> Almoço (S)
        </Button>
        <Button 
          size="lg" 
          variant="outline"
          className="h-24 text-lg flex-col gap-2 border-primary/20 hover:bg-primary/5"
          onClick={() => handleClockAction('volta_almoco')}
          disabled={isSubmitting}
        >
          <History className="h-6 w-6" /> Almoço (R)
        </Button>
        <Button 
          size="lg" 
          variant="destructive"
          className="h-24 text-lg flex-col gap-2 shadow-sm"
          onClick={() => handleClockAction('saida')}
          disabled={isSubmitting}
        >
          <LogOut className="h-6 w-6" /> Saída
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" /> Registros de Hoje
          </CardTitle>
          <CardDescription>Suas marcações realizadas em {format(new Date(), 'dd/MM/yyyy')}.</CardDescription>
        </CardHeader>
        <CardContent>
          {entriesLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : !entries || entries.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground italic border-2 border-dashed rounded-lg">
              Nenhuma marcação realizada hoje.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo de Marcação</TableHead>
                  <TableHead className="text-right">Horário</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium capitalize">
                      {entry.type.replace('_', ' ')}
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold">
                      {safeFormatTime(entry.timestamp)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function TimeCardPage() {
  return (
    <AppLayout>
      <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
        <TimeCardContent />
      </Suspense>
    </AppLayout>
  );
}
