'use client';

import { useState, useMemo } from 'react';
import type { StockCategory, StockSubCategory, StockOption, UserProfile } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Search, MoreHorizontal, Edit, Trash2, Tag, FolderTree, Layers } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from '@/components/ui/table';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useFirestore, addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { AddCategoryDialog } from '@/components/settings/add-category-dialog';
import { EditCategoryDialog } from '@/components/settings/edit-category-dialog';
import { DeleteCategoryAlert } from '@/components/settings/delete-category-alert';

export function CategoriesClient({ data, userProfile }: { data: StockCategory[], userProfile: UserProfile | null | undefined }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogState, setDialogState] = useState<{
    mode: 'add' | 'edit' | 'delete' | null;
    type: 'group' | 'category' | 'option' | null;
    data: any;
  }>({ mode: null, type: null, data: {} });

  const firestore = useFirestore();
  const { toast } = useToast();

  const isAdmin = userProfile?.role === 'admin';
  const canCreate = !!(isAdmin || userProfile?.permissions?.stockCategories?.create);
  const canEdit = !!(isAdmin || userProfile?.permissions?.stockCategories?.edit);
  const canDelete = !!(isAdmin || userProfile?.permissions?.stockCategories?.delete);

  const openDialog = (mode: 'add' | 'edit' | 'delete', type: 'group' | 'category' | 'option', data: any = {}) => {
    setDialogState({ mode, type, data });
  };

  const closeDialog = () => {
    setDialogState({ mode: null, type: null, data: {} });
  };

  const filteredData = useMemo(() => {
    if (!searchTerm) return data;
    const lower = searchTerm.toLowerCase();
    return data.map(group => {
        const filteredSub = (group.subCategories || []).map(sub => {
            const filteredOpt = (sub.options || []).filter(opt => opt.name.toLowerCase().includes(lower));
            if (filteredOpt.length > 0 || sub.name.toLowerCase().includes(lower)) {
                return { ...sub, options: filteredOpt };
            }
            return null;
        }).filter(Boolean) as StockSubCategory[];

        if (filteredSub.length > 0 || group.name.toLowerCase().includes(lower)) {
            return { ...group, subCategories: filteredSub };
        }
        return null;
    }).filter(Boolean) as StockCategory[];
  }, [data, searchTerm]);

  const handleSave = (id: string, name: string) => {
    if (!firestore) return;
    const { type, data: d } = dialogState;
    const colRef = collection(firestore, 'stockCategories');

    try {
        if (type === 'group') {
            if (id === 'new') {
                addDocumentNonBlocking(colRef, { name, subCategories: [] });
                toast({ title: 'Categoria principal criada' });
            } else {
                updateDocumentNonBlocking(doc(colRef, id), { name });
                toast({ title: 'Categoria atualizada' });
            }
        } else if (type === 'category') {
            const group = data.find(g => g.id === d.groupId);
            if (!group) return;
            let newSub;
            if (id === 'new') {
                newSub = [...(group.subCategories || []), { id: Date.now().toString(), name, options: [] }];
            } else {
                newSub = (group.subCategories || []).map(s => s.id === id ? { ...s, name } : s);
            }
            updateDocumentNonBlocking(doc(colRef, d.groupId), { subCategories: newSub });
            toast({ title: id === 'new' ? 'Subcategoria criada' : 'Subcategoria atualizada' });
        } else if (type === 'option') {
            const group = data.find(g => g.id === d.groupId);
            const sub = group?.subCategories.find(s => s.id === d.subId);
            if (!group || !sub) return;
            let newOpt;
            if (id === 'new') {
                newOpt = [...(sub.options || []), { id: Date.now().toString(), name }];
            } else {
                newOpt = (sub.options || []).map(o => o.id === id ? { ...o, name } : o);
            }
            const newSub = group.subCategories.map(s => s.id === d.subId ? { ...s, options: newOpt } : s);
            updateDocumentNonBlocking(doc(colRef, d.groupId), { subCategories: newSub });
            toast({ title: id === 'new' ? 'Derivação criada' : 'Derivação atualizada' });
        }
    } catch (e) {
        toast({ variant: 'destructive', title: 'Erro ao salvar' });
    }
    closeDialog();
  };

  const handleDelete = () => {
    if (!firestore) return;
    const { type, data: d } = dialogState;
    const colRef = collection(firestore, 'stockCategories');

    try {
        if (type === 'group') {
            deleteDocumentNonBlocking(doc(colRef, d.id));
            toast({ title: 'Categoria removida' });
        } else if (type === 'category') {
            const group = data.find(g => g.id === d.groupId);
            if (group) {
                const newSub = (group.subCategories || []).filter(s => s.id !== d.id);
                updateDocumentNonBlocking(doc(colRef, d.groupId), { subCategories: newSub });
                toast({ title: 'Subcategoria removida' });
            }
        } else if (type === 'option') {
            const group = data.find(g => g.id === d.groupId);
            const sub = group?.subCategories.find(s => s.id === d.subId);
            if (group && sub) {
                const newOpt = (sub.options || []).filter(o => o.id !== d.id);
                const newSub = group.subCategories.map(s => s.id === d.subId ? { ...s, options: newOpt } : s);
                updateDocumentNonBlocking(doc(colRef, d.groupId), { subCategories: newSub });
                toast({ title: 'Derivação removida' });
            }
        }
    } catch (e) {
        toast({ variant: 'destructive', title: 'Erro ao excluir' });
    }
    closeDialog();
  };

  const titleMap = { group: 'Categoria', category: 'Subcategoria', option: 'Derivação' };

  return (
    <div className="space-y-8">
      <AddCategoryDialog 
        open={dialogState.mode === 'add'} 
        onOpenChange={closeDialog} 
        onAddCategory={(name) => handleSave('new', name)}
        categoryType={dialogState.type === 'group' ? 'group' : 'category'}
        title={`Nova ${titleMap[dialogState.type as keyof typeof titleMap]}`}
      />
      <EditCategoryDialog 
        open={dialogState.mode === 'edit'} 
        onOpenChange={closeDialog} 
        onEditCategory={handleSave}
        category={dialogState.data}
        title={`Editar ${titleMap[dialogState.type as keyof typeof titleMap]}`}
      />
      <DeleteCategoryAlert 
        open={dialogState.mode === 'delete'} 
        onOpenChange={closeDialog} 
        onConfirm={handleDelete} 
      />

      <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="font-headline text-3xl font-bold tracking-tight text-primary">Categorias de Suprimentos</h1>
          <p className="text-muted-foreground">Estruture categorias, subcategorias e derivações para o estoque.</p>
        </div>
        {canCreate && (
          <Button onClick={() => openDialog('add', 'group')}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Nova Categoria
          </Button>
        )}
      </header>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar em todos os níveis..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <Accordion type="multiple" className="w-full">
            {filteredData.map(group => (
              <AccordionItem value={group.id} key={group.id} className="border-b last:border-0">
                <div className="flex items-center group/item">
                  <AccordionTrigger className="text-lg font-bold hover:no-underline flex-1 py-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-md"><Tag className="h-4 w-4 text-primary" /></div>
                        {group.name}
                    </div>
                  </AccordionTrigger>
                  <div className="flex items-center gap-1 pr-4">
                    {canEdit && (
                        <Button variant="ghost" size="icon" onClick={() => openDialog('edit', 'group', group)}>
                            <Edit className="h-4 w-4" />
                        </Button>
                    )}
                    {canCreate && (
                        <Button variant="ghost" size="icon" onClick={() => openDialog('add', 'category', { groupId: group.id })}>
                            <PlusCircle className="h-4 w-4 text-primary" />
                        </Button>
                    )}
                    {canDelete && (
                        <Button variant="ghost" size="icon" onClick={() => openDialog('delete', 'group', group)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                    )}
                  </div>
                </div>
                <AccordionContent className="pb-4">
                  <div className="pl-10 space-y-4 pt-2">
                    {group.subCategories?.length > 0 ? (
                      <Accordion type="multiple" className="w-full space-y-2">
                        {group.subCategories.map(sub => (
                          <AccordionItem value={sub.id} key={sub.id} className="bg-muted/30 rounded-lg px-4 border-none">
                            <div className="flex items-center group/sub">
                              <AccordionTrigger className="text-sm font-semibold hover:no-underline flex-1 py-3">
                                <div className="flex items-center gap-2">
                                    <FolderTree className="h-3.5 w-3.5 text-muted-foreground" />
                                    {sub.name}
                                </div>
                              </AccordionTrigger>
                              <div className="flex items-center gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDialog('edit', 'category', { ...sub, groupId: group.id })}>
                                    <Edit className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDialog('add', 'option', { groupId: group.id, subId: sub.id })}>
                                    <PlusCircle className="h-3.5 w-3.5 text-primary" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDialog('delete', 'category', { ...sub, groupId: group.id })}>
                                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                </Button>
                              </div>
                            </div>
                            <AccordionContent>
                              <div className="pl-6 space-y-1 pb-2">
                                {sub.options?.map(opt => (
                                  <div key={opt.id} className="flex items-center justify-between py-1 group/opt hover:bg-white/50 rounded px-2 transition-colors">
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <Layers className="h-3 w-3" />
                                        {opt.name}
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover/opt:opacity-100 transition-opacity">
                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openDialog('edit', 'option', { ...opt, groupId: group.id, subId: sub.id })}>
                                            <Edit className="h-3 w-3" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => openDialog('delete', 'option', { ...opt, groupId: group.id, subId: sub.id })}>
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </div>
                                  </div>
                                ))}
                                {(!sub.options || sub.options.length === 0) && (
                                    <p className="text-[10px] text-muted-foreground italic pl-5">Nenhuma derivação/opção cadastrada.</p>
                                )}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    ) : (
                      <p className="text-xs text-muted-foreground italic py-2">Nenhuma subcategoria neste grupo.</p>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          {filteredData.length === 0 && (
            <div className="text-center py-12 text-muted-foreground italic border-2 border-dashed rounded-lg">
                Nenhuma categoria de suprimentos cadastrada ainda.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
