"use client";

import * as React from "react";
import { Fragment } from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { cn } from "@/lib/utils";

type DataTableColumnMeta = {
  headerClassName?: string;
  cellClassName?: string;
  mobileHidden?: boolean;
  mobileLabel?: string;
};

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchKey?: string;
  searchPlaceholder?: string;
  filterComponent?: React.ReactNode;
  actionComponent?: React.ReactNode;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchPlaceholder = "Search...",
  filterComponent,
  actionComponent,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [expandedRowId, setExpandedRowId] = React.useState<string | null>(null);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    state: { sorting, columnFilters },
  });

  React.useEffect(() => {
    setExpandedRowId(null);
  }, [data]);

  function getColumnMeta(column: ColumnDef<TData, TValue> | ReturnType<typeof table.getAllColumns>[number]["columnDef"]) {
    return column.meta as DataTableColumnMeta | undefined;
  }

  function getCellLabel(cell: ReturnType<(typeof table)["getRowModel"]>["rows"][number]["getVisibleCells"] extends () => infer T ? T extends Array<infer Cell> ? Cell : never : never) {
    const meta = cell.column.columnDef.meta as DataTableColumnMeta | undefined;
    if (meta?.mobileLabel) return meta.mobileLabel;
    if (typeof cell.column.columnDef.header === "string") return cell.column.columnDef.header;
    return cell.column.id.replace(/_/g, " ");
  }

  function shouldToggleRow(target: EventTarget | null) {
    if (!(target instanceof HTMLElement)) return true;
    return !target.closest("button,a,input,select,textarea,label,[role='button']");
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {searchKey && (
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={searchPlaceholder}
                value={(table.getColumn(searchKey)?.getFilterValue() as string) ?? ""}
                onChange={(e) => table.getColumn(searchKey)?.setFilterValue(e.target.value)}
                className="h-9 pl-9 text-sm"
              />
            </div>
          )}
          {filterComponent}
        </div>
        {actionComponent}
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={cn(
                      getColumnMeta(header.column.columnDef)?.headerClassName,
                      getColumnMeta(header.column.columnDef)?.mobileHidden && "hidden md:table-cell"
                    )}
                  >
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => {
                const hiddenCells = row
                  .getVisibleCells()
                  .filter((cell) => (cell.column.columnDef.meta as DataTableColumnMeta | undefined)?.mobileHidden);
                const isExpanded = expandedRowId === row.id;

                return (
                  <Fragment key={row.id}>
                    <TableRow
                      data-state={row.getIsSelected() && "selected"}
                      className={cn(hiddenCells.length > 0 && "cursor-pointer md:cursor-default")}
                      onClick={(event) => {
                        if (!hiddenCells.length || !shouldToggleRow(event.target)) return;
                        setExpandedRowId((current) => (current === row.id ? null : row.id));
                      }}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell
                          key={cell.id}
                          className={cn(
                            (cell.column.columnDef.meta as DataTableColumnMeta | undefined)?.cellClassName,
                            (cell.column.columnDef.meta as DataTableColumnMeta | undefined)?.mobileHidden && "hidden md:table-cell"
                          )}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                    {hiddenCells.length > 0 && isExpanded && (
                      <TableRow className="md:hidden bg-muted/20">
                        <TableCell colSpan={columns.length} className="px-3 py-3">
                          <dl className="space-y-3">
                            {hiddenCells.map((cell) => (
                              <div key={cell.id} className="space-y-1">
                                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                  {getCellLabel(cell)}
                                </dt>
                                <dd>{flexRender(cell.column.columnDef.cell, cell.getContext())}</dd>
                              </div>
                            ))}
                          </dl>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between text-sm">
        <p className="text-muted-foreground">
          {table.getFilteredRowModel().rows.length} row(s) total
        </p>
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-muted-foreground tabular-nums">
            {table.getState().pagination.pageIndex + 1}/{table.getPageCount()}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
