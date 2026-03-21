'use client';

import { useState, useMemo } from 'react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths, 
  addWeeks, 
  subWeeks, 
  addDays, 
  subDays,
  startOfDay,
  endOfDay,
  getHours,
  setHours,
  setMinutes
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  MoreVertical,
  Filter,
  Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Appointment, AppointmentStatus, UserProfile } from '@/lib/types';
import { AddAppointmentDialog } from './add-appointment-dialog';
import { AppointmentDetailsDialog } from './appointment-details-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';

const STATUS_CONFIG: Record<AppointmentStatus, { label: string; color: string; border: string; bg: string }> = {
  scheduled: { label: 'Agendado', color: 'text-blue-700', border: 'border-blue-200', bg: 'bg-blue-50' },
  confirmed: { label: 'Confirmado', color: 'text-emerald-700', border: 'border-emerald-200', bg: 'bg-emerald-50' },
  arrived: { label: 'Chegou', color: 'text-cyan-700', border: 'border-cyan-200', bg: 'bg-cyan-50' },
  in_progress: { label: 'Em Atendimento', color: 'text-amber-700', border: 'border-amber-200', bg: 'bg-amber-50' },
  finished: { label: 'Finalizado', color: 'text-slate-700', border: 'border-slate-200', bg: 'bg-slate-50' },
  cancelled: { label: 'Cancelado', color: 'text-red-700', border: 'border-red-200', bg: 'bg-red-50' },
  no_show: { label: 'Faltou', color: 'text-purple-700', border: 'border-purple-200', bg: 'bg-purple-50' },
};

type ViewMode = 'month' | 'week' | 'day';

interface CalendarClientProps {
  appointments: Appointment[];
  userProfile: UserProfile | null | undefined;
}

export function CalendarClient({ appointments, userProfile }: CalendarClientProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Navegação
  const next = () => {
    if (viewMode === 'month') setCurrentDate(addMonths(currentDate, 1));
    else if (viewMode === 'week') setCurrentDate(addWeeks(currentDate, 1));
    else setCurrentDate(addDays(currentDate, 1));
  };

  const prev = () => {
    if (viewMode === 'month') setCurrentDate(subMonths(currentDate, 1));
    else if (viewMode === 'week') setCurrentDate(subWeeks(currentDate, 1));
    else setCurrentDate(subDays(currentDate, 1));
  };

  const goToToday = () => setCurrentDate(new Date());

  // Dias para exibição
  const days = useMemo(() => {
    if (viewMode === 'month') {
      const start = startOfWeek(startOfMonth(currentDate));
      const end = endOfWeek(endOfMonth(currentDate));
      return eachDayOfInterval({ start, end });
    }
    if (viewMode === 'week') {
      const start = startOfWeek(currentDate);
      const end = endOfWeek(currentDate);
      return eachDayOfInterval({ start, end });
    }
    return [currentDate];
  }, [currentDate, viewMode]);

  const hours = Array.from({ length: 15 }, (_, i) => i + 7); // 07:00 as 21:00

  const getAppointmentsForDay = (day: Date) => {
    return appointments.filter(app => isSameDay(app.startTime.toDate(), day));
  };

  const renderMonthView = () => {
    return (
      <div className="grid grid-cols-7 border rounded-lg overflow-hidden bg-background shadow-sm">
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
          <div key={d} className="bg-muted/50 p-2 text-center text-xs font-bold uppercase tracking-wider border-b">{d}</div>
        ))}
        {days.map((day, idx) => {
          const dayApps = getAppointmentsForDay(day);
          const isToday = isSameDay(day, new Date());
          const isCurrentMonth = isSameMonth(day, currentDate);

          return (
            <div 
              key={idx} 
              className={cn(
                "min-h-[120px] p-2 border-r border-b last:border-r-0 hover:bg-muted/10 transition-colors",
                !isCurrentMonth && "bg-muted/20 opacity-50"
              )}
            >
              <div className="flex justify-between items-center mb-1">
                <span className={cn(
                  "h-7 w-7 flex items-center justify-center rounded-full text-sm font-semibold",
                  isToday ? "bg-primary text-primary-foreground" : "text-foreground"
                )}>
                  {format(day, 'd')}
                </span>
                {dayApps.length > 0 && <Badge variant="outline" className="text-[10px] h-4 px-1">{dayApps.length}</Badge>}
              </div>
              <div className="space-y-1 overflow-y-auto max-h-[80px]">
                {dayApps.slice(0, 3).map(app => (
                  <div 
                    key={app.id} 
                    onClick={() => { setSelectedAppointment(app); setIsDetailsOpen(true); }}
                    className={cn(
                      "text-[10px] p-1 rounded border truncate cursor-pointer transition-transform hover:scale-[1.02]",
                      STATUS_CONFIG[app.status].bg,
                      STATUS_CONFIG[app.status].border,
                      STATUS_CONFIG[app.status].color
                    )}
                  >
                    <b>{format(app.startTime.toDate(), 'HH:mm')}</b> {app.patientName.split(' ')[0]}
                  </div>
                ))}
                {dayApps.length > 3 && (
                  <div className="text-[9px] text-center text-muted-foreground italic">
                    + {dayApps.length - 3} mais
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderTimeGrid = () => {
    return (
      <div className="flex flex-col border rounded-lg bg-background shadow-sm overflow-hidden h-[700px]">
        {/* Header da Grade */}
        <div className="flex border-b bg-muted/30">
          <div className="w-16 border-r flex items-center justify-center text-[10px] font-bold text-muted-foreground uppercase">H</div>
          {days.map((day, idx) => (
            <div key={idx} className={cn(
              "flex-1 p-3 text-center border-r last:border-r-0",
              isSameDay(day, new Date()) && "bg-primary/5"
            )}>
              <div className="text-xs font-medium uppercase text-muted-foreground">{format(day, 'eee', { locale: ptBR })}</div>
              <div className={cn(
                "text-lg font-bold inline-block h-8 w-8 leading-8 rounded-full",
                isSameDay(day, new Date()) && "bg-primary text-primary-foreground"
              )}>
                {format(day, 'd')}
              </div>
            </div>
          ))}
        </div>

        {/* Corpo da Grade */}
        <div className="flex-1 overflow-y-auto">
          <div className="flex relative">
            {/* Coluna de Horas */}
            <div className="w-16 bg-muted/10 shrink-0">
              {hours.map(h => (
                <div key={h} className="h-20 border-b border-r text-[10px] flex justify-center pt-2 text-muted-foreground font-mono">
                  {h.toString().padStart(2, '0')}:00
                </div>
              ))}
            </div>

            {/* Colunas de Dias */}
            {days.map((day, dayIdx) => {
              const dayApps = getAppointmentsForDay(day);
              return (
                <div key={dayIdx} className="flex-1 relative group">
                  {hours.map(h => (
                    <div key={h} className="h-20 border-b border-r last:border-r-0 group-hover:bg-muted/5 transition-colors" />
                  ))}
                  
                  {/* Agendamentos do dia */}
                  {dayApps.map(app => {
                    const start = app.startTime.toDate();
                    const end = app.endTime.toDate();
                    const startH = getHours(start);
                    const startM = start.getMinutes();
                    const durationM = (end.getTime() - start.getTime()) / 60000;
                    
                    // Cálculo de posição (80px por hora)
                    const top = ((startH - 7) * 80) + (startM * 80 / 60);
                    const height = (durationM * 80 / 60);

                    return (
                      <div 
                        key={app.id}
                        onClick={() => { setSelectedAppointment(app); setIsDetailsOpen(true); }}
                        style={{ top: `${top}px`, height: `${height}px` }}
                        className={cn(
                          "absolute left-1 right-1 rounded-md border-l-4 p-2 shadow-sm cursor-pointer z-10 overflow-hidden transition-all hover:ring-2 hover:ring-offset-1 hover:z-20",
                          STATUS_CONFIG[app.status].bg,
                          STATUS_CONFIG[app.status].border,
                          STATUS_CONFIG[app.status].color
                        )}
                      >
                        <div className="font-bold text-[11px] leading-tight mb-0.5 truncate">{app.patientName}</div>
                        <div className="flex items-center gap-1 text-[9px] opacity-80 mb-1">
                          <Clock className="h-2.5 w-2.5" />
                          {format(start, 'HH:mm')} - {format(end, 'HH:mm')}
                        </div>
                        <div className="text-[9px] font-medium uppercase tracking-tight truncate">
                          {app.serviceName}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      <AddAppointmentDialog open={isAddOpen} onOpenChange={setIsAddOpen} />
      {selectedAppointment && (
        <AppointmentDetailsDialog 
          open={isDetailsOpen} 
          onOpenChange={setIsDetailsOpen} 
          appointment={selectedAppointment} 
        />
      )}

      <header className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <h1 className="font-headline text-3xl font-bold tracking-tight text-primary">Agenda Interativa</h1>
          <p className="text-muted-foreground">Gerencie consultas, procedimentos e fluxos de atendimento.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <div className="flex items-center bg-muted/50 p-1 rounded-lg border">
            <Button 
              variant={viewMode === 'month' ? 'secondary' : 'ghost'} 
              size="sm" 
              className="h-8 text-xs" 
              onClick={() => setViewMode('month')}
            >Mês</Button>
            <Button 
              variant={viewMode === 'week' ? 'secondary' : 'ghost'} 
              size="sm" 
              className="h-8 text-xs" 
              onClick={() => setViewMode('week')}
            >Semana</Button>
            <Button 
              variant={viewMode === 'day' ? 'secondary' : 'ghost'} 
              size="sm" 
              className="h-8 text-xs" 
              onClick={() => setViewMode('day')}
            >Dia</Button>
          </div>

          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-9 w-9" onClick={prev}><ChevronLeft className="h-4 w-4" /></Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-9 min-w-[180px] font-bold">
                  <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                  {viewMode === 'month' ? format(currentDate, 'MMMM yyyy', { locale: ptBR }) : 
                   viewMode === 'week' ? `Semana ${format(startOfWeek(currentDate), 'dd/MM')} - ${format(endOfWeek(currentDate), 'dd/MM')}` :
                   format(currentDate, "dd 'de' MMMM", { locale: ptBR })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="center">
                <Calendar 
                  mode="single" 
                  selected={currentDate} 
                  onSelect={(d) => d && setCurrentDate(d)} 
                  initialFocus 
                  locale={ptBR} 
                />
              </PopoverContent>
            </Popover>
            <Button variant="outline" size="icon" className="h-9 w-9" onClick={next}><ChevronRight className="h-4 w-4" /></Button>
          </div>

          <Button variant="outline" size="sm" onClick={goToToday} className="h-9 font-bold px-4">Hoje</Button>
          
          <Button onClick={() => setIsAddOpen(true)} className="h-9 font-bold">
            <Plus className="mr-2 h-4 w-4" /> Novo Agendamento
          </Button>
        </div>
      </header>

      {/* Legenda rápida */}
      <div className="flex flex-wrap gap-4 px-1">
        {Object.entries(STATUS_CONFIG).map(([key, config]) => (
          <div key={key} className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-tight text-muted-foreground">
            <div className={cn("h-2.5 w-2.5 rounded-full", config.bg, "border", config.border)} />
            {config.label}
          </div>
        ))}
      </div>

      <div className="flex-1 min-h-0">
        {viewMode === 'month' ? renderMonthView() : renderTimeGrid()}
      </div>
    </div>
  );
}
