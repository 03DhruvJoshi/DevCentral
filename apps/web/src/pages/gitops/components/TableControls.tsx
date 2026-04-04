import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "../../../components/ui/input.js";
import { Button } from "../../../components/ui/button.js";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select.js";

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
    <div className="space-y-3 mb-4">
      <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => {
              onSearchChange(e.target.value);
              onPageChange(1);
            }}
            className="pl-8"
          />
        </div>
        {extraFilters}
        <div className="flex items-center gap-2 sm:ml-auto">
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            Rows per page
          </span>
          <Select
            value={String(rowsPerPage)}
            onValueChange={(v) => {
              onRowsPerPageChange(Number(v));
              onPageChange(1);
            }}
          >
            <SelectTrigger className="w-[70px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[5, 10, 20, 50].map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
    <div className="flex items-center justify-between text-sm text-muted-foreground">
      <span>
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
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="px-2">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
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
    <span>
      {`${text.slice(0, maxLen)}...`}
      <button
        className="ml-1 text-xs text-primary hover:underline font-normal"
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        read more
      </button>
    </span>
  );
}
