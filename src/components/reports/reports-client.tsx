'use client';
import type { Transaction, ExpenseTransaction } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, Sector } from 'recharts';
import { useMemo, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '../ui/table';
import { Skeleton } from '../ui/skeleton';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from '../ui/breadcrumb';
import { cn } from '@/lib/utils';


const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };
  
const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  '#82ca9d',
  '#ffc658'
];

type ChartData = { name: string; value: number };

const renderActiveShape = (props: any) => {
  const RADIAN = Math.PI / 180;
  const { cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent } = props;
  const sin = Math.sin(-RADIAN * midAngle);
  const cos = Math.cos(-RADIAN * midAngle);
  const sx = cx + (outerRadius + 10) * cos;
  const sy = cy + (outerRadius + 10) * sin;
  const mx = cx + (outerRadius + 30) * cos;
  const my = cy + (outerRadius + 30) * sin;
  const ex = mx + (cos >= 0 ? 1 : -1) * 22;
  const ey = my;
  const textAnchor = cos >= 0 ? 'start' : 'end';

  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 6}
        outerRadius={outerRadius + 10}
        fill={fill}
      />
      <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" />
      <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
      <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} textAnchor={textAnchor} fill="hsl(var(--foreground))" className="text-xs truncate">{`${payload.name}`}</text>
      <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} dy={18} textAnchor={textAnchor} fill="hsl(var(--muted-foreground))" className="text-sm">
        {`${(percent * 100).toFixed(2)}%`}
      </text>
    </g>
  );
};


export function ReportsClient({ data, isLoading }: { data: Transaction[], isLoading: boolean }) {
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);


  const { totalIncome, totalExpenses, netProfit, expensesByGroup } = useMemo(() => {
    let totalIncome = 0;
    let totalExpenses = 0;
    const expensesByGroup: { [group: string]: { total: number, categories: { [category: string]: { total: number, descriptions: { [description: string]: number } } } } } = {};

    data.forEach(t => {
      if (t.type === 'income') {
        totalIncome += t.amount;
      } else if (t.type === 'expense') {
        totalExpenses += t.amount;
        const expense = t as ExpenseTransaction;
        const groupName = expense.fullCategoryPath?.group || 'Sem Grupo';
        const categoryName = expense.fullCategoryPath?.category || 'Sem Categoria';
        const descriptionName = expense.fullCategoryPath?.description || 'Sem Descrição';

        if (!expensesByGroup[groupName]) {
            expensesByGroup[groupName] = { total: 0, categories: {} };
        }
        expensesByGroup[groupName].total += expense.amount;
        
        if (!expensesByGroup[groupName].categories[categoryName]) {
            expensesByGroup[groupName].categories[categoryName] = { total: 0, descriptions: {} };
        }
        expensesByGroup[groupName].categories[categoryName].total += expense.amount;

        if (!expensesByGroup[groupName].categories[categoryName].descriptions[descriptionName]) {
            expensesByGroup[groupName].categories[categoryName].descriptions[descriptionName] = 0;
        }
        expensesByGroup[groupName].categories[categoryName].descriptions[descriptionName] += expense.amount;
      }
    });

    return { totalIncome, totalExpenses, netProfit: totalIncome - totalExpenses, expensesByGroup };

  }, [data]);
  
  const chartData: ChartData[] = useMemo(() => {
    if (selectedGroup && selectedCategory) {
        // Level 3: Descriptions for a category
        const descriptions = expensesByGroup[selectedGroup]?.categories[selectedCategory]?.descriptions || {};
        return Object.entries(descriptions).map(([name, value]) => ({ name, value }));
    } else if (selectedGroup) {
        // Level 2: Categories for a group
        const categories = expensesByGroup[selectedGroup]?.categories || {};
        return Object.entries(categories).map(([name, data]) => ({ name, value: data.total }));
    } else {
        // Level 1: Groups
        return Object.entries(expensesByGroup).map(([name, data]) => ({ name, value: data.total }));
    }
  }, [selectedGroup, selectedCategory, expensesByGroup]);

  const handlePieClick = (data: any, index: number) => {
    if (!data.name) return;
    if (selectedGroup && !selectedCategory) {
        setSelectedCategory(data.name);
    } else if (!selectedGroup) {
        setSelectedGroup(data.name);
    }
  };

  const handleBreadcrumbClick = (level: 'root' | 'group') => {
    if (level === 'root') {
        setSelectedGroup(null);
        setSelectedCategory(null);
    } else if (level === 'group') {
        setSelectedCategory(null);
    }
    setActiveIndex(0); // Reset active pie slice
  };

  if (isLoading) {
    return (
        <div className="space-y-8">
            <header>
                <Skeleton className="h-9 w-80" />
                <Skeleton className="h-5 w-96 mt-2" />
            </header>
            <div className="grid grid-cols-1 gap-8">
                <Skeleton className="h-56" />
                <Skeleton className="h-[450px]" />
            </div>
        </div>
    )
  }

  const currentTitle = selectedCategory 
    ? `Detalhes de: ${selectedCategory}` 
    : selectedGroup 
    ? `Detalhes de: ${selectedGroup}`
    : 'Despesas por Grupo';


  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-headline text-3xl font-bold tracking-tight">
          Relatórios Financeiros
        </h1>
        <p className="text-muted-foreground">
          Analise o desempenho financeiro da sua clínica.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Resumo de Lucros e Perdas</CardTitle>
          <CardDescription>Um resumo de suas receitas e despesas totais.</CardDescription>
        </CardHeader>
        <CardContent>
         {data.length === 0 ? (
              <div className="flex h-32 items-center justify-center">
                  <p className="text-muted-foreground">Nenhum dado para exibir.</p>
              </div>
         ) : (
          <Table>
              <TableHeader>
                  <TableRow>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
              </TableHeader>
              <TableBody>
                  <TableRow>
                      <TableCell className="font-medium">Receita Total</TableCell>
                      <TableCell className="text-right text-emerald-600 dark:text-emerald-400">{formatCurrency(totalIncome)}</TableCell>
                  </TableRow>
                  <TableRow>
                      <TableCell className="font-medium">Despesa Total</TableCell>
                      <TableCell className="text-right">{formatCurrency(totalExpenses)}</TableCell>
                  </TableRow>
              </TableBody>
              <TableFooter>
                  <TableRow>
                      <TableHead>Lucro Líquido</TableHead>
                      <TableHead className={`text-right ${netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>{formatCurrency(netProfit)}</TableHead>
                  </TableRow>
              </TableFooter>
          </Table>
         )}
        </CardContent>
      </Card>
        
      <Card>
        <CardHeader>
            <CardTitle className="font-headline">{currentTitle}</CardTitle>
            <Breadcrumb>
                <BreadcrumbList>
                    <BreadcrumbItem>
                        <BreadcrumbLink onClick={() => handleBreadcrumbClick('root')} className="cursor-pointer">Todos os Grupos</BreadcrumbLink>
                    </BreadcrumbItem>
                    {selectedGroup && (
                        <>
                            <BreadcrumbSeparator />
                            <BreadcrumbItem>
                                {selectedCategory ? (
                                    <BreadcrumbLink onClick={() => handleBreadcrumbClick('group')} className="cursor-pointer">{selectedGroup}</BreadcrumbLink>
                                ) : (
                                    <span>{selectedGroup}</span>
                                )}
                            </BreadcrumbItem>
                        </>
                    )}
                    {selectedCategory && (
                        <>
                            <BreadcrumbSeparator />
                            <BreadcrumbItem>
                                <span>{selectedCategory}</span>
                            </BreadcrumbItem>
                        </>
                    )}
                </BreadcrumbList>
            </Breadcrumb>
        </CardHeader>
        <CardContent>
            {chartData.length === 0 ? (
                 <div className="flex h-60 items-center justify-center">
                    <p className="text-muted-foreground">Nenhuma despesa registrada para esta seleção.</p>
                </div>
            ) : (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                    <div className='h-[350px] w-full'>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={100}
                            innerRadius={60}
                            fill="#8884d8"
                            dataKey="value"
                            nameKey="name"
                            onClick={handlePieClick}
                            activeIndex={activeIndex}
                            activeShape={renderActiveShape}
                            onMouseEnter={(_, index) => setActiveIndex(index)}
                          >
                            {chartData.map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={COLORS[index % COLORS.length]} 
                                className={cn("cursor-pointer focus:outline-none", {
                                    'cursor-default': !!selectedCategory
                                })}
                               />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                                backgroundColor: 'hsl(var(--background))',
                                borderColor: 'hsl(var(--border))',
                            }}
                            formatter={(value: number) => formatCurrency(value)}
                          />
                           <Legend 
                            layout="vertical" 
                            align="right" 
                            verticalAlign="middle" 
                            wrapperStyle={{ lineHeight: '24px' }}
                            formatter={(value, entry) => <span className="text-muted-foreground">{value}</span>}
                           />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="text-sm">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Item</TableHead>
                            <TableHead>Percentual</TableHead>
                            <TableHead className="text-right">Valor</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {chartData.sort((a,b) => b.value - a.value).map(item => {
                            const total = chartData.reduce((acc, curr) => acc + curr.value, 0);
                            const percentage = total > 0 ? (item.value / total) * 100 : 0;
                            return (
                                <TableRow key={item.name}>
                                    <TableCell className="font-medium truncate max-w-40">{item.name}</TableCell>
                                    <TableCell>{percentage.toFixed(2)}%</TableCell>
                                    <TableCell className="text-right">{formatCurrency(item.value)}</TableCell>
                                </TableRow>
                            );
                           })}
                        </TableBody>
                        <TableFooter>
                            <TableRow>
                                <TableHead colSpan={2}>Total</TableHead>
                                <TableHead className="text-right">
                                    {formatCurrency(chartData.reduce((acc, curr) => acc + curr.value, 0))}
                                </TableHead>
                            </TableRow>
                        </TableFooter>
                      </Table>
                    </div>
                 </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
