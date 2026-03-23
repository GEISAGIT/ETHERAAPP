'use client';

import { Button } from '@/components/ui/button';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';

interface DataTablePaginationProps {
  pageIndex: number;
  pageCount: number;
  setPageIndex: (index: number) => void;
  canPreviousPage: boolean;
  canNextPage: boolean;
}

export function DataTablePagination({
  pageIndex,
  pageCount,
  setPageIndex,
  canPreviousPage,
  canNextPage,
}: DataTablePaginationProps) {
  return (
    <div className="flex items-center justify-between px-2">
      <div className="flex-1 text-sm text-muted-foreground">
        Página {pageIndex + 1} de {pageCount}
      </div>
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          className="hidden h-8 w-8 p-0 lg:flex"
          onClick={() => setPageIndex(0)}
          disabled={!canPreviousPage}
        >
          <span className="sr-only">Ir para a primeira página</span>
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          className="h-8 w-8 p-0"
          onClick={() => setPageIndex(pageIndex - 1)}
          disabled={!canPreviousPage}
        >
          <span className="sr-only">Ir para a página anterior</span>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          className="h-8 w-8 p-0"
          onClick={() => setPageIndex(pageIndex + 1)}
          disabled={!canNextPage}
        >
          <span className="sr-only">Ir para a próxima página</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          className="hidden h-8 w-8 p-0 lg:flex"
          onClick={() => setPageIndex(pageCount - 1)}
          disabled={!canNextPage}
        >
          <span className="sr-only">Ir para a última página</span>
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
