'use client';

import * as React from 'react';
import { ChevronDown, ChevronsUpDown, ChevronUp } from 'lucide-react';
import { cn, formatPersianNumber } from '@agahiram/shared';
import { Button, EmptyState, Skeleton } from '@agahiram/ui';

export type SortDir = 'asc' | 'desc';

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  /** Cell renderer. Receives row, returns ReactNode. */
  cell: (row: T) => React.ReactNode;
  /** Enable column sorting (caller is responsible for actually sorting). */
  sortable?: boolean;
  /** Show only at md+ widths. */
  hideOnMobile?: boolean;
  align?: 'start' | 'center' | 'end';
  width?: string;
}

export interface DataTableProps<T> {
  columns: Array<Column<T>>;
  rows: T[];
  rowKey: (row: T) => string;
  isLoading?: boolean;
  emptyTitle?: React.ReactNode;
  emptyDescription?: React.ReactNode;
  emptyIcon?: React.ReactNode;
  emptyAction?: React.ReactNode;
  /** Sort state (controlled). */
  sort?: { key: string; dir: SortDir } | null;
  onSortChange?: (sort: { key: string; dir: SortDir } | null) => void;
  /** Pagination (controlled). Caller handles slicing. */
  page?: number;
  pageSize?: number;
  total?: number;
  onPageChange?: (page: number) => void;
  /** Optional row click handler. */
  onRowClick?: (row: T) => void;
  className?: string;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  isLoading,
  emptyTitle = 'موردی یافت نشد',
  emptyDescription,
  emptyIcon,
  emptyAction,
  sort,
  onSortChange,
  page = 1,
  pageSize,
  total,
  onPageChange,
  onRowClick,
  className,
}: DataTableProps<T>) {
  const totalPages = total && pageSize ? Math.max(1, Math.ceil(total / pageSize)) : 1;

  const toggleSort = (key: string) => {
    if (!onSortChange) return;
    if (!sort || sort.key !== key) onSortChange({ key, dir: 'desc' });
    else if (sort.dir === 'desc') onSortChange({ key, dir: 'asc' });
    else onSortChange(null);
  };

  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border border-border bg-surface shadow-card',
        className,
      )}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              {columns.map((col) => {
                const isSorted = sort?.key === col.key;
                return (
                  <th
                    key={col.key}
                    scope="col"
                    aria-sort={
                      isSorted ? (sort?.dir === 'asc' ? 'ascending' : 'descending') : 'none'
                    }
                    style={col.width ? { width: col.width } : undefined}
                    className={cn(
                      'py-2.5 px-3 font-medium text-start',
                      col.align === 'center' && 'text-center',
                      col.align === 'end' && 'text-end',
                      col.hideOnMobile && 'hidden md:table-cell',
                    )}
                  >
                    {col.sortable && onSortChange ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(col.key)}
                        className="inline-flex items-center gap-1 rounded text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {col.header}
                        {isSorted ? (
                          sort?.dir === 'asc' ? (
                            <ChevronUp className="size-3.5" aria-hidden />
                          ) : (
                            <ChevronDown className="size-3.5" aria-hidden />
                          )
                        ) : (
                          <ChevronsUpDown className="size-3.5 opacity-50" aria-hidden />
                        )}
                      </button>
                    ) : (
                      col.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: pageSize ?? 8 }).map((_, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  {columns.map((col, ci) => (
                    <td
                      key={col.key + ci}
                      className={cn('py-3 px-3', col.hideOnMobile && 'hidden md:table-cell')}
                    >
                      <Skeleton className="h-4 w-full max-w-[120px] rounded-md" />
                    </td>
                  ))}
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>
                  <EmptyState
                    size="md"
                    icon={emptyIcon}
                    title={emptyTitle}
                    description={emptyDescription}
                    action={emptyAction}
                  />
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => (
                <tr
                  key={rowKey(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn(
                    'border-b border-border last:border-0',
                    idx % 2 === 1 && 'bg-muted/20',
                    onRowClick && 'cursor-pointer hover:bg-muted/40 focus-within:bg-muted/40',
                  )}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        'py-3 px-3 align-middle',
                        col.align === 'center' && 'text-center',
                        col.align === 'end' && 'text-end',
                        col.hideOnMobile && 'hidden md:table-cell',
                      )}
                    >
                      {col.cell(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pageSize && total != null && total > 0 ? (
        <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm">
          <div className="text-muted-foreground">
            نمایش {formatPersianNumber((page - 1) * pageSize + 1)}–
            {formatPersianNumber(Math.min(page * pageSize, total))} از {formatPersianNumber(total)}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => onPageChange?.(Math.max(1, page - 1))}
            >
              قبلی
            </Button>
            <span className="text-muted-foreground">
              صفحه {formatPersianNumber(page)} از {formatPersianNumber(totalPages)}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => onPageChange?.(Math.min(totalPages, page + 1))}
            >
              بعدی
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
