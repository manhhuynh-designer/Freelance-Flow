
"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

type PaginationControlsProps = {
  page: number;
  totalPages: number;
  limit: number;
  onPageChange: (newPage: number) => void;
  onLimitChange: (newLimit: number) => void;
  T: any; // i18n object
};

export function PaginationControls({
  page,
  totalPages,
  limit,
  onPageChange,
  onLimitChange,
  T,
}: PaginationControlsProps) {
  return (
    <div className="grid grid-cols-3 items-center">
      <div className="text-sm text-muted-foreground justify-self-start">
        {T.page} {page} {T.of} {Math.max(1, totalPages)}
      </div>
      <div className="flex items-center justify-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          {T.previous}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
        >
          {T.next}
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
        <Select value={`${limit}`} onValueChange={(value) => onLimitChange(Number(value))}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={T.tasksPerPage} />
          </SelectTrigger>
          <SelectContent>
            {[5, 10, 20, 50].map(pageSize => (
              <SelectItem key={pageSize} value={`${pageSize}`}>
                {pageSize} {T.tasksPerPage}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="justify-self-end">
        {/* This cell is intentionally empty to balance the layout */}
      </div>
    </div>
  );
}
