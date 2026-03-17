
'use client';

import { useEffect } from 'react';
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
import { useFirestore, useUser, useCollection, updateDocumentNonBlocking, useMemoFirebase } from '@/firebase';
import { collection, serverTimestamp, query, orderBy, doc, arrayUnion, Timestamp } from 'firebase/firestore';
import type { UserManagement, Activity } from '@/lib/types';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';

const formSchema = z.object({
  title: z.string().min(3, 'O título deve ter pelo menos 3 caracteres.'),
  description: z.string().min(5, 'A descrição deve ter pelo menos 5 caracteres.'),
  priority: z.enum(['low', 'medium', 'high', 'urgent'] as const),
  isPrivate: z.boolean().default(false),
  viewerIds: z.array(z.string()).default([]),
});

type FormValues = z.infer<typeof formSchema>;

export function EditActivityDialog({ 
  open, 
  onOpenChange, 
  activity 
}: { 
  open: boolean, 
  onOpenChange: (open: boolean) => void, 
  activity: Activity 
}) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user: currentUser } = useUser();

  const usersQuery = useMemoFirebase(() => {
    if (!firestore || !open) return null;
    return query(collection(firestore, 'users'), orderBy('displayName', 'asc'));
  }, [firestore, open]);

  const { data: users } = useCollection<UserManagement>(usersQuery);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  const isPrivate = useWatch({ control: form.control, name: 'isPrivate' });

  useEffect(() => {
    if (open && activity) {
      form.reset({
        title: activity.title,
        description: activity.description,
        priority: activity.priority,
        isPrivate: activity.isPrivate || false,
        viewerIds: activity.viewerIds || [],
      });
    }
  }, [open, activity, form]);

  const onSubmit = async (values: FormValues) => {
    if (!currentUser || !firestore || !activity) return;

    try {
      const activityRef = doc(firestore, 'activities', activity.id);
      
      const updates = {
        title: values.title,
        description: values.description,
        priority: values.priority,
        isPrivate: values.isPrivate,
        viewerIds: values.isPrivate ? values.viewerIds : [],
        updatedAt: serverTimestamp(),
        history: arrayUnion({
          content: 'Dados básicos da atividade editados pelo autor.',
          timestamp: Timestamp.now(),
          userName: currentUser.displayName || 'Usuário',
          userId: currentUser.uid,
        })
      };

      updateDocumentNonBlocking(activityRef, updates);
      
      toast({ title: 'Atividade Atualizada' });
      onOpenChange(false);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro ao Atualizar' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-headline">Editar Atividade</DialogTitle>
          <DialogDescription>Altere as informações básicas da tarefa.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl><Textarea className="min-h-[100px]" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prioridade</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
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
                  Visualizadores Adicionais
                </Label>
                <ScrollArea className="h-[120px] pr-2">
                  <div className="space-y-2">
                    {users?.filter(u => u.uid !== activity.requesterId).map(u => (
                      <div key={u.uid} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`edit-viewer-${u.uid}`} 
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
                        <Label htmlFor={`edit-viewer-${u.uid}`} className="text-xs cursor-pointer">{u.displayName}</Label>
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
                Salvar Alterações
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
