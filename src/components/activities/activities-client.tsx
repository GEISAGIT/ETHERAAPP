'use client';

import { useState, useMemo } from 'react';
import type { Activity, ActivityStatus, UserProfile } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { PlusCircle, Search, Eye, EyeOff, LayoutGrid } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { AddActivityDialog } from './add-activity-dialog';
import { KanbanBoard } from './kanban-board';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface ActivitiesClientProps {
  activities: Activity[];
  userProfile: UserProfile | null | undefined;
}

export function ActivitiesClient({ activities, userProfile }: ActivitiesClientProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [showAllPrivate, setShowAllPrivate] = useState(true);

  const isAdmin = userProfile?.role === 'admin';

  const visibleActivities = useMemo(() => {
    return activities.filter(activity => {
      // Filtro de Busca
      const matchesSearch = 
        activity.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        activity.assigneeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        activity.requesterName?.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (!matchesSearch) return false;

      // Lógica de Privacidade
      if (!activity.isPrivate) return true; // Atividade pública

      // Se for privada:
      // 1. Administrador pode ver se a opção "Mostrar Tudo" estiver ativa
      if (isAdmin) return showAllPrivate;

      // 2. Usuário comum vê se for o emissor, o responsável ou visualizador convidado
      const isRequester = userProfile?.uid === activity.requesterId;
      const isAssignee = userProfile?.uid === activity.assigneeId;
      const isViewer = activity.viewerIds?.includes(userProfile?.uid || '');
      
      return isRequester || isAssignee || isViewer;
    });
  }, [activities, searchTerm, userProfile, isAdmin, showAllPrivate]);

  return (
    <div className="space-y-8 h-full flex flex-col">
      <AddActivityDialog open={isAddOpen} onOpenChange={setIsAddOpen} />

      <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="font-headline text-3xl font-bold tracking-tight text-primary">Gestão de Atividades</h1>
          <p className="text-muted-foreground">Solicite, execute e valide tarefas de forma ágil.</p>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <div className="flex items-center space-x-2 bg-muted/50 px-3 py-2 rounded-lg border border-primary/10">
              <Label htmlFor="show-all" className="text-xs font-bold uppercase flex items-center gap-2 cursor-pointer">
                {showAllPrivate ? <Eye className="h-3.5 w-3.5 text-primary" /> : <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />}
                <span className={cn(showAllPrivate ? "text-primary" : "text-muted-foreground")}>Ver Tudo (Admin)</span>
              </Label>
              <Switch
                id="show-all"
                checked={showAllPrivate}
                onCheckedChange={setShowAllPrivate}
              />
            </div>
          )}
          <Button onClick={() => setIsAddOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Nova Atividade
          </Button>
        </div>
      </header>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por título ou responsável..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-x-auto min-h-[600px]">
        <KanbanBoard activities={visibleActivities} currentUser={userProfile} />
      </div>
    </div>
  );
}
