'use client';

import React, { useState, useMemo } from 'react';
import type { StockItem, UserProfile } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
    PlusCircle, 
    Search, 
    MoreHorizontal, 
    Trash2, 
    Package, 
    AlertTriangle, 
    ArrowUpCircle, 
    ArrowDownCircle,
    Box,
    Calendar,
    XCircle,
    CheckCircle2,
    Hash,
    Truck,
    Barcode,
    ListFilter,
    Info,
    Edit2,
    TrendingDown,
    Clock
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AddStockItemDialog } from './add-stock-item-dialog';
import { StockEntryDialog } from './stock-entry-dialog';
import { StockOutDialog } from './stock-out-dialog';
import { useFirestore, deleteDocumentNonBlocking, useMemoFirebase, useCollection } from '@/firebase';
import { doc, Timestamp, collection, query, orderBy, limit } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { format, isBefore, addDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface StockClientProps {
    stockData: StockItem[];
    catalogData: any[];
    userProfile: UserProfile | null | undefined;
}

export function StockClient({ stockData, catalogData, userProfile }: StockClientProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEntryOpen, setIsEntryOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isOutOpen, setIsOutOpen] = useState(false);
  const [selectedLotForAction, setSelectedLotForAction] = useState<StockItem | null>(null);
  const [selectedLotForEdit, setSelectedLotForEdit] = useState<StockItem | null>(null);

  const firestore = useFirestore();
  const { toast } = useToast();

  const isAdmin = userProfile?.role === 'admin';
  const canCreate = !!(isAdmin || userProfile?.permissions?.suppliesStock?.create);
  const canDelete = !!(isAdmin || userProfile?.permissions?.suppliesStock?.delete);

  const historyQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'stockHistory'), orderBy('timestamp', 'desc'), limit(100));
  }, [firestore]);

  const { data: historyData } = useCollection<any>(historyQuery);

  const filteredStock = useMemo(() => {
    return stockData.filter(item => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.code && item.code.includes(searchTerm)) ||
        (item.batch && item.batch.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [stockData, searchTerm]);

  const groupedStock = useMemo(() => {
    const groups: Record<string, { total: number, unit: string, name: string, code: string, minQuantity: number, items: StockItem[] }> = {};
    filteredStock.forEach(item => {
      const key = item.code;
      if (!groups[key]) {
        groups[key] = {
           total: 0,
           unit: item.unit,
           name: item.name,
           code: item.code,
           minQuantity: item.minQuantity,
           items: []
        };
      }
      groups[key].items.push(item);
      groups[key].total += item.quantity;
    });
    return Object.values(groups).sort((a,b) => a.name.localeCompare(b.name));
  }, [filteredStock]);

  const dashboardMetrics = useMemo(() => {
    let lowStock = 0;
    let expiringSoon = 0;
    let expired = 0;

    groupedStock.forEach(group => {
      if (group.total <= group.minQuantity) {
        lowStock++;
      }
    });

    const now = new Date();
    const soon = addDays(now, 30);
    stockData.forEach(item => {
      if (item.expiryDate) {
        const date = item.expiryDate.toDate();
        if (isBefore(date, now)) {
          expired++;
        } else if (isBefore(date, soon)) {
          expiringSoon++;
        }
      }
    });

    return { lowStock, expiringSoon, expired };
  }, [groupedStock, stockData]);

  const filteredCatalog = useMemo(() => {
    return catalogData.filter(item => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.code && item.code.includes(searchTerm))
    );
  }, [catalogData, searchTerm]);

  const handleDeleteLot = (id: string) => {
    if (!firestore) return;
    if (confirm(`Deseja remover este lote do estoque?`)) {
        deleteDocumentNonBlocking(doc(firestore, 'stock', id));
        toast({ title: 'Lote Removido' });
    }
  };

  const getExpiryBadge = (expiryDate?: Timestamp) => {
    if (!expiryDate) return null;
    const date = expiryDate.toDate();
    const now = new Date();
    const soon = addDays(now, 30);
    if (isBefore(date, now)) return <Badge variant="destructive" className="gap-1 px-1.5 py-0 text-[10px]"><XCircle className="h-3 w-3" /> Vencido</Badge>;
    if (isBefore(date, soon)) return <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-200 gap-1 px-1.5 py-0 text-[10px]"><AlertTriangle className="h-3 w-3" /> Vence em breve</Badge>;
    return <Badge variant="secondary" className="text-emerald-600 bg-emerald-500/10 border-emerald-500/20 gap-1 px-1.5 py-0 text-[10px]"><CheckCircle2 className="h-3 w-3" /> Ok</Badge>;
  };

  return (
    <TooltipProvider>
      <div className="space-y-8">
        <AddStockItemDialog open={isAddOpen} onOpenChange={setIsAddOpen} />
        <StockEntryDialog open={isEntryOpen} onOpenChange={setIsEntryOpen} items={catalogData} />
        <StockEntryDialog open={isEditOpen} onOpenChange={setIsEditOpen} items={catalogData} initialData={selectedLotForEdit} />
        <StockOutDialog open={isOutOpen} onOpenChange={setIsOutOpen} initialItem={selectedLotForAction} />

        <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="font-headline text-3xl font-bold tracking-tight text-primary">Suprimentos</h1>
            <p className="text-muted-foreground">Gestão de catálogo e controle físico por lote e fornecedor.</p>
          </div>
          <div className="flex items-center gap-2">
            {canCreate && (
              <>
                <Button variant="outline" className="text-emerald-600 border-emerald-200 hover:bg-emerald-50" onClick={() => setIsEntryOpen(true)}>
                  <ArrowUpCircle className="mr-2 h-4 w-4" />
                  Entrada de Estoque
                </Button>
                <Button onClick={() => setIsAddOpen(true)}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Cadastrar Novo Item (SKU)
                </Button>
              </>
            )}
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2 mt-2">
          <Card className="bg-amber-500/5 border-amber-500/20 shadow-sm backdrop-blur-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-amber-900/80 uppercase tracking-widest mb-1">Baixo Estoque</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-amber-700 drop-shadow-sm">{dashboardMetrics.lowStock}</span>
                  <span className="text-[10px] font-bold uppercase text-amber-700/60">skus</span>
                </div>
              </div>
              <div className="h-10 w-10 bg-amber-500/20 rounded-full flex items-center justify-center ring-2 ring-amber-500/10 shadow-inner">
                <TrendingDown className="h-5 w-5 text-amber-700" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-yellow-500/5 border-yellow-500/20 shadow-sm backdrop-blur-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-yellow-900/80 uppercase tracking-widest mb-1">Vencendo em 30 Dias</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-yellow-700 drop-shadow-sm">{dashboardMetrics.expiringSoon}</span>
                  <span className="text-[10px] font-bold uppercase text-yellow-700/60">lotes</span>
                </div>
              </div>
              <div className="h-10 w-10 bg-yellow-500/20 rounded-full flex items-center justify-center ring-2 ring-yellow-500/10 shadow-inner">
                <Clock className="h-5 w-5 text-yellow-700" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-destructive/5 border-destructive/20 shadow-sm backdrop-blur-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-destructive/80 uppercase tracking-widest mb-1">Itens Vencidos</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-destructive drop-shadow-sm">{dashboardMetrics.expired}</span>
                  <span className="text-[10px] font-bold uppercase text-destructive/60">lotes</span>
                </div>
              </div>
              <div className="h-10 w-10 bg-destructive/10 rounded-full flex items-center justify-center ring-2 ring-destructive/10 shadow-inner">
                <XCircle className="h-5 w-5 text-destructive" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="inventory" className="w-full">
          <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 max-w-2xl mb-6 h-auto">
            <TabsTrigger value="inventory" className="gap-2 py-2"><Package className="h-4 w-4" /> Estoque Físico</TabsTrigger>
            <TabsTrigger value="catalog" className="gap-2 py-2"><ListFilter className="h-4 w-4" /> Itens Cadastrados</TabsTrigger>
            <TabsTrigger value="history" className="gap-2 py-2"><Calendar className="h-4 w-4" /> Histórico de Alterações</TabsTrigger>
          </TabsList>

          <div className="mb-6 relative max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por SKU, item ou lote..." className="pl-8" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>

          <TabsContent value="inventory">
            <Card>
              <CardHeader className="pb-4">
                  <CardTitle className="text-lg">Inventário de Lotes</CardTitle>
                  <CardDescription>Produtos disponíveis para uso imediato, separados por remessa.</CardDescription>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>Produto</TableHead>
                      <TableHead>Lote / Fornecedor</TableHead>
                      <TableHead>Localização</TableHead>
                      <TableHead className="text-center">Saldo</TableHead>
                      <TableHead>Validade</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groupedStock.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground italic">Nenhum lote físico em estoque.</TableCell></TableRow>
                    ) : (
                      groupedStock.map((group) => (
                        <React.Fragment key={group.code + group.name}>
                          <TableRow className="bg-muted/40 hover:bg-muted/40 border-t-2 border-primary/20">
                            <TableCell colSpan={4} className="py-3 pl-4">
                              <div className="flex items-center gap-3">
                                <Package className="h-5 w-5 text-emerald-600" />
                                <div className="flex flex-col">
                                  <span className="font-black text-base text-primary uppercase tracking-tight">{group.name}</span>
                                  <Badge variant="outline" className="w-fit font-mono text-[10px] h-4 px-1">{group.code}</Badge>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="py-3 text-center border-l shadow-sm bg-background/50 rounded-md">
                              <div className="flex flex-col items-center">
                                <span className="text-[9px] uppercase text-muted-foreground font-bold tracking-widest leading-tight">Total Somado</span>
                                <span className={cn("font-black text-xl tracking-tight shadow-sm drop-shadow-sm", group.total <= group.minQuantity ? "text-amber-500" : "text-emerald-500")}>
                                  {group.total} <span className="text-[10px] uppercase">{group.unit}</span>
                                </span>
                              </div>
                            </TableCell>
                            <TableCell colSpan={2} className="py-3 align-middle text-right pr-4 text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                              {group.items.length} Lote(s) Cadastrados
                            </TableCell>
                          </TableRow>
                          {group.items.map((item) => (
                            <TableRow key={item.id} className="opacity-90">
                          <TableCell><span className="font-mono font-bold text-xs">{item.code}</span></TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-bold">{item.name}</span>
                              <span className="text-[10px] uppercase text-muted-foreground">{item.category}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col text-xs">
                              <span className="font-mono font-bold"><Hash className="h-3 w-3 inline mr-1" />{item.batch}</span>
                              <span className="text-muted-foreground italic"><Truck className="h-3 w-3 inline mr-1" />{item.supplier}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-sm text-primary font-medium">
                              <Box className="h-3.5 w-3.5" /> {item.locationName}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex flex-col items-center gap-1">
                              <span className={cn("font-bold text-lg", item.quantity <= item.minQuantity ? "text-amber-600" : "text-primary")}>
                                {item.quantity} <span className="text-[10px] uppercase text-muted-foreground">{item.unit}</span>
                              </span>
                              {(item.vialVolume || item.doseVolume) ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge variant="outline" className="h-4 px-1 text-[8px] gap-1 cursor-help">
                                      <Info className="h-2 w-2" /> Info Técnica
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <div className="text-[10px] space-y-1">
                                      {item.vialVolume ? <p>Dose: <b>{item.vialVolume} mg/ml</b></p> : null}
                                      {item.doseVolume ? <p>Volume Frasco: <b>{item.doseVolume} ml</b></p> : null}
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <span className="text-xs font-medium">{item.expiryDate ? format(item.expiryDate.toDate(), 'dd/MM/yy') : '---'}</span>
                              {getExpiryBadge(item.expiryDate)}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              {canCreate && (
                                <Button variant="ghost" size="sm" className="h-8 hover:bg-muted" onClick={() => { setSelectedLotForEdit(item); setIsEditOpen(true); }}>
                                    <Edit2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              <Button variant="outline" size="sm" className="text-red-600 h-8" onClick={() => { setSelectedLotForAction(item); setIsOutOpen(true); }}>
                                  <ArrowDownCircle className="mr-1.5 h-3.5 w-3.5" /> Saída
                              </Button>
                              {canDelete && (
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteLot(item.id)}>
                                      <Trash2 className="h-4 w-4" />
                                  </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                          ))}
                        </React.Fragment>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="catalog">
            <Card>
              <CardHeader className="pb-4">
                  <CardTitle className="text-lg">Catálogo de Produtos (SKUs)</CardTitle>
                  <CardDescription>Definições de produtos cadastrados no sistema.</CardDescription>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>Nome do Item</TableHead>
                      <TableHead>Categoria / Sub</TableHead>
                      <TableHead>Unidade</TableHead>
                      <TableHead>Estoque Mínimo</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCatalog.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground italic">Nenhum item cadastrado no catálogo.</TableCell></TableRow>
                    ) : (
                      filteredCatalog.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell><span className="font-mono font-bold text-xs bg-muted px-2 py-1 rounded">{item.code}</span></TableCell>
                          <TableCell className="font-bold">{item.name}</TableCell>
                          <TableCell>
                            <div className="flex flex-col text-xs">
                              <span className="uppercase">{item.category}</span>
                              <span className="text-muted-foreground">{item.subCategory}</span>
                            </div>
                          </TableCell>
                          <TableCell className="uppercase text-xs font-bold">{item.unit}</TableCell>
                          <TableCell className="text-center font-bold text-amber-600">{item.minQuantity}</TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem disabled><Barcode className="mr-2 h-4 w-4" /> Editar SKU</DropdownMenuItem>
                                <DropdownMenuItem className="text-red-600" onClick={() => { if(confirm('Excluir do catálogo?')) deleteDocumentNonBlocking(doc(firestore!, 'itemCatalog', item.id)) }}><Trash2 className="mr-2 h-4 w-4" /> Remover</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader className="pb-4">
                  <CardTitle className="text-lg">Auditoria e Histórico de Alterações</CardTitle>
                  <CardDescription>Registro auditável contendo todas as justificativas para edições de lotes físicos.</CardDescription>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data / Hora</TableHead>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Ação</TableHead>
                      <TableHead>Lote & SKU</TableHead>
                      <TableHead className="w-1/3">Justificativa</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!historyData || historyData.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground italic">Nenhum registro de alteração no estoque encontado na trilha de auditoria.</TableCell></TableRow>
                    ) : (
                      historyData.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="whitespace-nowrap font-medium text-xs">
                            {log.timestamp ? format(log.timestamp.toDate(), 'dd/MM/yy HH:mm') : '---'}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-bold text-sm tracking-tight">{log.user}</span>
                              <span className="text-[10px] text-muted-foreground">{log.userEmail}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200">
                              <Edit2 className="mr-1 h-3 w-3" /> Edição
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-0.5">
                              <span className="font-bold text-xs leading-tight">{log.name}</span>
                              <div className="flex gap-2">
                                <span className="text-[10px] uppercase text-muted-foreground">Lote: <strong className="font-mono text-primary">{log.batch}</strong></span>
                                <span className="text-[10px] uppercase text-muted-foreground">SKU: <strong className="font-mono text-primary">{log.code}</strong></span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                             <div className="p-2 bg-amber-50 border border-amber-100/50 rounded-md">
                               <p className="max-w-md italic text-amber-900 text-xs leading-relaxed">
                                 &quot;{log.justification}&quot;
                               </p>
                             </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}
