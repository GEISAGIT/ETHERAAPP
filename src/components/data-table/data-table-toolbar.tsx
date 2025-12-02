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


interface DataTableToolbarProps {
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  filterType: 'all' | 'income' | 'expense';
  onFilterTypeChange: (value: 'all' | 'income' | 'expense') => void;
  filterCategory: string;
  onFilterCategoryChange: (value: string) => void;
  allCategories: string[];
  filterDate: Date | undefined;
  onFilterDateChange: (date: Date | undefined) => void;
}

export function DataTableToolbar({
  searchTerm,
  onSearchTermChange,
  filterType,
  onFilterTypeChange,
  filterCategory,
  onFilterCategoryChange,
  allCategories,
  filterDate,
  onFilterDateChange
}: DataTableToolbarProps) {

  const isFiltered = searchTerm !== '' || filterType !== 'all' || filterCategory !== 'all' || filterDate !== undefined;

  const clearFilters = () => {
    onSearchTermChange('');
    onFilterTypeChange('all');
    onFilterCategoryChange('all');
    onFilterDateChange(undefined);
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
                variant={"outline"}
                className={cn(
                    "w-full justify-start text-left font-normal sm:w-auto",
                    !filterDate && "text-muted-foreground"
                )}
                >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filterDate ? format(filterDate, "PPP", { locale: ptBR }) : <span>Filtrar por data</span>}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
                <Calendar
                mode="single"
                selected={filterDate}
                onSelect={onFilterDateChange}
                initialFocus
                locale={ptBR}
                />
            </PopoverContent>
        </Popover>
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
