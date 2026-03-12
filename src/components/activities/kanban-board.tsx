
'use client';

import type { Activity, ActivityStatus, UserProfile } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ActivityCard } from './activity-card';
import { Badge } from '@/components/ui/badge';
import { useMemo } from 'react';

const COLUMNS: { label: string; status: ActivityStatus; color: string }[] = [
  { label: 'Pendente', status: 'pending', color: 'bg-muted/50 border-muted' },
  { label: 'Em Andamento', status: 'in_progress', color: 'bg-blue-500/5 border-blue-500/20' },
  { label: 'Para Validação', status: 'waiting_validation', color: 'bg-amber-500/5 border-amber-500/20' },
  { label: 'Concluído', status: 'completed', color: 'bg-emerald-500/5 border-emerald-500/20' },
];

export function KanbanBoard({ activities, currentUser }: { activities: Activity[], currentUser: UserProfile | null | undefined }) {
  
  // Incluímos 'rework' na coluna 'Em Andamento' visualmente, mas com indicação de que é retrabalho
  const getActivitiesByStatus = (status: ActivityStatus) => {
    if (status === 'in_progress') {
      return activities.filter(a => a.status === 'in_progress' || a.status === 'rework');
    }
    return activities.filter(a => a.status === status);
  };

  return (
    <div className="flex gap-6 min-w-max pb-4 h-full">
      {COLUMNS.map((col) => {
        const colActivities = getActivitiesByStatus(col.status);
        
        return (
          <div key={col.status} className="flex flex-col w-[320px] shrink-0 h-full">
            <div className="flex items-center justify-between mb-4 px-2">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm uppercase tracking-wider">{col.label}</h3>
                <Badge variant="secondary" className="h-5 min-w-[20px] justify-center px-1">
                  {colActivities.length}
                </Badge>
              </div>
            </div>
            
            <div className={`flex-1 rounded-xl border-2 border-dashed p-3 space-y-4 overflow-y-auto ${col.color} min-h-[500px]`}>
              {colActivities.length === 0 ? (
                <div className="h-32 flex items-center justify-center text-muted-foreground/40 italic text-xs text-center px-4">
                  Nenhuma atividade nesta etapa.
                </div>
              ) : (
                colActivities.map((activity) => (
                  <ActivityCard 
                    key={activity.id} 
                    activity={activity} 
                    currentUser={currentUser} 
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
