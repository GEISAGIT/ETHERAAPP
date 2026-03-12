
'use client';

import { useState, useMemo } from 'react';
import type { Activity, ActivityStatus, UserProfile } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { PlusCircle, Search, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { AddActivityDialog } from './add-activity-dialog';
import { KanbanBoard } from './kanban-board';

interface ActivitiesClientProps {
  activities: Activity[];
  userProfile: UserProfile | null | undefined;
}

export function ActivitiesClient({ activities, userProfile }: ActivitiesClientProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);

  const filteredActivities = useMemo(() => {
    return activities.filter(activity => 
      activity.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.assigneeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.requesterName?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [activities, searchTerm]);

  return (
    <div className="space-y-8 h-full flex flex-col">
      <AddActivityDialog open={isAddOpen} onOpenChange={setIsAddOpen} />

      <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="font-headline text-3xl font-bold tracking-tight text-primary">Gestão de Atividades</h1>
          <p className="text-muted-foreground">Solicite, execute e valide tarefas de forma ágil.</p>
        </div>
        <Button onClick={() => setIsAddOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Nova Atividade
        </Button>
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
        <KanbanBoard activities={filteredActivities} currentUser={userProfile} />
      </div>
    </div>
  );
}
