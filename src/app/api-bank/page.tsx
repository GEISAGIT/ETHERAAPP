
'use client';
import { AppLayout } from '@/components/layout/app-layout';
import { CoraAuthForm } from '@/components/cora/cora-auth-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { useSearchParams } from 'next/navigation';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  CheckCircle, 
  AlertTriangle, 
  Loader2, 
  CalendarIcon, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  ClipboardCheck, 
  FileText, 
  Copy, 
  Barcode, 
  QrCode, 
  ExternalLink, 
  Info,
  ArrowRightLeft
} from 'lucide-react';
import { Suspense, useState, useMemo, useEffect } from 'react';
import { useUser, useDoc, useMemoFirebase, useFirestore, setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import type { CoraToken, CoraAccountData, CoraStatement, CoraStatementEntry, CoraPaymentInitiationResponse, CoraInvoiceRequestBody, CoraInvoiceResponse } from '@/lib/types';
import { doc, Timestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { getAccountBalance, getAccountData, getBankStatement, refreshCoraToken, initiatePayment, issueInvoice } from './actions';
import { useToast } from '@/hooks/use-toast';
import type { DateRange } from 'react-day-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, isWeekend, addDays, startOfToday } from 'date-fns';
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
import { Label } from '@/components/ui/label';
import { v4 as uuidv4 } from 'uuid';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


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

const invoiceFormSchema = z.object({
  customerName: z.string().min(3, "Nome do cliente é obrigatório."),
  customerEmail: z.string().email("Por favor, insira um email válido."),
  customerDocument: z.string().refine(doc => {
    const sanitized = doc.replace(/\D/g, '');
    return sanitized.length === 11 || sanitized.length === 14;
  }, "CPF/CNPJ inválido. Digite um documento válido."),
  customerAddressStreet: z.string().min(3, "Rua é obrigatória."),
  customerAddressNumber: z.string().min(1, "Número é obrigatório."),
  customerAddressDistrict: z.string().min(3, "Bairro é obrigatório."),
  customerAddressCity: z.string().min(3, "Cidade é obrigatória."),
  customerAddressState: z.string().length(2, "Estado deve ter 2 letras (UF)."),
  customerAddressZipCode: z.string().refine(zip => {
    const sanitized = zip.replace(/\D/g, '');
    return sanitized.length === 8;
  }, "CEP inválido. Deve conter 8 números."),
  customerAddressComplement: z.string().optional(),
  serviceDescription: z.string().min(3, "A descrição do serviço é obrigatória."),
  amount: z.coerce.number().min(0.01, "O valor deve ser positivo."),
  dueDate: z.date({ required_error: 'A data de vencimento é obrigatória.'}),
});

function GuidedTestFlow({ mainToken, onDisconnect }: { mainToken: CoraToken | null, onDisconnect: () => void }) {
    const [accountData, setAccountData] = useState<CoraAccountData | null>(null);
    const [isLoadingAccount, setIsLoadingAccount] = useState(false);
    const [boletoResult, setBoletoResult] = useState<CoraInvoiceResponse | null>(null);
    const [isIssuingBoleto, setIsIssuingBoleto] = useState(false);
    const [issuingBoletoError, setIssuingBoletoError] = useState<string | null>(null);
    const [paymentResult, setPaymentResult] = useState<CoraPaymentInitiationResponse | null>(null);
    const [isInitiatingPayment, setIsInitiatingPayment] = useState(false);
    const [paymentDate, setPaymentDate] = useState<Date | undefined>(new Date());
    const { toast } = useToast();

    useEffect(() => {
        const fetchAccountData = async () => {
            if (mainToken) {
                setIsLoadingAccount(true);
                const result = await getAccountData(mainToken.accessToken);
                if (result.data) {
                    setAccountData(result.data);
                } else {
                    setAccountData(null);
                }
                setIsLoadingAccount(false);
            } else {
                setAccountData(null);
            }
        };
        fetchAccountData();
    }, [mainToken]);
    
    const handleIssueTestBoleto = async () => {
      if (!mainToken) return;
      setIsIssuingBoleto(true);
      setIssuingBoletoError(null);
      setBoletoResult(null);

      const requestBody: CoraInvoiceRequestBody = {
          code: `teste-guiado-${uuidv4().substring(0, 8)}`,
          customer: {
              name: "Cliente B (Pagador)",
              email: "cliente.b@emailteste.com",
              document: { identity: "34452343104", type: 'CPF' },
              address: { street: "Rua Teste", number: "1", district: "Bairro Teste", city: "Cidade Teste", state: "SP", zip_code: "01001000" }
          },
          services: [{ name: "Serviço de Teste", description: "Teste de fluxo guiado", amount: 15000 }],
          payment_terms: { due_date: format(new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd') },
          payment_forms: ["BANK_SLIP"]
      };

      const result = await issueInvoice(mainToken.accessToken, requestBody);
      if (result.error) {
          setIssuingBoletoError(result.error);
      } else if (result.data) {
          setBoletoResult(result.data);
          toast({ title: 'Boleto de teste emitido!' });
      }
      setIsIssuingBoleto(false);
    };

    const handlePayTestBoleto = async () => {
        const digitableLine = boletoResult?.bank_slip?.digitable_line || boletoResult?.payment_options?.bank_slip?.digitable_line;
        if (!mainToken || !digitableLine) return;
        setIsInitiatingPayment(true);
        setPaymentResult(null);

        const scheduledAtStr = paymentDate ? format(paymentDate, 'yyyy-MM-dd') : undefined;

        const result = await initiatePayment(mainToken.accessToken, digitableLine, scheduledAtStr);
        if (result.error) {
            let errorMsg = result.error;
            if (errorMsg.includes('PAY-0004')) {
                errorMsg = "Data indisponível para pagamento (PAY-0004). Tente selecionar o próximo dia útil no calendário abaixo.";
            }
            toast({ variant: 'destructive', title: 'Erro ao Pagar Boleto', description: errorMsg });
        } else if (result.data) {
            setPaymentResult(result.data);
            toast({ title: 'Pagamento Iniciado!', description: 'O pagamento foi enviado para processamento.' });
        }
        setIsInitiatingPayment(false);
    };

    const boletoData = boletoResult?.bank_slip || boletoResult?.payment_options?.bank_slip;

    return (
        <div className="space-y-6">
            <h3 className="font-headline text-2xl text-primary">Fluxo de Teste Guiado</h3>
            <p className="text-muted-foreground">Siga os passos abaixo para simular o fluxo completo de emissão e pagamento, conforme as instruções da Cora.</p>

            <Card className={cn(!mainToken && "border-primary shadow-lg bg-primary/5")}>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Badge variant="outline" className="h-6 w-6 rounded-full p-0 flex items-center justify-center font-bold">1</Badge>
                        Autorizar Conta
                    </CardTitle>
                    <CardDescription>
                        Clique para conectar a conta Cora que deseja usar. Você será redirecionado para a tela de login da Cora.
                        <div className="mt-3 p-3 bg-muted/50 rounded-md border text-xs space-y-1">
                            <p className="font-bold text-foreground">Credenciais de Teste:</p>
                            <p><span className="font-semibold">Cliente A (Emissor):</span> CPF `42343487324` / Senha `12345678`</p>
                            <p><span className="font-semibold">Cliente B (Pagador):</span> CPF `34452343104` / Senha `12345678`</p>
                        </div>
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoadingAccount ? (
                        <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Verificando...</div>
                    ) : mainToken && accountData ? (
                        <div className="flex items-center justify-between p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-md">
                            <div className='text-sm'>
                               <p className="font-semibold text-emerald-700 dark:text-emerald-400">Conta Ativa no Momento:</p>
                               <p className="font-mono text-xs">{accountData.bankName} | Ag: {accountData.agency} | CC: {accountData.accountNumber}-{accountData.accountDigit}</p>
                            </div>
                            <Button variant="outline" size="sm" onClick={onDisconnect} className="text-destructive border-destructive/20 hover:bg-destructive/10">Desconectar</Button>
                        </div>
                    ) : (
                        <CoraAuthForm />
                    )}
                </CardContent>
            </Card>

            <Card className={cn(mainToken && !boletoResult && "border-primary shadow-lg bg-primary/5")}>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Badge variant="outline" className="h-6 w-6 rounded-full p-0 flex items-center justify-center font-bold">2</Badge>
                        Emitir Boleto (com Cliente A)
                    </CardTitle>
                    <CardDescription>Com a conta do <span className="font-bold">Cliente A</span> conectada, clique no botão para emitir um boleto de R$ 150,00 para o Cliente B.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={handleIssueTestBoleto} disabled={!mainToken || isIssuingBoleto}>
                        {isIssuingBoleto ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Emitindo...</> : 'Emitir Boleto de Teste'}
                    </Button>
                    {issuingBoletoError && (
                      <Alert variant="destructive" className="mt-4">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Falha na Emissão</AlertTitle>
                        <AlertDescription>{issuingBoletoError}</AlertDescription>
                      </Alert>
                    )}
                    {boletoResult && (
                       <div className="mt-4 space-y-3 text-sm p-4 border rounded-md bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200">
                          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-base">
                             <CheckCircle className="h-5 w-5" />
                             Boleto emitido com sucesso!
                          </div>
                          
                          {boletoData?.url && (
                            <Button variant="default" size="sm" asChild className="w-full mt-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12 shadow-md">
                                <a href={boletoData.url} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="mr-2 h-5 w-5" /> Visualizar PDF do Boleto
                                </a>
                            </Button>
                          )}

                          {boletoData?.digitable_line && (
                            <div className="space-y-1 mt-2">
                                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Linha Digitável</Label>
                                <div className="flex items-center gap-2">
                                    <p className="font-mono text-xs break-all bg-background p-2 border rounded flex-1 select-all">{boletoData.digitable_line}</p>
                                    <Button size="icon" variant="outline" className="h-8 w-8 shrink-0" onClick={() => {
                                        navigator.clipboard.writeText(boletoData.digitable_line!);
                                        toast({ title: "Copiado!" });
                                    }}><Copy className="h-3 w-3"/></Button>
                                </div>
                            </div>
                          )}
                       </div>
                    )}
                </CardContent>
            </Card>

            <Card className={cn(boletoResult && !paymentResult && "border-primary shadow-lg bg-primary/5")}>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Badge variant="outline" className="h-6 w-6 rounded-full p-0 flex items-center justify-center font-bold">3</Badge>
                        Pagar Boleto (com Cliente B)
                    </CardTitle>
                    <CardDescription>
                        <span className="text-destructive font-bold uppercase underline">Importante:</span><br/>
                        1. <span className="font-bold">Desconecte</span> a conta do Cliente A no Passo 1.<br/>
                        2. <span className="font-bold">Conecte</span> a conta do <span className="font-bold text-primary">Cliente B (Pagador)</span>.<br/>
                        3. Escolha a data e clique para pagar o boleto emitido.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label className="text-sm font-semibold">Data do Pagamento:</Label>
                        <Popover modal>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className={cn(
                                        "w-full justify-start text-left font-normal",
                                        !paymentDate && "text-muted-foreground"
                                    )}
                                    disabled={!mainToken || !boletoData}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {paymentDate ? format(paymentDate, "PPP", { locale: ptBR }) : <span>Selecione a data</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={paymentDate}
                                    onSelect={setPaymentDate}
                                    initialFocus
                                    locale={ptBR}
                                    disabled={(date) => date < startOfToday()}
                                />
                            </PopoverContent>
                        </Popover>
                        <p className="text-[10px] text-muted-foreground italic">Dica: Se hoje for fim de semana ou feriado, selecione o próximo dia útil.</p>
                    </div>

                    <Button onClick={handlePayTestBoleto} disabled={!mainToken || isInitiatingPayment || !boletoData} className="w-full">
                        {isInitiatingPayment ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Processando Pagamento...</> : 'Confirmar Pagamento com Conta Atual'}
                    </Button>

                    {paymentResult && (
                        <div className="mt-4 space-y-2 text-sm p-4 border rounded-md bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200">
                          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold">
                             <CheckCircle className="h-4 w-4" />
                             Pagamento iniciado com sucesso!
                          </div>
                          <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t">
                             <div>
                                <p className="text-[10px] uppercase font-bold text-muted-foreground">Status</p>
                                <Badge variant="outline" className="bg-white/50">{paymentResult.status}</Badge>
                             </div>
                             <div>
                                <p className="text-[10px] uppercase font-bold text-muted-foreground">Valor</p>
                                <p className="font-bold">{formatCurrencyFromCents(paymentResult.amount)}</p>
                             </div>
                             <div className="col-span-2">
                                <p className="text-[10px] uppercase font-bold text-muted-foreground">Beneficiário</p>
                                <p className="truncate">{paymentResult.creditor.name}</p>
                             </div>
                          </div>
                       </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}


function CoraAccountDetails({ token }: { token: CoraToken }) {
    const [balance, setBalance] = useState<number | null>(null);
    const [isBalanceLoading, setIsLoadingAccount] = useState(false);
    const [accountData, setAccountData] = useState<CoraAccountData | null>(null);
    const [isAccountDataLoading, setIsAccountDataLoading] = useState(false);
    const [statement, setStatement] = useState<CoraStatement | null>(null);
    const [isStatementLoading, setIsStatementLoading] = useState(false);
    const [dateRange, setDateRange] = useState<DateRange | undefined>();
    const [paymentResult, setPaymentResult] = useState<CoraPaymentInitiationResponse | null>(null);
    const [isInitiatingPayment, setIsInitiatingPayment] = useState(false);
    
    const [boletoResult, setBoletoResult] = useState<CoraInvoiceResponse | null>(null);
    const [isIssuingBoleto, setIsIssuingBoleto] = useState(false);
    const [issuingBoletoError, setIssuingBoletoError] = useState<string | null>(null);
    
    const [pixResult, setPixResult] = useState<CoraInvoiceResponse | null>(null);
    const [isIssuingPix, setIsIssuingPix] = useState(false);
    const [issuingPixError, setIssuingPixError] = useState<string | null>(null);

    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    
    const paymentForm = useForm<z.infer<typeof paymentFormSchema>>({
      resolver: zodResolver(paymentFormSchema),
    });

    const boletoForm = useForm<z.infer<typeof invoiceFormSchema>>({
      resolver: zodResolver(invoiceFormSchema),
      defaultValues: {
        customerEmail: "cliente@teste.com",
        customerAddressStreet: "Rua Teste",
        customerAddressNumber: "123",
        customerAddressDistrict: "Centro",
        customerAddressCity: "Cidade",
        customerAddressState: "SP",
        customerAddressZipCode: "01001000",
        dueDate: new Date()
      }
    });

    const pixForm = useForm<z.infer<typeof invoiceFormSchema>>({
      resolver: zodResolver(invoiceFormSchema),
      defaultValues: {
        customerEmail: "cliente@teste.com",
        customerAddressStreet: "Rua Teste",
        customerAddressNumber: "123",
        customerAddressDistrict: "Centro",
        customerAddressCity: "Cidade",
        customerAddressState: "SP",
        customerAddressZipCode: "01001000",
        dueDate: new Date()
      }
    });

    const copyToClipboard = (textToCopy: string, successMessage: string) => {
        navigator.clipboard.writeText(textToCopy).then(() => {
            toast({
                title: 'Copiado!',
                description: successMessage,
            });
        }, (err) => {
            toast({
                variant: 'destructive',
                title: 'Falha ao copiar',
                description: 'Não foi possível copiar o texto.',
            });
        });
    }

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
             setIsLoadingAccount(false);
             setIsAccountDataLoading(false);
             setIsStatementLoading(false);
             setIsInitiatingPayment(false);
             setIsIssuingBoleto(false);
             setIsIssuingPix(false);
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
        setIsLoadingAccount(true);
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
                setIsLoadingAccount(false);
            }
        } else if (result.data && result.data.balance !== undefined) {
            const balanceValue = typeof result.data.balance === 'string' ? parseFloat(result.data.balance) : result.data.balance;
            setBalance(balanceValue);
            setIsLoadingAccount(false);
        } else {
             toast({
                variant: 'destructive',
                title: 'Resposta inesperada',
                description: 'Não foi possível encontrar o saldo na resposta da API.'
            });
            setIsLoadingAccount(false);
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
                let errorMsg = result.error;
                if (errorMsg.includes('PAY-0004')) {
                    errorMsg = "Data indisponível para este pagamento hoje. Tente agendar para o próximo dia útil.";
                }
                toast({ variant: 'destructive', title: 'Erro ao Iniciar Pagamento', description: errorMsg });
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
    
    const handleIssueInvoice = async (accessToken: string, requestBody: CoraInvoiceRequestBody, type: 'boleto' | 'pix') => {
        const isBoleto = type === 'boleto';
        if (isBoleto) {
            setIsIssuingBoleto(true);
            setBoletoResult(null);
            setIssuingBoletoError(null);
        } else {
            setIsIssuingPix(true);
            setPixResult(null);
            setIssuingPixError(null);
        }
        
        const result = await issueInvoice(accessToken, requestBody);
        
        if (result.error) {
            if (isBoleto) setIssuingBoletoError(result.error);
            else setIssuingPixError(result.error);

            if (result.isTokenError) {
                await handleRefreshToken((newAccessToken) => handleIssueInvoice(newAccessToken, requestBody, type));
            } else {
                if (isBoleto) setIsIssuingBoleto(false);
                else setIsIssuingPix(false);
            }
        } else if (result.data) {
            if (isBoleto) {
                setBoletoResult(result.data);
                toast({ title: 'Boleto Emitido!', description: 'O boleto foi gerado e está pronto para ser pago.' });
                setIsIssuingBoleto(false);
            } else {
                setPixResult(result.data);
                toast({ title: 'QR Code Gerado!', description: 'O QR Code Pix está pronto para ser usado.' });
                setIsIssuingPix(false);
            }
        } else {
            const errorMsg = 'Não foi possível emitir a cobrança. A API retornou uma resposta inesperada.';
            if (isBoleto) {
                setIssuingBoletoError(errorMsg);
                setIsIssuingBoleto(false);
            } else {
                setIssuingPixError(errorMsg);
                setIsIssuingPix(false);
            }
        }
    };
    
    const onBoletoSubmit = (values: z.infer<typeof invoiceFormSchema>) => {
        const sanitizedDocument = values.customerDocument.replace(/\D/g, '');
        const sanitizedZipCode = values.customerAddressZipCode.replace(/\D/g, '');

        const requestBody: CoraInvoiceRequestBody = {
            code: `boleto-teste-${uuidv4().substring(0, 8)}`,
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
                    complement: values.customerAddressComplement || undefined,
                }
            },
            services: [{
                name: "Serviço Prestado",
                description: values.serviceDescription,
                amount: Math.round(values.amount * 100),
            }],
            payment_terms: {
                due_date: format(values.dueDate, 'yyyy-MM-dd'),
            },
            payment_forms: ["BANK_SLIP"]
        };
        
        handleIssueInvoice(token.accessToken, requestBody, 'boleto');
    }
    
    const onPixSubmit = (values: z.infer<typeof invoiceFormSchema>) => {
        const sanitizedDocument = values.customerDocument.replace(/\D/g, '');
        const sanitizedZipCode = values.customerAddressZipCode.replace(/\D/g, '');
        
        const requestBody: CoraInvoiceRequestBody = {
            code: `pix-teste-${uuidv4().substring(0, 8)}`,
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
                    complement: values.customerAddressComplement || undefined,
                }
            },
            services: [{
                name: "Serviço Cobrado via Pix",
                description: values.serviceDescription,
                amount: Math.round(values.amount * 100),
            }],
            payment_terms: {
                due_date: format(values.dueDate, 'yyyy-MM-dd'),
            },
            payment_forms: ['PIX']
        };
        handleIssueInvoice(token.accessToken, requestBody, 'pix');
    }

    const isLoading = isBalanceLoading || isAccountDataLoading || isStatementLoading || isInitiatingPayment || isIssuingBoleto || isIssuingPix;

    const currentBoletoData = boletoResult?.bank_slip || boletoResult?.payment_options?.bank_slip;
    const currentPixEMV = pixResult?.pix?.emv || (pixResult as any)?.payment_options?.pix?.emv;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Painel Administrativo Cora</CardTitle>
                <CardDescription>Sua conta está conectada. Use as abas abaixo para gerenciar ou testar a integração.</CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="v2">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="v2">Ações da Conta</TabsTrigger>
                        <TabsTrigger value="new_tests">Fluxo de Teste Guiado</TabsTrigger>
                    </TabsList>
                    <TabsContent value="v2" className="mt-4 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="rounded-md border p-4 space-y-2 bg-muted/10">
                                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                    <Badge variant="outline" className="bg-primary/10">Saldo</Badge>
                                </h3>
                                {balance === null ? (
                                    <p className="text-muted-foreground text-xs italic">Clique para verificar o saldo atual.</p>
                                ) : (
                                    <p className="text-2xl font-bold text-primary font-mono">{formatCurrency(balance)}</p>
                                )}
                                <Button size="sm" variant="secondary" className="w-full" onClick={() => handleGetBalance(token.accessToken)} disabled={isLoading}>
                                    {isBalanceLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {isBalanceLoading ? 'Buscando...' : 'Atualizar Saldo'}
                                </Button>
                            </div>
                            
                            <div className="rounded-md border p-4 space-y-2 bg-muted/10">
                                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                    <Badge variant="outline" className="bg-primary/10">Dados Bancários</Badge>
                                </h3>
                                {accountData ? (
                                    <div className="text-xs space-y-1 font-mono">
                                        <p><span className="text-muted-foreground">BANCO:</span> {accountData.bankName}</p>
                                        <p><span className="text-muted-foreground">AG/CC:</span> {accountData.agency} / {accountData.accountNumber}-{accountData.accountDigit}</p>
                                    </div>
                                ) : (
                                    <p className="text-muted-foreground text-xs italic">Verifique os detalhes da conta.</p>
                                )}
                                <Button size="sm" variant="secondary" className="w-full" onClick={() => handleGetAccountData(token.accessToken)} disabled={isLoading}>
                                    {isAccountDataLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {isAccountDataLoading ? 'Buscando...' : 'Ver Detalhes'}
                                </Button>
                            </div>
                        </div>

                        <div className="rounded-md border p-4 space-y-4">
                            <h3 className="font-semibold flex items-center gap-2 text-primary">
                                <ArrowRightLeft className="h-4 w-4" /> Extrato da Conta
                            </h3>
                            <div className="flex flex-col sm:flex-row gap-2">
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
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
                                                            <span className="font-medium text-xs sm:text-sm">{entry.transaction?.description ?? 'N/A'}</span>
                                                            <span className="text-[10px] text-muted-foreground">{entry.transaction?.counterParty?.name ?? ''}</span>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className={`text-right font-mono font-bold ${entry.type === 'CREDIT' ? 'text-emerald-500' : 'text-red-500'}`}>
                                                    {formatCurrencyFromCents(entry.amount)}
                                                </TableCell>
                                            </TableRow>
                                        )})}
                                    </TableBody>
                                </Table>
                                ) : (
                                    <p className="text-muted-foreground text-center p-4 italic text-sm">Nenhuma transação no período.</p>
                                )
                            )}
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <Card>
                                <CardHeader className="pb-4">
                                    <CardTitle className="text-lg flex items-center gap-2"><Barcode className="h-5 w-5 text-primary" /> Emissão de Boleto</CardTitle>
                                    <CardDescription>Gere um boleto registrado para cobrança.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Form {...boletoForm}>
                                        <form onSubmit={boletoForm.handleSubmit(onBoletoSubmit)} className="space-y-4">
                                            <FormField control={boletoForm.control} name="customerName" render={({ field }) => (
                                                <FormItem><FormLabel>Nome do Cliente</FormLabel><FormControl><Input placeholder="Ex: João da Silva" {...field} /></FormControl><FormMessage /></FormItem>
                                            )} />
                                            <div className="grid grid-cols-2 gap-2">
                                                <FormField control={boletoForm.control} name="customerDocument" render={({ field }) => (
                                                    <FormItem><FormLabel>CPF/CNPJ</FormLabel><FormControl><Input placeholder="Somente números" {...field} /></FormControl><FormMessage /></FormItem>
                                                )} />
                                                <FormField control={boletoForm.control} name="amount" render={({ field }) => (
                                                    <FormItem><FormLabel>Valor (R$)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                                                )} />
                                            </div>
                                            <FormField control={boletoForm.control} name="serviceDescription" render={({ field }) => (
                                                <FormItem><FormLabel>Descrição do Serviço</FormLabel><FormControl><Input placeholder="Ex: Honorários Médicos" {...field} /></FormControl><FormMessage /></FormItem>
                                            )} />
                                            <FormField control={boletoForm.control} name="dueDate" render={({ field }) => (
                                                <FormItem className="flex flex-col">
                                                    <FormLabel>Vencimento</FormLabel>
                                                    <Popover modal>
                                                        <PopoverTrigger asChild>
                                                            <Button variant="outline" className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                                                {field.value ? format(field.value, "PPP", { locale: ptBR }) : <span>Selecione</span>}
                                                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                            </Button>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date < startOfToday()} initialFocus locale={ptBR} /></PopoverContent>
                                                    </Popover>
                                                    <FormMessage />
                                                </FormItem>
                                            )} />
                                            <Button type="submit" className="w-full" disabled={isLoading}>
                                                {isIssuingBoleto ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Emitindo...</> : 'Emitir Boleto'}
                                            </Button>
                                        </form>
                                    </Form>
                                    {boletoResult && (
                                        <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-md text-xs space-y-2">
                                            <p className="font-bold text-emerald-700 flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Boleto Gerado!</p>
                                            {currentBoletoData?.url && (
                                                <Button size="sm" variant="outline" asChild className="w-full h-7 text-[10px]"><a href={currentBoletoData.url} target="_blank" rel="noopener noreferrer">Ver PDF</a></Button>
                                            )}
                                        </div>
                                    )}
                                    {issuingBoletoError && <Alert variant="destructive" className="mt-4 py-2 px-3 text-xs"><AlertDescription>{issuingBoletoError}</AlertDescription></Alert>}
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="pb-4">
                                    <CardTitle className="text-lg flex items-center gap-2"><QrCode className="h-5 w-5 text-primary" /> Cobrança Pix</CardTitle>
                                    <CardDescription>Gere um QR Code Pix para recebimento.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Form {...pixForm}>
                                        <form onSubmit={pixForm.handleSubmit(onPixSubmit)} className="space-y-4">
                                            <FormField control={pixForm.control} name="customerName" render={({ field }) => (
                                                <FormItem><FormLabel>Nome do Pagador</FormLabel><FormControl><Input placeholder="Ex: Maria Santos" {...field} /></FormControl><FormMessage /></FormItem>
                                            )} />
                                            <div className="grid grid-cols-2 gap-2">
                                                <FormField control={pixForm.control} name="customerDocument" render={({ field }) => (
                                                    <FormItem><FormLabel>CPF/CNPJ</FormLabel><FormControl><Input placeholder="Somente números" {...field} /></FormControl><FormMessage /></FormItem>
                                                )} />
                                                <FormField control={pixForm.control} name="amount" render={({ field }) => (
                                                    <FormItem><FormLabel>Valor (R$)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                                                )} />
                                            </div>
                                            <FormField control={pixForm.control} name="serviceDescription" render={({ field }) => (
                                                <FormItem><FormLabel>Identificador/Dedução</FormLabel><FormControl><Input placeholder="Ex: Consulta Outubro" {...field} /></FormControl><FormMessage /></FormItem>
                                            )} />
                                            <Button type="submit" variant="secondary" className="w-full" disabled={isLoading}>
                                                {isIssuingPix ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Gerando...</> : 'Gerar QR Code Pix'}
                                            </Button>
                                        </form>
                                    </Form>
                                    {pixResult && (
                                        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md text-xs space-y-2">
                                            <p className="font-bold text-blue-700 flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Pix Gerado!</p>
                                            {currentPixEMV && (
                                                <div className="space-y-1">
                                                    <p className="text-[9px] font-mono break-all bg-white p-1 border rounded">{currentPixEMV}</p>
                                                    <Button size="sm" variant="ghost" className="w-full h-6 text-[9px]" onClick={() => copyToClipboard(currentPixEMV, 'Copia e Cola copiado!')}><Copy className="mr-1 h-3 w-3"/> Copiar Código Pix</Button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {issuingPixError && <Alert variant="destructive" className="mt-4 py-2 px-3 text-xs"><AlertDescription>{issuingPixError}</AlertDescription></Alert>}
                                </CardContent>
                            </Card>
                        </div>

                        <div className="rounded-md border p-4 space-y-4">
                            <h3 className="font-semibold flex items-center gap-2 text-primary">
                                <Barcode className="h-4 w-4" /> Pagamento de Boleto Manual
                            </h3>
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
                                            <Popover modal>
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
                                                        <span>Hoje (Imediato)</span>
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
                                                    disabled={(date) => date < startOfToday()}
                                                    initialFocus
                                                    locale={ptBR}
                                                />
                                                </PopoverContent>
                                            </Popover>
                                            <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <Button type="submit" disabled={isLoading} className="w-full">
                                        {isInitiatingPayment && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        {isInitiatingPayment ? 'Iniciando...' : 'Iniciar Pagamento'}
                                    </Button>
                                </form>
                            </Form>
                            {paymentResult && (
                                <div className="rounded-lg border bg-emerald-50 dark:bg-emerald-950/30 p-4 space-y-2 mt-4 border-emerald-200">
                                    <p className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                                        <CheckCircle className="h-4 w-4" /> Pagamento Iniciado!
                                    </p>
                                    <p className="text-xs text-muted-foreground">Aprove a transação no seu aplicativo Cora para concluir.</p>
                                </div>
                            )}
                        </div>
                    </TabsContent>
                    <TabsContent value="new_tests" className="mt-4">
                        <GuidedTestFlow mainToken={token} onDisconnect={() => {
                            if (user && firestore) {
                                const tokenDocRef = doc(firestore, 'users', user.uid, 'coraTokens', 'cora-token');
                                deleteDocumentNonBlocking(tokenDocRef);
                                toast({ title: 'Conta Desconectada', description: 'Você pode conectar outra conta agora.'});
                            }
                        }} />
                    </TabsContent>
                </Tabs>
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
    return <div className="flex h-[400px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-headline text-3xl font-bold tracking-tight text-primary">
          API BANK (BETA)
        </h1>
        <p className="text-muted-foreground">
          Conecte suas contas e automatize suas finanças com a Cora.
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
