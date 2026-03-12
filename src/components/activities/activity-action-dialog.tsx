
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Loader2, Clock, Send, CheckCircle2, RotateCcw, MessageSquare, History } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { doc, Timestamp, arrayUnion, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { Activity, UserProfile, ActivityHistoryItem } from '@/lib/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ActivityActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'accept' | 'finish' | 'validate' | 'rework' | 'history' | null;
  activity: Activity;
  currentUser: UserProfile | null | undefined;
}

export function ActivityActionDialog({ open, onOpenChange, type, activity, currentUser }: ActivityActionDialogProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [updateText, setUpdateText] = useState('');

  useEffect(() => {
    if (open) {
      setDescription('');
      setUpdateText('');
      if (activity.deadline) {
        setDeadline(format(activity.deadline.toDate(), "yyyy-MM-dd'T'HH:mm"));
      } else {
        setDeadline('');
      }
    }
  }, [open, activity]);

  const handleAction = async () => {
    if (!firestore || !currentUser) return;
    setIsSubmitting(true);

    const activityRef = doc(firestore, 'activities', activity.id);
    const historyItem: ActivityHistoryItem = {
      timestamp: Timestamp.now(),
      userName: currentUser.displayName || 'Usuário',
      userId: currentUser.uid,
      content: '',
    };

    let updates: any = {
      updatedAt: serverTimestamp(),
    };

    try {
      switch (type) {
        case 'accept':
          if (!description || !deadline) {
            toast({ variant: 'destructive', title: 'Campos obrigatórios', description: 'Informe o plano de ação e o prazo.' });
            setIsSubmitting(false);
            return;
          }
          updates.status = 'in_progress';
          updates.assigneeId = currentUser.uid;
          updates.assigneeName = currentUser.displayName;
          updates.startDescription = description;
          updates.deadline = Timestamp.fromDate(new Date(deadline));
          historyItem.content = `Atividade assumida. Plano: ${description}`;
          break;

        case 'finish':
          if (!description) {
            toast({ variant: 'destructive', title: 'Obrigatório', description: 'Informe o que foi realizado.' });
            setIsSubmitting(false);
            return;
          }
          updates.status = 'waiting_validation';
          updates.completionDescription = description;
          historyItem.content = `Atividade finalizada e entregue para validação. Detalhes: ${description}`;
          break;

        case 'validate':
          updates.status = 'completed';
          historyItem.content = 'Atividade validada e concluída com sucesso.';
          break;

        case 'rework':
          if (!description) {
            toast({ variant: 'destructive', title: 'Obrigatório', description: 'Informe o motivo do retrabalho.' });
            setIsSubmitting(false);
            return;
          }
          updates.status = 'rework';
          updates.rejectionReason = description;
          historyItem.content = `Retrabalho solicitado. Motivo: ${description}`;
          break;
      }

      updates.history = arrayUnion(historyItem);
      updateDocumentNonBlocking(activityRef, updates);
      
      toast({ title: 'Atividade Atualizada' });
      onOpenChange(false);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Erro na atualização' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddUpdate = () => {
    if (!firestore || !currentUser || !updateText) return;
    setIsSubmitting(true);

    const historyItem: ActivityHistoryItem = {
      timestamp: Timestamp.now(),
      userName: currentUser.displayName || 'Usuário',
      userId: currentUser.uid,
      content: `Atualização: ${updateText}`,
    };

    updateDocumentNonBlocking(doc(firestore, 'activities', activity.id), {
      history: arrayUnion(historyItem),
      updatedAt: serverTimestamp()
    });

    setUpdateText('');
    setIsSubmitting(false);
    toast({ title: 'Histórico Atualizado' });
  };

  const config = {
    accept: { title: 'Assumir Atividade', desc: 'Informe como pretende realizar esta tarefa e o prazo previsto.', label: 'Plano de Ação', btn: 'Começar Agora', icon: Send },
    finish: { title: 'Entregar Atividade', desc: 'Descreva o que foi concluído para que o solicitante possa validar.', label: 'O que foi feito?', btn: 'Enviar para Validação', icon: CheckCircle2 },
    validate: { title: 'Validar Conclusão', desc: 'Confirma que a atividade foi realizada conforme o esperado?', label: '', btn: 'Dar OK Final', icon: CheckCircle2 },
    rework: { title: 'Solicitar Retrabalho', desc: 'Informe o que precisa ser ajustado ou refeito.', label: 'Motivo do Retrabalho', btn: 'Enviar para Ajuste', icon: RotateCcw },
    history: { title: 'Detalhes da Atividade', desc: '', label: '', btn: '', icon: History }
  };

  const current = type ? config[type] : null;
  if (!current) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={type === 'history' ? "sm:max-w-2xl" : "sm:max-w-md"}>
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary mb-2">
            <current.icon className="h-5 w-5" />
            <DialogTitle className="font-headline">{current.title}</DialogTitle>
          </div>
          {current.desc && <DialogDescription>{current.desc}</DialogDescription>}
        </DialogHeader>

        {type === 'history' ? (
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <Label className="text-muted-foreground uppercase text-[10px]">Título</Label>
                <p className="font-bold">{activity.title}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-muted-foreground uppercase text-[10px]">Solicitante</Label>
                <p className="font-medium">{activity.requesterName}</p>
              </div>
              <div className="col-span-2 space-y-1 border-t pt-2">
                <Label className="text-muted-foreground uppercase text-[10px]">Descrição Original</Label>
                <p className="bg-muted/30 p-2 rounded italic text-foreground/80">{activity.description}</p>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="flex items-center gap-2"><History className="h-4 w-4" /> Histórico e Evolução</Label>
              <ScrollArea className="h-[250px] rounded-md border p-4 bg-muted/5">
                <div className="space-y-4">
                  {activity.history?.sort((a,b) => b.timestamp.toMillis() - a.timestamp.toMillis()).map((item, idx) => (
                    <div key={idx} className="border-l-2 border-primary/20 pl-3 py-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-bold text-primary">{item.userName}</span>
                        <span className="text-[9px] text-muted-foreground">{format(item.timestamp.toDate(), 'dd/MM/yy HH:mm')}</span>
                      </div>
                      <p className="text-xs text-foreground/90 leading-relaxed">{item.content}</p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {(activity.status === 'in_progress' || activity.status === 'rework') && (
              <div className="flex gap-2">
                <Input 
                  placeholder="Adicionar atualização rápida..." 
                  value={updateText} 
                  onChange={(e) => setUpdateText(e.target.value)}
                  className="flex-1"
                />
                <Button size="sm" onClick={handleAddUpdate} disabled={!updateText || isSubmitting}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {type === 'accept' && (
              <div className="space-y-2">
                <Label>Prazo Previsto</Label>
                <Input 
                  type="datetime-local" 
                  value={deadline} 
                  onChange={(e) => setDeadline(e.target.value)} 
                />
              </div>
            )}
            
            {current.label && (
              <div className="space-y-2">
                <Label>{current.label}</Label>
                <Textarea 
                  placeholder="Escreva aqui..." 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>
            )}

            {type === 'validate' && (
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-lg text-emerald-800 text-sm">
                <p className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Tudo certo com esta entrega?</p>
                {activity.completionDescription && (
                  <p className="mt-2 text-xs italic opacity-80">" {activity.completionDescription} "</p>
                )}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Fechar</Button>
          {current.btn && (
            <Button onClick={handleAction} disabled={isSubmitting} className={type === 'rework' ? 'bg-red-600 hover:bg-red-700' : ''}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {current.btn}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
