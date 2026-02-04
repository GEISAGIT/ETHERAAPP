'use client';
import { AppLayout } from '@/components/layout/app-layout';
import { CoraAuthForm } from '@/components/cora/cora-auth-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useSearchParams } from 'next/navigation';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle, AlertTriangle, Loader2, CalendarIcon, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { Suspense, useState } from 'react';
import { useUser, useDoc, useMemoFirebase, useFirestore, setDocumentNonBlocking } from '@/firebase';
import type { CoraToken, CoraAccountData, CoraStatement, CoraStatementEntry } from '@/lib/types';
import { doc, Timestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { getAccountBalance, getAccountData, getBankStatement, refreshCoraToken } from './actions';
import { useToast } from '@/hooks/use-toast';
import type { DateRange } from 'react-day-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';


const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const formatCurrencyFromCents = (valueInCents: number) => {
    return formatCurrency(valueInCents / 100);
}

function CoraAccountDetails({ token }: { token: CoraToken }) {
    const [balance, setBalance] = useState<number | null>(null);
    const [isBalanceLoading, setIsBalanceLoading] = useState(false);
    const [accountData, setAccountData] = useState<CoraAccountData | null>(null);
    const [isAccountDataLoading, setIsAccountDataLoading] = useState(false);
    const [statement, setStatement] = useState<CoraStatement | null>(null);
    const [isStatementLoading, setIsStatementLoading] = useState(false);
    const [dateRange, setDateRange] = useState<DateRange | undefined>();

    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();

    // The retryAction is a function that will be called with the new access token
    const handleRefreshToken = async (retryAction: (newAccessToken: string) => Promise<void>) => {
        if (!user || !firestore) return;
        
        toast({
            title: 'Sessão expirada',
            description: 'Seu token de acesso expirou. Tentando renovar...',
        });
        
        const result = await refreshCoraToken(token.refreshToken);

        if (result.error) {
             toast({ variant: 'destructive', title: 'Falha ao atualizar token', description: result.error });
             setIsBalanceLoading(false);
             setIsAccountDataLoading(false);
             setIsStatementLoading(false);
        } else if (result.data) {
            const newTokenData = result.data;
            const newExpiresAt = Timestamp.fromMillis(Date.now() + newTokenData.expires_in * 1000);
            
            const newToken: Partial<CoraToken> = {
                accessToken: newTokenData.access_token,
                expiresAt: newExpiresAt
            };
            
            const tokenDocRef = doc(firestore, 'users', user.uid, 'coraTokens', 'cora-token');
            setDocumentNonBlocking(tokenDocRef, newToken, { merge: true });

            toast({ title: 'Token atualizado!', description: 'Tentando a ação novamente.' });
            
            // Retry the original function with the new token.
            await retryAction(newTokenData.access_token);
        }
    }

    const handleGetBalance = async (accessToken: string) => {
        setIsBalanceLoading(true);
        const result = await getAccountBalance(accessToken);
        
        if (result.error) {
            if (result.isTokenError) {
                await handleRefreshToken(handleGetBalance);
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Erro ao buscar saldo',
                    description: result.error || 'Não foi possível buscar o saldo.'
                });
                setIsBalanceLoading(false);
            }
        } else if (result.data && result.data.balance !== undefined) {
            const balanceValue = typeof result.data.balance === 'string' ? parseFloat(result.data.balance) : result.data.balance;
            setBalance(balanceValue);
            setIsBalanceLoading(false);
        } else {
             toast({
                variant: 'destructive',
                title: 'Resposta inesperada',
                description: 'Não foi possível encontrar o saldo na resposta da API.'
            });
            setIsBalanceLoading(false);
        }
    }

    const handleGetAccountData = async (accessToken: string) => {
        setIsAccountDataLoading(true);
        const result = await getAccountData(accessToken);
        
        if (result.error) {
            if (result.isTokenError) {
                await handleRefreshToken(handleGetAccountData);
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Erro ao buscar dados da conta',
                    description: result.error || 'Não foi possível buscar os dados.'
                });
                setIsAccountDataLoading(false);
            }
        } else if (result.data) {
            setAccountData(result.data);
            setIsAccountDataLoading(false);
        } else {
             toast({
                variant: 'destructive',
                title: 'Resposta inesperada',
                description: 'Não foi possível encontrar os dados da conta na resposta da API.'
            });
            setIsAccountDataLoading(false);
        }
    }

    const handleGetStatement = async (accessToken: string) => {
        setIsStatementLoading(true);
        setStatement(null);

        const options = {
            start: dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined,
            end: dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined,
        };
        
        const result = await getBankStatement(accessToken, options);

        if (result.error) {
            if (result.isTokenError) {
                await handleRefreshToken(handleGetStatement);
            } else {
                toast({ variant: 'destructive', title: 'Erro ao buscar extrato', description: result.error });
                setIsStatementLoading(false);
            }
        } else if (result.data) {
            setStatement(result.data);
            setIsStatementLoading(false);
        } else {
            toast({ variant: 'destructive', title: 'Resposta inesperada', description: 'Não foi possível obter o extrato da API.' });
            setIsStatementLoading(false);
        }
    }

    const isLoading = isBalanceLoading || isAccountDataLoading || isStatementLoading;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Conta Cora Conectada</CardTitle>
                <CardDescription>Sua conta está conectada. Use as ações abaixo para interagir com a API.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 <div className="rounded-md border p-4 space-y-2">
                    <h3 className="font-semibold">Saldo da Conta</h3>
                    {balance === null ? (
                        <p className="text-muted-foreground">Clique no botão para buscar seu saldo atual.</p>
                    ) : (
                        <p className="text-2xl font-bold text-primary">{formatCurrency(balance)}</p>
                    )}
                    <Button onClick={() => handleGetBalance(token.accessToken)} disabled={isLoading}>
                        {isBalanceLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isBalanceLoading ? 'Buscando Saldo...' : 'Buscar Saldo'}
                    </Button>
                 </div>
                 
                 <div className="rounded-md border p-4 space-y-2">
                    <h3 className="font-semibold">Dados da Conta</h3>
                     {accountData ? (
                        <div className="text-sm space-y-1">
                            <p><span className="font-medium text-muted-foreground">Banco:</span> {accountData.bankCode} - {accountData.bankName}</p>
                            <p><span className="font-medium text-muted-foreground">Agência:</span> {accountData.agency}</p>
                            <p><span className="font-medium text-muted-foreground">Conta:</span> {accountData.accountNumber}-{accountData.accountDigit}</p>
                        </div>
                    ) : (
                        <p className="text-muted-foreground">Clique no botão para buscar os dados da sua conta.</p>
                    )}
                    <Button onClick={() => handleGetAccountData(token.accessToken)} disabled={isLoading}>
                        {isAccountDataLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isAccountDataLoading ? 'Buscando Dados...' : 'Buscar Dados da Conta'}
                    </Button>
                 </div>

                 <div className="rounded-md border p-4 space-y-4">
                    <h3 className="font-semibold">Extrato da Conta</h3>
                    <div className="flex flex-col sm:flex-row gap-2">
                         <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                id="date"
                                variant={"outline"}
                                className={cn(
                                    "w-full justify-start text-left font-normal sm:w-auto",
                                    !dateRange && "text-muted-foreground"
                                )}
                                >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {dateRange?.from ? (
                                    dateRange.to ? (
                                    <>
                                        {format(dateRange.from, "dd/MM/yy", { locale: ptBR })} - {format(dateRange.to, "dd/MM/yy", { locale: ptBR })}
                                    </>
                                    ) : (
                                    format(dateRange.from, "dd/MM/yy", { locale: ptBR })
                                    )
                                ) : (
                                    <span>Selecione um período</span>
                                )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                initialFocus
                                mode="range"
                                defaultMonth={dateRange?.from}
                                selected={dateRange}
                                onSelect={setDateRange}
                                numberOfMonths={2}
                                locale={ptBR}
                                />
                            </PopoverContent>
                        </Popover>
                         <Button onClick={() => handleGetStatement(token.accessToken)} disabled={isLoading || !dateRange?.from}>
                            {isStatementLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isStatementLoading ? 'Buscando Extrato...' : 'Buscar Extrato'}
                        </Button>
                    </div>

                    {isStatementLoading && (
                        <div className="flex items-center justify-center p-8">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    )}
                    
                    {statement && (
                        statement.entries.length > 0 ? (
                           <Table>
                               <TableHeader>
                                   <TableRow>
                                       <TableHead>Data</TableHead>
                                       <TableHead>Descrição</TableHead>
                                       <TableHead className="text-right">Valor</TableHead>
                                   </TableRow>
                               </TableHeader>
                               <TableBody>
                                   {statement.entries.map((entry) => (
                                       <TableRow key={entry.id}>
                                           <TableCell>{format(parseISO(entry.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}</TableCell>
                                           <TableCell>
                                               <div className="flex items-center gap-2">
                                                    {entry.type === 'CREDIT' ? <ArrowUpCircle className="h-4 w-4 text-emerald-500" /> : <ArrowDownCircle className="h-4 w-4 text-red-500" />}
                                                    <div className="flex flex-col">
                                                        <span className="font-medium">{entry.transaction.description}</span>
                                                        <span className="text-xs text-muted-foreground">{entry.transaction.counterParty.name}</span>
                                                    </div>
                                                </div>
                                           </TableCell>
                                           <TableCell className={`text-right font-mono ${entry.type === 'CREDIT' ? 'text-emerald-500' : 'text-red-500'}`}>
                                               {formatCurrencyFromCents(entry.amount)}
                                           </TableCell>
                                       </TableRow>
                                   ))}
                               </TableBody>
                           </Table>
                        ) : (
                            <p className="text-muted-foreground text-center p-4">Nenhuma transação encontrada para o período selecionado.</p>
                        )
                    )}
                 </div>
            </CardContent>
        </Card>
    )
}


function ApiBankContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const coraTokenRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid, 'coraTokens', 'cora-token');
  }, [firestore, user]);

  const { data: coraToken, isLoading: isTokenLoading } = useDoc<CoraToken>(coraTokenRef);

  const isLoading = isUserLoading || isTokenLoading;

  if (isLoading) {
    return <Loader2 className="h-8 w-8 animate-spin text-primary" />;
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-headline text-3xl font-bold tracking-tight">
          API BANK (BETA)
        </h1>
        <p className="text-muted-foreground">
          Conecte suas contas e automatize suas finanças.
        </p>
      </header>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Falha na Conexão</AlertTitle>
          <AlertDescription>
            Ocorreu um erro ao tentar conectar com a Cora: {error}
          </AlertDescription>
        </Alert>
      )}

      {coraToken ? <CoraAccountDetails token={coraToken} /> : <CoraAuthForm />}

    </div>
  );
}

export default function ApiBankPage() {
    return (
        <AppLayout>
            <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin text-primary" />}>
                 <ApiBankContent />
            </Suspense>
        </AppLayout>
    )
}
