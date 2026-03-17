'use client';

import { useState, useMemo } from 'react';
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
    Info
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
import { useFirestore, deleteDocumentNonBlocking } from '@/firebase';
import { doc, Timestamp } from 'firebase/firestore';
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
  const [isOutOpen, setIsOutOpen] = useState(false);
  const [selectedLotForAction, setSelectedLotForAction] = useState<StockItem | null>(null);

  const firestore = useFirestore();
  const { toast } = useToast();

  const isAdmin = userProfile?.role === 'admin';
  const canCreate = !!(isAdmin || userProfile?.permissions?.suppliesStock?.create);
  const canDelete = !!(isAdmin || userProfile?.permissions?.suppliesStock?.delete);

  const filteredStock = useMemo(() => {
    return stockData.filter(item => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.code && item.code.includes(searchTerm)) ||
        (item.batch && item.batch.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [stockData, searchTerm]);

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

        <Tabs defaultValue="inventory" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md mb-6">
            <TabsTrigger value="inventory" className="gap-2"><Package className="h-4 w-4" /> Estoque Físico</TabsTrigger>
            <TabsTrigger value="catalog" className="gap-2"><ListFilter className="h-4 w-4" /> Itens Cadastrados</TabsTrigger>
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
                    {filteredStock.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground italic">Nenhum lote físico em estoque.</TableCell></TableRow>
                    ) : (
                      filteredStock.map((item) => (
                        <TableRow key={item.id}>
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
                                      {item.vialVolume ? <p>Volume Frasco: <b>{item.vialVolume} ml/mg</b></p> : null}
                                      {item.doseVolume ? <p>Volume Dose: <b>{item.doseVolume} ml/mg</b></p> : null}
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
        </Tabs>
      </div>
    </TooltipProvider>
  );
}
