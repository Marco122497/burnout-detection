"use client";

import { Field, FieldLabel } from "@/components/ui/field";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const DEFAULT_PAGE_SIZES = [10, 25, 50, 100] as const;

export function TablePagination({
  page,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = DEFAULT_PAGE_SIZES,
  id = "select-rows-per-page",
  className,
}: {
  page: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  pageSizeOptions?: readonly number[];
  id?: string;
  className?: string;
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize) || 1);
  const canPrevious = page > 1;
  const canNext = page < totalPages;

  return (
    <div
      className={cn(
        "flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between",
        className
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 sm:justify-start">
        <Field orientation="horizontal" className="w-fit">
          <FieldLabel htmlFor={id} className="whitespace-nowrap">
            Rows per page
          </FieldLabel>
          <Select
            value={String(pageSize)}
            onValueChange={(value) => {
              if (value == null) return;
              onPageSizeChange(Number(value));
            }}
          >
            <SelectTrigger className="w-20" id={id}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="start">
              <SelectGroup>
                {pageSizeOptions.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
        <p className="text-xs text-muted-foreground tabular-nums sm:hidden">
          Page {page} of {totalPages}
        </p>
      </div>
      <Pagination className="mx-0 w-full justify-between sm:w-auto sm:justify-end">
        <PaginationContent className="w-full justify-between gap-2 sm:w-auto sm:justify-end">
          <PaginationItem>
            <PaginationPrevious
              href="#"
              aria-disabled={!canPrevious}
              className={cn(
                !canPrevious && "pointer-events-none opacity-50"
              )}
              onClick={(event) => {
                event.preventDefault();
                if (canPrevious) onPageChange(page - 1);
              }}
            />
          </PaginationItem>
          <PaginationItem className="hidden sm:list-item">
            <span className="px-2 text-xs text-muted-foreground tabular-nums">
              Page {page} of {totalPages}
            </span>
          </PaginationItem>
          <PaginationItem>
            <PaginationNext
              href="#"
              aria-disabled={!canNext}
              className={cn(!canNext && "pointer-events-none opacity-50")}
              onClick={(event) => {
                event.preventDefault();
                if (canNext) onPageChange(page + 1);
              }}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
