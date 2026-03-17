'use client';

import { useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Loader2, Lock, Users } from 'lucide-react';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useUser, useCollection, addDocumentNonBlocking, useMemoFirebase } from '@/firebase';
import { collection, serverTimestamp, query, orderBy, Timestamp } from 'firebase/firestore';
import type { UserManagement } from '@/lib/types';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';

const formSchema = z.object({
  title: z.string().min(3, 'O título deve ter pelo menos 3 caracteres.'),
  description: z.string().min(5, 'A descrição deve ter pelo menos 5 caracteres.'),
  priority: z.enum(['low', 'medium', 'high', 'urgent'] as const),
  assigneeId: z.string().optional(),
  isPrivate: z.boolean().default(false),
  viewerIds: z.array(z.string()).default([]),
});

type FormValues = z.infer<typeof formSchema>;

export function AddActivityDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user: currentUser } = useUser();

  // Buscar usuários apenas se o diálogo estiver aberto
  const usersQuery = useMemoFirebase(() => {
    if (!firestore || !open) return null;
    return query(collection(firestore, 'users'), orderBy('displayName', 'asc'));
  }, [firestore, open]);

  const { data: users } = useCollection<UserManagement>(usersQuery);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      priority: 'medium',
      assigneeId: '',
      isPrivate: false,
      viewerIds: [],
    },
  });

  const isPrivate = useWatch({ control: form.control, name: 'isPrivate' });

  useEffect(() => {
    if (!open) form.reset();
  }, [open, form]);

  const onSubmit = async (values: FormValues) => {
    if (!currentUser || !firestore) return;

    try {
      const selectedAssignee = users?.find(u => u.uid === values.assigneeId);
      
      const activityData = {
        title: values.title,
        description: values.description,
        priority: values.priority,
        isPrivate: values.isPrivate,
        viewerIds: values.isPrivate ? values.viewerIds : [],
        status: 'pending',
        requesterId: currentUser.uid,
        requesterName: currentUser.displayName || 'Usuário',
        assigneeId: values.assigneeId && values.assigneeId !== 'none' ? values.assigneeId : null,
        assigneeName: values.assigneeId && values.assigneeId !== 'none' ? (selectedAssignee?.displayName || 'Responsável') : null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        history: [{
          content: 'Atividade solicitada.',
          timestamp: Timestamp.now(),
          userName: currentUser.displayName || 'Usuário',
          userId: currentUser.uid,
        }]
      };

      addDocumentNonBlocking(collection(firestore, 'activities'), activityData);
      
      toast({ title: 'Atividade Criada', description: `A atividade "${values.title}" foi solicitada com sucesso.` });
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Erro ao Criar', description: 'Não foi possível criar a atividade.' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-headline">Nova Atividade</DialogTitle>
          <DialogDescription>Solicite uma tarefa para você ou para outro membro da equipe.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título da Atividade</FormLabel>
                  <FormControl><Input placeholder="O que precisa ser feito?" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição Detalhada</FormLabel>
                  <FormControl><Textarea placeholder="Explique os detalhes da tarefa..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prioridade</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="low">Baixa</SelectItem>
                        <SelectItem value="medium">Média</SelectItem>
                        <SelectItem value="high">Alta</SelectItem>
                        <SelectItem value="urgent">Urgente</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="assigneeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Responsável (Opcional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="none">Aguardando executor</SelectItem>
                        {users?.map(u => (
                          <SelectItem key={u.uid} value={u.uid}>{u.displayName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="isPrivate"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-muted/30">
                  <FormLabel className="flex items-center gap-2 cursor-pointer">
                    <Lock className="h-3 w-3 text-amber-600" />
                    Privado
                  </FormLabel>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {isPrivate && (
              <div className="space-y-3 rounded-lg border p-3 bg-muted/10 animate-in fade-in slide-in-from-top-1">
                <Label className="text-xs font-bold uppercase flex items-center gap-2 text-muted-foreground">
                  <Users className="h-3 w-3" />
                  Visualizadores Adicionais (Opcional)
                </Label>
                <ScrollArea className="h-[120px] pr-2">
                  <div className="space-y-2">
                    {users?.filter(u => u.uid !== currentUser?.uid).map(u => (
                      <div key={u.uid} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`viewer-${u.uid}`} 
                          checked={form.getValues('viewerIds').includes(u.uid)}
                          onCheckedChange={(checked) => {
                            const current = form.getValues('viewerIds');
                            if (checked) {
                              form.setValue('viewerIds', [...current, u.uid]);
                            } else {
                              form.setValue('viewerIds', current.filter(id => id !== u.uid));
                            }
                          }}
                        />
                        <Label htmlFor={`viewer-${u.uid}`} className="text-xs cursor-pointer">{u.displayName}</Label>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            <DialogFooter className="pt-4">
              <DialogClose asChild><Button type="button" variant="ghost">Cancelar</Button></DialogClose>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Criar Atividade
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
