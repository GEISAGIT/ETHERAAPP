
'use client';

import type { Activity, ActivityStatus, ActivityPriority, UserProfile } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Clock, MessageSquare, AlertTriangle, CheckCircle2, RotateCcw, User, Eye, Play, Check, X, Lock, MoreVertical, Edit, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { ActivityActionDialog } from './activity-action-dialog';
import { EditActivityDialog } from './edit-activity-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { useFirestore, deleteDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

const priorityConfig: Record<ActivityPriority, { label: string; color: string }> = {
  low: { label: 'Baixa', color: 'bg-slate-500/10 text-slate-600' },
  medium: { label: 'Média', color: 'bg-blue-500/10 text-blue-600' },
  high: { label: 'Alta', color: 'bg-amber-500/10 text-amber-600' },
  urgent: { label: 'Urgente', color: 'bg-red-500/10 text-red-600' }
};

export function ActivityCard({ activity, currentUser }: { activity: Activity, currentUser: UserProfile | null | undefined }) {
  const [actionType, setActionType] = useState<'accept' | 'finish' | 'validate' | 'rework' | 'history' | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  
  const { toast } = useToast();
  const firestore = useFirestore();

  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const isRequester = currentUser?.uid === activity.requesterId;
  const isAssignee = currentUser?.uid === activity.assigneeId;
  const isAdmin = currentUser?.role === 'admin';

  const handleDelete = () => {
    if (!firestore) return;
    const docRef = doc(firestore, 'activities', activity.id);
    deleteDocumentNonBlocking(docRef);
    toast({ title: 'Atividade Excluída' });
    setIsDeleteAlertOpen(false);
  };

  return (
    <>
      <ActivityActionDialog 
        open={actionType !== null} 
        onOpenChange={(open) => !open && setActionType(null)} 
        type={actionType} 
        activity={activity} 
        currentUser={currentUser} 
      />

      <EditActivityDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        activity={activity}
      />

      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Atividade?</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a remover permanentemente a atividade "{activity.title}". Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Confirmar Exclusão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card className={cn(
        "group hover:shadow-md transition-all border-l-4 overflow-hidden",
        activity.status === 'rework' ? "border-l-red-500" : 
        activity.priority === 'urgent' ? "border-l-red-500 shadow-sm" : 
        activity.priority === 'high' ? "border-l-amber-500" : "border-l-primary/30",
        activity.isPrivate && "bg-amber-50/30 dark:bg-amber-950/10"
      )}>
        <CardHeader className="p-4 pb-2 space-y-2">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={cn("text-[10px] uppercase font-bold px-1.5 py-0", priorityConfig[activity.priority].color)}>
                {priorityConfig[activity.priority].label}
              </Badge>
              {activity.isPrivate && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Lock className="h-3 w-3 text-amber-600" />
                    </TooltipTrigger>
                    <TooltipContent><p className="text-xs">Atividade Privada</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            
            <div className="flex items-center gap-1">
              {activity.status === 'rework' && (
                <Badge variant="destructive" className="text-[9px] h-4 animate-pulse">RETRABALHO</Badge>
              )}
              
              {(isAdmin || isRequester) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6 -mt-1 -mr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreVertical className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setIsEditOpen(true)}>
                      <Edit className="mr-2 h-3.5 w-3.5" /> Editar Atividade
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setIsDeleteAlertOpen(true)} className="text-destructive focus:text-destructive">
                      <Trash2 className="mr-2 h-3.5 w-3.5" /> Excluir Atividade
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
          <CardTitle className="text-sm font-bold leading-tight group-hover:text-primary transition-colors cursor-pointer" onClick={() => setActionType('history')}>
            {activity.title}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="p-4 pt-0 text-xs text-muted-foreground">
          <p className="line-clamp-2 mb-3">{activity.description}</p>
          
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Avatar className="h-5 w-5 border">
                        <AvatarFallback className="text-[8px]">{getInitials(activity.requesterName)}</AvatarFallback>
                      </Avatar>
                    </TooltipTrigger>
                    <TooltipContent><p className="text-xs">Solicitante: {activity.requesterName}</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <span className="text-[10px] font-medium">{activity.requesterName?.split(' ')[0] || 'Desconhecido'}</span>
              </div>
              
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-medium text-right">
                  {activity.assigneeName ? activity.assigneeName.split(' ')[0] : 'Em aberto'}
                </span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Avatar className={cn("h-5 w-5 border", !activity.assigneeId && "bg-muted")}>
                        {activity.assigneeId ? (
                          <AvatarFallback className="text-[8px]">{getInitials(activity.assigneeName)}</AvatarFallback>
                        ) : (
                          <AvatarFallback className="text-[8px]"><User className="h-3 w-3" /></AvatarFallback>
                        )}
                      </Avatar>
                    </TooltipTrigger>
                    <TooltipContent><p className="text-xs">Responsável: {activity.assigneeName || 'Não atribuído'}</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>

            {activity.deadline && (
              <div className={cn(
                "flex items-center gap-1 text-[10px] px-2 py-1 rounded bg-muted/50",
                activity.deadline.toDate() < new Date() && "text-red-600 bg-red-50"
              )}>
                <Clock className="h-3 w-3" />
                <span>Prazo: {format(activity.deadline.toDate(), 'dd/MM HH:mm')}</span>
              </div>
            )}
          </div>
        </CardContent>

        <CardFooter className="p-2 bg-muted/20 border-t flex justify-around">
          {activity.status === 'pending' && (
            <button className="flex items-center gap-1 text-[10px] font-bold text-primary hover:bg-primary/10 px-2 py-1 rounded transition-colors" onClick={() => setActionType('accept')}>
              <Play className="h-3 w-3" /> ASSUMIR
            </button>
          )}

          {(activity.status === 'in_progress' || activity.status === 'rework') && isAssignee && (
            <button className="flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:bg-blue-50 px-2 py-1 rounded transition-colors" onClick={() => setActionType('finish')}>
              <CheckCircle2 className="h-3 w-3" /> ENTREGAR
            </button>
          )}

          {activity.status === 'waiting_validation' && isRequester && (
            <>
              <button className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 hover:bg-emerald-50 px-2 py-1 rounded transition-colors" onClick={() => setActionType('validate')}>
                <Check className="h-3 w-3" /> VALIDAR
              </button>
              <button className="flex items-center gap-1 text-[10px] font-bold text-red-600 hover:bg-red-50 px-2 py-1 rounded transition-colors" onClick={() => setActionType('rework')}>
                <RotateCcw className="h-3 w-3" /> REFAZER
              </button>
            </>
          )}

          <button className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground hover:bg-muted px-2 py-1 rounded transition-colors" onClick={() => setActionType('history')}>
            <Eye className="h-3 w-3" /> VER
          </button>
        </CardFooter>
      </Card>
    </>
  );
}
