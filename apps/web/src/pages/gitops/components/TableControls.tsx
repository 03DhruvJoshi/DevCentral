import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "../../../components/ui/input.js";
import { Button } from "../../../components/ui/button.js";

interface TableControlsProps {
  readonly search: string;
  readonly onSearchChange: (v: string) => void;
  readonly searchPlaceholder?: string;
  readonly rowsPerPage: number;
  readonly onRowsPerPageChange: (v: number) => void;
  readonly onPageChange: (v: number) => void;
  readonly extraFilters?: React.ReactNode;
}

interface PaginationControlsProps {
  readonly rowsPerPage: number;
  readonly page: number;
  readonly totalPages: number;
  readonly onPageChange: (v: number) => void;
  readonly totalItems: number;
}

export function TableControls({
  search,
  onSearchChange,
  searchPlaceholder = "Search...",
  rowsPerPage,
  onRowsPerPageChange,
  onPageChange,
  extraFilters,
}: TableControlsProps) {
  return (
    <div className="mb-4">
      <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => {
              onSearchChange(e.target.value);
              onPageChange(1);
            }}
            className="pl-8 border-slate-300 hover:border-slate-400 focus:border-slate-400 transition-colors bg-white"
          />
        </div>
        {extraFilters}
        <div className="flex items-center gap-2 sm:ml-auto">
          <span className="text-xs text-slate-500 whitespace-nowrap">Rows per page</span>
          <select
            value={rowsPerPage}
            onChange={(e) => {
              onRowsPerPageChange(Number(e.target.value));
              onPageChange(1);
            }}
            className="h-9 rounded-lg border border-slate-300 bg-white px-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300 hover:border-slate-400 transition-colors cursor-pointer"
          >
            {[5, 10, 20, 50].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

export function PaginationControls({
  rowsPerPage,
  page,
  totalPages,
  onPageChange,
  totalItems,
}: PaginationControlsProps) {
  const start = totalItems === 0 ? 0 : (page - 1) * rowsPerPage + 1;
  const end = Math.min(page * rowsPerPage, totalItems);

  return (
    <div className="flex items-center justify-between text-sm text-slate-500 mt-3 pt-3 border-t border-slate-100">
      <span className="text-xs">
        {totalItems === 0
          ? "No results"
          : `${start}–${end} of ${totalItems} items`}
      </span>
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="h-8 w-8 p-0 border-slate-300 hover:border-slate-400 hover:bg-slate-50"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="px-3 text-xs font-medium text-slate-600">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="h-8 w-8 p-0 border-slate-300 hover:border-slate-400 hover:bg-slate-50"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

// Shared truncated text component for long titles
export function TruncatedText({
  text,
  maxLen = 50,
}: {
  text: string | undefined;
  maxLen?: number;
}) {
  if (!text || text.length <= maxLen) return <span>{text}</span>;

  return (
    <span title={text}>
      {`${text.slice(0, maxLen)}…`}
    </span>
  );
}
