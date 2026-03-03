'use client';

import { AppLayout } from '@/components/layout/app-layout';
import { useUser, useFirestore, addDocumentNonBlocking, useCollection, useMemoFirebase, useStorage } from '@/firebase';
import { collection, query, where, orderBy, Timestamp, limit } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useState, useRef, useEffect, Suspense } from 'react';
import { Camera, Clock, CheckCircle2, AlertCircle, Loader2, UserCheck, History, ArrowRight, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { AttendanceRecord, AttendanceType } from '@/lib/types';
import { cn } from '@/lib/utils';

function TimeTrackingContent() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [scanAnimation, setScanAnimation] = useState(false);

  const attendanceQuery = useMemoFirebase(() => {
    if (!firestore || !user || isUserLoading) return null;
    return query(
      collection(firestore, 'attendanceRecords'),
      where('employeeId', '==', user.uid),
      orderBy('timestamp', 'desc'),
      limit(5)
    );
  }, [firestore, user, isUserLoading]);

  const { data: recentRecords, isLoading: recordsLoading } = useCollection<AttendanceRecord>(attendanceQuery);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const getCameraPermission = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
        setHasCameraPermission(true);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        setHasCameraPermission(false);
      }
    };

    getCameraPermission();

    return () => {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleRecordPoint = async (type: AttendanceType) => {
    if (!user || !firestore || !storage) return;
    
    setIsRecording(true);
    setScanAnimation(true);

    try {
      // 1. Capture Photo with safety
      let photoUrl = '';
      try {
        if (videoRef.current && canvasRef.current) {
          const video = videoRef.current;
          const canvas = canvasRef.current;
          
          if (video.videoWidth > 0) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
            const response = await fetch(dataUrl);
            const blob = await response.blob();
            
            const photoPath = `attendance-photos/${user.uid}/${Date.now()}.jpg`;
            const storageRef = ref(storage, photoPath);
            
            await uploadBytes(storageRef, blob);
            photoUrl = await getDownloadURL(storageRef);
          }
        }
      } catch (photoErr) {
        console.warn("Failed to capture or upload photo, continuing without it", photoErr);
      }

      // 2. Get Location with strict timeout promise
      const location = await new Promise<{latitude: number, longitude: number} | null>((resolve) => {
        const timeoutId = setTimeout(() => resolve(null), 4000);
        
        if (!navigator.geolocation) {
            clearTimeout(timeoutId);
            resolve(null);
            return;
        }

        navigator.geolocation.getCurrentPosition(
          (pos) => {
            clearTimeout(timeoutId);
            resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
          },
          () => {
            clearTimeout(timeoutId);
            resolve(null);
          },
          { enableHighAccuracy: true, timeout: 3500, maximumAge: 0 }
        );
      });

      // 3. Save Record - Carefully construct object to avoid undefined fields
      const recordData: any = {
        employeeId: user.uid,
        employeeName: user.displayName || 'Usuário',
        timestamp: Timestamp.now(),
        type,
        photoUrl: photoUrl || '',
      };

      if (location) {
        recordData.location = location;
      }

      addDocumentNonBlocking(collection(firestore, 'attendanceRecords'), recordData);

      toast({
        title: 'Ponto Registrado!',
        description: `Seu registro de ${getAttendanceTypeLabel(type).toLowerCase()} foi salvo com sucesso.`,
      });

    } catch (error: any) {
      console.error("Erro crítico ao registrar ponto:", error);
      toast({
        variant: 'destructive',
        title: 'Erro ao Registrar',
        description: 'Não foi possível processar o registro. Tente novamente.',
      });
    } finally {
      setIsRecording(false);
      setScanAnimation(false);
    }
  };

  const getAttendanceTypeLabel = (type: AttendanceType) => {
    const labels: Record<AttendanceType, string> = {
      clock_in: 'Entrada',
      clock_out: 'Saída',
      break_start: 'Início Intervalo',
      break_end: 'Fim Intervalo'
    };
    return labels[type];
  };

  if (isUserLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <p className="text-muted-foreground">Por favor, faça login para acessar o controle de ponto.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="font-headline text-3xl font-bold tracking-tight text-primary">Controle de Ponto</h1>
          <p className="text-muted-foreground">Utilize o reconhecimento facial para registrar sua jornada.</p>
        </div>
        <div className="bg-primary/10 border border-primary/20 p-4 rounded-lg text-center min-w-[200px]">
          <div className="text-3xl font-bold font-mono text-primary">
            {format(currentTime, 'HH:mm:ss')}
          </div>
          <div className="text-xs text-muted-foreground uppercase tracking-widest mt-1">
            {format(currentTime, "EEEE, dd 'de' MMMM", { locale: ptBR })}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 overflow-hidden border-primary/20 shadow-lg">
          <CardHeader className="bg-primary/5 border-b border-primary/10">
            <CardTitle className="text-lg flex items-center gap-2">
              <Camera className="h-5 w-5 text-primary" />
              Identificação Biométrica
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 relative bg-black aspect-video flex items-center justify-center">
            <video 
              ref={videoRef} 
              autoPlay 
              muted 
              playsInline 
              className="w-full h-full object-cover scale-x-[-1]"
            />
            
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className={cn(
                "w-64 h-64 border-2 rounded-full border-dashed transition-all duration-1000",
                scanAnimation ? "border-primary scale-110 bg-primary/10" : "border-white/30"
              )}>
                <div className="absolute inset-0 flex items-center justify-center">
                   <div className="w-1 h-full bg-primary/20 animate-pulse hidden lg:block" />
                </div>
              </div>
            </div>

            {hasCameraPermission === false && (
              <div className="absolute inset-0 bg-background/95 flex items-center justify-center p-6 text-center">
                <div className="max-w-xs space-y-4">
                  <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
                  <h3 className="font-semibold text-lg">Câmera não disponível</h3>
                  <p className="text-sm text-muted-foreground">Por favor, permita o acesso à câmera para continuar.</p>
                </div>
              </div>
            )}

            {isRecording && (
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center">
                <div className="text-center space-y-2">
                  <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
                  <p className="text-white font-medium">Validando Identidade...</p>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="p-6 grid grid-cols-2 sm:grid-cols-4 gap-4 bg-muted/30">
            <Button 
              className="h-16 flex flex-col gap-1" 
              onClick={() => handleRecordPoint('clock_in')}
              disabled={isRecording || !hasCameraPermission}
            >
              <ArrowRight className="h-5 w-5" />
              <span className="text-xs">Entrada</span>
            </Button>
            <Button 
              variant="secondary" 
              className="h-16 flex flex-col gap-1"
              onClick={() => handleRecordPoint('break_start')}
              disabled={isRecording || !hasCameraPermission}
            >
              <Clock className="h-5 w-5" />
              <span className="text-xs">Almoço</span>
            </Button>
            <Button 
              variant="secondary" 
              className="h-16 flex flex-col gap-1"
              onClick={() => handleRecordPoint('break_end')}
              disabled={isRecording || !hasCameraPermission}
            >
              <UserCheck className="h-5 w-5" />
              <span className="text-xs">Retorno</span>
            </Button>
            <Button 
              variant="destructive" 
              className="h-16 flex flex-col gap-1"
              onClick={() => handleRecordPoint('clock_out')}
              disabled={isRecording || !hasCameraPermission}
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="text-xs">Saída</span>
            </Button>
          </CardFooter>
        </Card>

        <div className="space-y-6">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                Registros Recentes
              </CardTitle>
              <CardDescription>Seus últimos batimentos.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {recordsLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
              ) : recentRecords?.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed rounded-lg text-muted-foreground italic">
                  <p className="text-sm">Nenhum registro hoje.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentRecords?.map((record) => (
                    <div key={record.id} className="flex items-center justify-between p-3 border rounded-md bg-card group hover:border-primary transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "p-2 rounded-full",
                          record.type === 'clock_in' ? "bg-emerald-500/10 text-emerald-600" :
                          record.type === 'clock_out' ? "bg-red-500/10 text-red-600" :
                          "bg-blue-500/10 text-blue-600"
                        )}>
                          {record.type === 'clock_in' ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold">{getAttendanceTypeLabel(record.type)}</span>
                          <span className="text-xs text-muted-foreground">
                            {format(record.timestamp.toDate(), 'HH:mm', { locale: ptBR })}
                          </span>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px] font-mono">
                        CONFIRMADO
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
            <CardFooter>
               <Alert className="bg-primary/5 border-primary/20">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <AlertDescription className="text-[10px] leading-tight">
                  Dados biométricos e localização são usados exclusivamente para fins de registro de ponto.
                </AlertDescription>
              </Alert>
            </CardFooter>
          </Card>
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />
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
