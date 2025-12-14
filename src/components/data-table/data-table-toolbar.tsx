'use client';

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { CalendarIcon, X } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn } from "@/lib/utils"
import type { DateRange } from "react-day-picker";


interface DataTableToolbarProps {
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  filterType: 'all' | 'income' | 'expense';
  onFilterTypeChange: (value: 'all' | 'income' | 'expense') => void;
  filterCostType: 'all' | 'fixed' | 'variable';
  onFilterCostTypeChange: (value: 'all' | 'fixed' | 'variable') => void;
  filterCategory: string;
  onFilterCategoryChange: (value: string) => void;
  allCategories: string[];
  filterDate: DateRange | undefined;
  onFilterDateChange: (date: DateRange | undefined) => void;
  sortOrder: 'asc' | 'desc';
  onSortOrderChange: (value: 'asc' | 'desc') => void;
}

export function DataTableToolbar({
  searchTerm,
  onSearchTermChange,
  filterType,
  onFilterTypeChange,
  filterCostType,
  onFilterCostTypeChange,
  filterCategory,
  onFilterCategoryChange,
  allCategories,
  filterDate,
  onFilterDateChange,
  sortOrder,
  onSortOrderChange
}: DataTableToolbarProps) {

  const isFiltered = searchTerm !== '' || filterType !== 'all' || filterCategory !== 'all' || filterDate !== undefined || filterCostType !== 'all';

  const clearFilters = () => {
    onSearchTermChange('');
    onFilterTypeChange('all');
    onFilterCategoryChange('all');
    onFilterDateChange(undefined);
    onFilterCostTypeChange('all');
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="flex flex-1 flex-col sm:flex-row items-center gap-2 w-full">
        <Input
          placeholder="Filtrar por descrição..."
          value={searchTerm}
          onChange={(event) => onSearchTermChange(event.target.value)}
          className="w-full sm:max-w-sm"
        />
        <div className="grid grid-cols-2 sm:flex sm:flex-row gap-2 w-full sm:w-auto">
            <Select value={filterType} onValueChange={onFilterTypeChange}>
                <SelectTrigger className="w-full">
                    <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Todos os Tipos</SelectItem>
                    <SelectItem value="income">Receita</SelectItem>
                    <SelectItem value="expense">Despesa</SelectItem>
                </SelectContent>
            </Select>
            {filterType === 'expense' && (
              <Select value={filterCostType} onValueChange={onFilterCostTypeChange}>
                <SelectTrigger className="w-full">
                    <SelectValue placeholder="Tipo de Custo" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Todos os Custos</SelectItem>
                    <SelectItem value="fixed">Fixo</SelectItem>
                    <SelectItem value="variable">Variável</SelectItem>
                </SelectContent>
              </Select>
            )}
            <Select value={filterCategory} onValueChange={onFilterCategoryChange}>
                <SelectTrigger className="w-full">
                    <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                    {allCategories.map(category => (
                        <SelectItem key={category} value={category}>
                            {category === 'all' ? 'Todas as Categorias' : category}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              id="date"
              variant={"outline"}
              className={cn(
                "w-full justify-start text-left font-normal sm:w-auto",
                !filterDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {filterDate?.from ? (
                filterDate.to ? (
                  <>
                    {format(filterDate.from, "LLL dd, y", { locale: ptBR })} -{" "}
                    {format(filterDate.to, "LLL dd, y", { locale: ptBR })}
                  </>
                ) : (
                  format(filterDate.from, "LLL dd, y", { locale: ptBR })
                )
              ) : (
                <span>Selecione o período</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={filterDate?.from}
              selected={filterDate}
              onSelect={onFilterDateChange}
              numberOfMonths={2}
              locale={ptBR}
            />
          </PopoverContent>
        </Popover>
         <Select value={sortOrder} onValueChange={onSortOrderChange}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Ordenar por" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="desc">Mais Recentes</SelectItem>
            <SelectItem value="asc">Mais Antigas</SelectItem>
          </SelectContent>
        </Select>
        {isFiltered && (
            <Button variant="ghost" onClick={clearFilters} className="h-8 px-2 lg:px-3">
                Limpar
                <X className="ml-2 h-4 w-4" />
            </Button>
        )}
      </div>
    </div>
  )
}
