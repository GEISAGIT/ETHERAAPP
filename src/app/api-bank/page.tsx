'use client';
import { AppLayout } from '@/components/layout/app-layout';
import { CoraAuthForm } from '@/components/cora/cora-auth-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useSearchParams } from 'next/navigation';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle, AlertTriangle, Loader2, CalendarIcon, ArrowDownCircle, ArrowUpCircle, ClipboardCheck, FileText } from 'lucide-react';
import { Suspense, useState, useMemo } from 'react';
import { useUser, useDoc, useMemoFirebase, useFirestore, setDocumentNonBlocking } from '@/firebase';
import type { CoraToken, CoraAccountData, CoraStatement, CoraStatementEntry, CoraPaymentInitiationResponse, CoraBoletoRequestBody, CoraBoletoResponse } from '@/lib/types';
import { doc, Timestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { getAccountBalance, getAccountData, getBankStatement, refreshCoraToken, initiatePayment, issueBoleto } from './actions';
import { useToast } from '@/hooks/use-toast';
import type { DateRange } from 'react-day-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';


const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const formatCurrencyFromCents = (valueInCents: number) => {
    return formatCurrency(valueInCents / 100);
}

const paymentFormSchema = z.object({
  digitableLine: z.string().min(44, 'A linha digitável deve ter no mínimo 44 caracteres.'),
  scheduledAt: z.date().optional(),
});

const boletoFormSchema = z.object({
  customerName: z.string().min(3, "Nome do cliente é obrigatório."),
  customerDocument: z.string().refine(doc => doc.length === 11 || doc.length === 14, "CPF/CNPJ inválido."),
  customerEmail: z.string().email("Email inválido."),
  customerAddressStreet: z.string().min(3, "Rua é obrigatória."),
  customerAddressNumber: z.string().min(1, "Número é obrigatório."),
  customerAddressDistrict: z.string().min(3, "Bairro é obrigatório."),
  customerAddressCity: z.string().min(3, "Cidade é obrigatória."),
  customerAddressState: z.string().length(2, "Estado deve ter 2 letras (UF)."),
  customerAddressZipCode: z.string().min(8, "CEP deve ter 8 números.").max(9, "CEP inválido."),
  customerAddressComplement: z.string().optional(),
  serviceDescription: z.string().min(5, "Descrição é obrigatória."),
  amount: z.coerce.number().positive("O valor deve ser maior que zero."),
  dueDate: z.date({ required_error: 'A data de vencimento é obrigatória.'}),
});


function CoraAccountDetails({ token }: { token: CoraToken }) {
    const [balance, setBalance] = useState<number | null>(null);
    const [isBalanceLoading, setIsBalanceLoading] = useState(false);
    const [accountData, setAccountData] = useState<CoraAccountData | null>(null);
    const [isAccountDataLoading, setIsAccountDataLoading] = useState(false);
    const [statement, setStatement] = useState<CoraStatement | null>(null);
    const [isStatementLoading, setIsStatementLoading] = useState(false);
    const [dateRange, setDateRange] = useState<DateRange | undefined>();
    const [paymentResult, setPaymentResult] = useState<CoraPaymentInitiationResponse | null>(null);
    const [isInitiatingPayment, setIsInitiatingPayment] = useState(false);
    const [boletoResult, setBoletoResult] = useState<CoraBoletoResponse | null>(null);
    const [isIssuingBoleto, setIsIssuingBoleto] = useState(false);

    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    
    const paymentForm = useForm<z.infer<typeof paymentFormSchema>>({
      resolver: zodResolver(paymentFormSchema),
    });

    const boletoForm = useForm<z.infer<typeof boletoFormSchema>>({
      resolver: zodResolver(boletoFormSchema),
    });

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
             setIsInitiatingPayment(false);
             setIsIssuingBoleto(false);
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

    const handleInitiatePayment = async (accessToken: string, values: z.infer<typeof paymentFormSchema>) => {
        setIsInitiatingPayment(true);
        setPaymentResult(null);

        const scheduledAt = values.scheduledAt ? format(values.scheduledAt, 'yyyy-MM-dd') : undefined;
        
        const result = await initiatePayment(accessToken, values.digitableLine, scheduledAt);

        if (result.error) {
            if (result.isTokenError) {
                await handleRefreshToken((newAccessToken) => handleInitiatePayment(newAccessToken, values));
            } else {
                toast({ variant: 'destructive', title: 'Erro ao Iniciar Pagamento', description: result.error });
                setIsInitiatingPayment(false);
            }
        } else if (result.data) {
            setPaymentResult(result.data);
            toast({ title: 'Pagamento Iniciado!', description: 'Aprove a transação no seu aplicativo Cora.' });
            setIsInitiatingPayment(false);
        } else {
            toast({ variant: 'destructive', title: 'Resposta inesperada', description: 'Não foi possível iniciar o pagamento.' });
            setIsInitiatingPayment(false);
        }
    }

    const onPaymentSubmit = (values: z.infer<typeof paymentFormSchema>) => {
      handleInitiatePayment(token.accessToken, values);
    }
    
    const handleIssueBoleto = async (accessToken: string, requestBody: CoraBoletoRequestBody) => {
        setIsIssuingBoleto(true);
        setBoletoResult(null);

        const result = await issueBoleto(accessToken, requestBody);
        
        if (result.error) {
            if (result.isTokenError) {
                await handleRefreshToken((newAccessToken) => handleIssueBoleto(newAccessToken, requestBody));
            } else {
                toast({ variant: 'destructive', title: 'Erro ao Emitir Boleto', description: result.error });
                setIsIssuingBoleto(false);
            }
        } else if (result.data) {
            setBoletoResult(result.data);
            toast({ title: 'Boleto Emitido!', description: 'O boleto foi gerado e está pronto para ser pago.' });
            setIsIssuingBoleto(false);
        } else {
            toast({ variant: 'destructive', title: 'Resposta inesperada', description: 'Não foi possível emitir o boleto.' });
            setIsIssuingBoleto(false);
        }
    };
    
    const onBoletoSubmit = (values: z.infer<typeof boletoFormSchema>) => {
        const sanitizedDocument = values.customerDocument.replace(/\D/g, '');
        const sanitizedZipCode = values.customerAddressZipCode.replace(/\D/g, '');

        const requestBody: CoraBoletoRequestBody = {
            customer: {
                name: values.customerName,
                email: values.customerEmail,
                document: {
                    identity: sanitizedDocument,
                    type: sanitizedDocument.length === 11 ? 'CPF' : 'CNPJ',
                },
                address: {
                    street: values.customerAddressStreet,
                    number: values.customerAddressNumber,
                    district: values.customerAddressDistrict,
                    city: values.customerAddressCity,
                    state: values.customerAddressState.toUpperCase(),
                    zip_code: sanitizedZipCode,
                    complement: values.customerAddressComplement
                }
            },
            services: [{
                name: values.serviceDescription,
                description: values.serviceDescription,
                amount: Math.round(values.amount * 100), // convert to cents
            }],
            payment_terms: {
                due_date: format(values.dueDate, 'yyyy-MM-dd'),
            },
            payment_forms: ['BANK_SLIP', 'PIX'],
        };
        handleIssueBoleto(token.accessToken, requestBody);
    }

    const isLoading = isBalanceLoading || isAccountDataLoading || isStatementLoading || isInitiatingPayment || isIssuingBoleto;

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
                                   {statement.entries.map((entry) => {
                                       const date = new Date(entry.createdAt);
                                       const formattedDate = !isNaN(date.getTime()) 
                                          ? format(date, "dd/MM/yyyy HH:mm", { locale: ptBR }) 
                                          : 'N/A';

                                       return (
                                       <TableRow key={entry.id}>
                                           <TableCell>{formattedDate}</TableCell>
                                           <TableCell>
                                               <div className="flex items-center gap-2">
                                                    {entry.type === 'CREDIT' ? <ArrowUpCircle className="h-4 w-4 text-emerald-500" /> : <ArrowDownCircle className="h-4 w-4 text-red-500" />}
                                                    <div className="flex flex-col">
                                                        <span className="font-medium">{entry.transaction?.description ?? 'Descrição não disponível'}</span>
                                                        <span className="text-xs text-muted-foreground">{entry.transaction?.counterParty?.name ?? 'Contraparte não disponível'}</span>
                                                    </div>
                                                </div>
                                           </TableCell>
                                           <TableCell className={`text-right font-mono ${entry.type === 'CREDIT' ? 'text-emerald-500' : 'text-red-500'}`}>
                                               {formatCurrencyFromCents(entry.amount)}
                                           </TableCell>
                                       </TableRow>
                                   )})}
                               </TableBody>
                           </Table>
                        ) : (
                            <p className="text-muted-foreground text-center p-4">Nenhuma transação encontrada para o período selecionado.</p>
                        )
                    )}
                 </div>

                 <div className="rounded-md border p-4 space-y-4">
                    <h3 className="font-semibold">Iniciar Pagamento de Boleto</h3>
                    <Form {...paymentForm}>
                        <form onSubmit={paymentForm.handleSubmit(onPaymentSubmit)} className="space-y-4">
                            <FormField
                                control={paymentForm.control}
                                name="digitableLine"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Linha Digitável</FormLabel>
                                        <FormControl>
                                            <Input placeholder="00000.00000 00000.000000..." {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={paymentForm.control}
                                name="scheduledAt"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                    <FormLabel>Agendar para (Opcional)</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button
                                            variant={"outline"}
                                            className={cn(
                                                "w-full pl-3 text-left font-normal",
                                                !field.value && "text-muted-foreground"
                                            )}
                                            >
                                            {field.value ? (
                                                format(field.value, "PPP", { locale: ptBR })
                                            ) : (
                                                <span>Escolha uma data</span>
                                            )}
                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                            </Button>
                                        </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={field.value}
                                            onSelect={field.onChange}
                                            disabled={(date) => date < new Date()}
                                            initialFocus
                                            locale={ptBR}
                                        />
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button type="submit" disabled={isLoading}>
                                {isInitiatingPayment && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isInitiatingPayment ? 'Iniciando...' : 'Iniciar Pagamento'}
                            </Button>
                        </form>
                    </Form>
                    {paymentResult && (
                        <div className="rounded-lg border bg-green-50 dark:bg-green-950 p-4 space-y-3 mt-4">
                            <div className="flex items-start gap-3">
                                <ClipboardCheck className="h-5 w-5 text-green-600 dark:text-green-400 mt-1" />
                                <div className="flex-1">
                                    <h4 className="font-semibold text-green-800 dark:text-green-200">Pagamento Iniciado com Sucesso!</h4>
                                     <p className="text-sm text-green-700 dark:text-green-300">
                                        O pagamento foi iniciado e aguarda sua aprovação no aplicativo da Cora.
                                    </p>
                                </div>
                            </div>
                            <div className="text-xs text-green-700 dark:text-green-300 space-y-1 pl-8">
                                <p><span className="font-medium">Beneficiário:</span> {paymentResult.creditor.name}</p>
                                <p><span className="font-medium">Valor:</span> {formatCurrencyFromCents(paymentResult.amount)}</p>
                                <p><span className="font-medium">Status:</span> <Badge variant="secondary">{paymentResult.status}</Badge></p>
                            </div>
                        </div>
                    )}
                 </div>

                 <div className="rounded-md border p-4 space-y-4">
                    <h3 className="font-semibold">Emitir Boleto de Cobrança</h3>
                     <Form {...boletoForm}>
                        <form onSubmit={boletoForm.handleSubmit(onBoletoSubmit)} className="space-y-4">
                             <FormField
                                control={boletoForm.control}
                                name="customerName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nome do Cliente</FormLabel>
                                        <FormControl><Input placeholder="Ex: João da Silva" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                    control={boletoForm.control}
                                    name="customerDocument"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>CPF/CNPJ do Cliente</FormLabel>
                                            <FormControl><Input placeholder="Apenas números" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={boletoForm.control}
                                    name="customerEmail"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Email do Cliente</FormLabel>
                                            <FormControl><Input type="email" placeholder="cliente@email.com" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <div className="space-y-2 rounded-md border p-4">
                                <h4 className="font-medium text-sm">Endereço do Cliente</h4>
                                <FormField
                                    control={boletoForm.control}
                                    name="customerAddressStreet"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Rua</FormLabel>
                                            <FormControl><Input placeholder="Ex: Rua das Flores" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <FormField
                                        control={boletoForm.control}
                                        name="customerAddressNumber"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Número</FormLabel>
                                                <FormControl><Input placeholder="123" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                     <FormField
                                        control={boletoForm.control}
                                        name="customerAddressComplement"
                                        render={({ field }) => (
                                            <FormItem className="sm:col-span-2">
                                                <FormLabel>Complemento</FormLabel>
                                                <FormControl><Input placeholder="Apto 101" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                <FormField
                                    control={boletoForm.control}
                                    name="customerAddressDistrict"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Bairro</FormLabel>
                                            <FormControl><Input placeholder="Centro" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <FormField
                                        control={boletoForm.control}
                                        name="customerAddressCity"
                                        render={({ field }) => (
                                            <FormItem className="sm:col-span-2">
                                                <FormLabel>Cidade</FormLabel>
                                                <FormControl><Input placeholder="São Paulo" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                     <FormField
                                        control={boletoForm.control}
                                        name="customerAddressState"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Estado (UF)</FormLabel>
                                                <FormControl><Input placeholder="SP" maxLength={2} {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                 <FormField
                                    control={boletoForm.control}
                                    name="customerAddressZipCode"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>CEP</FormLabel>
                                            <FormControl><Input placeholder="00000-000" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                             <FormField
                                control={boletoForm.control}
                                name="serviceDescription"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Descrição do Serviço/Produto</FormLabel>
                                        <FormControl><Input placeholder="Ex: Consulta Psicológica" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                    control={boletoForm.control}
                                    name="amount"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Valor (R$)</FormLabel>
                                            <FormControl><Input type="number" step="0.01" placeholder="150.00" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                 <FormField
                                    control={boletoForm.control}
                                    name="dueDate"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-col">
                                        <FormLabel>Data de Vencimento</FormLabel>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button
                                                variant={"outline"}
                                                className={cn(
                                                    "w-full pl-3 text-left font-normal",
                                                    !field.value && "text-muted-foreground"
                                                )}
                                                >
                                                {field.value ? (
                                                    format(field.value, "PPP", { locale: ptBR })
                                                ) : (
                                                    <span>Escolha uma data</span>
                                                )}
                                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                </Button>
                                            </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={field.value}
                                                onSelect={field.onChange}
                                                disabled={(date) => date < new Date()}
                                                initialFocus
                                                locale={ptBR}
                                            />
                                            </PopoverContent>
                                        </Popover>
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <Button type="submit" disabled={isLoading}>
                                {isIssuingBoleto && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isIssuingBoleto ? 'Emitindo...' : 'Emitir Boleto'}
                            </Button>
                        </form>
                    </Form>
                     {boletoResult && (
                        <div className="rounded-lg border bg-green-50 dark:bg-green-950 p-4 space-y-3 mt-4">
                            <div className="flex items-start gap-3">
                                <FileText className="h-5 w-5 text-green-600 dark:text-green-400 mt-1" />
                                <div className="flex-1">
                                    <h4 className="font-semibold text-green-800 dark:text-green-200">Boleto Emitido com Sucesso!</h4>
                                     <p className="text-sm text-green-700 dark:text-green-300">
                                        O boleto foi gerado e está pronto para ser pago.
                                    </p>
                                </div>
                            </div>
                            <div className="text-xs text-green-700 dark:text-green-300 space-y-2 pl-8">
                                <p><span className="font-medium">Valor:</span> {formatCurrencyFromCents(boletoResult.total_amount)}</p>
                                <p><span className="font-medium">Status:</span> <Badge variant="secondary">{boletoResult.status}</Badge></p>
                                 <Button asChild size="sm" variant="outline" className="text-foreground">
                                    <Link href={boletoResult.payment_options.bank_slip.url} target="_blank" rel="noopener noreferrer">
                                        Visualizar PDF do Boleto
                                    </Link>
                                </Button>
                            </div>
                        </div>
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
