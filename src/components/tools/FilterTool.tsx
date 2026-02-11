// components/tools/FilterTool.tsx
// 필터 & 슬라이더 도구 - 숫자 범위, 카테고리 선택, 텍스트 검색

'use client';

import React, { useState, useMemo, useCallback } from 'react';
import type { FilterConfig, MapDataRow } from '@/types/map-analysis';
import type { ColumnInfo } from '@/lib/map-utils';
import { analyzeColumns } from '@/lib/map-utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Filter, X, ChevronDown, RotateCcw, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FilterToolProps {
  data: MapDataRow[];
  filters: FilterConfig[];
  onFiltersChange: (filters: FilterConfig[]) => void;
}

export default function FilterTool({
  data,
  filters,
  onFiltersChange,
}: FilterToolProps) {
  const [openColumns, setOpenColumns] = useState<string[]>([]);

  const columns = useMemo(() => analyzeColumns(data), [data]);
  const filterableColumns = useMemo(
    () => columns.filter((c) => c.type === 'numeric' || c.type === 'categorical'),
    [columns]
  );

  const toggleColumn = (name: string) => {
    setOpenColumns((prev) =>
      prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name]
    );
  };

  const getFilter = (column: string): FilterConfig | undefined =>
    filters.find((f) => f.column === column);

  const updateFilter = useCallback(
    (column: string, update: Partial<FilterConfig>) => {
      const existing = filters.find((f) => f.column === column);
      if (existing) {
        onFiltersChange(
          filters.map((f) => (f.column === column ? { ...f, ...update } : f))
        );
      } else {
        onFiltersChange([
          ...filters,
          { column, type: 'range', ...update } as FilterConfig,
        ]);
      }
    },
    [filters, onFiltersChange]
  );

  const removeFilter = useCallback(
    (column: string) => {
      onFiltersChange(filters.filter((f) => f.column !== column));
    },
    [filters, onFiltersChange]
  );

  const clearAll = () => onFiltersChange([]);

  const activeCount = filters.length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          <span className="text-sm font-medium">Filters</span>
          {activeCount > 0 && (
            <Badge variant="secondary" className="text-xs px-1.5 py-0">
              {activeCount}
            </Badge>
          )}
        </div>
        {activeCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAll}
            className="h-7 text-xs"
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Reset
          </Button>
        )}
      </div>

      {/* Filter List */}
      <ScrollArea className="flex-1 px-3 py-2">
        {filterableColumns.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">
            데이터를 업로드하면 필터가 자동 생성됩니다.
          </p>
        ) : (
          <div className="space-y-1">
            {filterableColumns.map((col) => (
              <FilterColumnItem
                key={col.name}
                column={col}
                filter={getFilter(col.name)}
                isOpen={openColumns.includes(col.name)}
                onToggle={() => toggleColumn(col.name)}
                onUpdate={(update) => updateFilter(col.name, update)}
                onRemove={() => removeFilter(col.name)}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

// ─────────────────────────────────────────────
// Individual column filter
// ─────────────────────────────────────────────
interface FilterColumnItemProps {
  column: ColumnInfo;
  filter?: FilterConfig;
  isOpen: boolean;
  onToggle: () => void;
  onUpdate: (update: Partial<FilterConfig>) => void;
  onRemove: () => void;
}

function FilterColumnItem({
  column,
  filter,
  isOpen,
  onToggle,
  onUpdate,
  onRemove,
}: FilterColumnItemProps) {
  const isActive = !!filter;

  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <CollapsibleTrigger asChild>
        <button
          className={cn(
            'w-full flex items-center justify-between px-2 py-1.5 rounded-md text-sm hover:bg-muted/50 transition-colors',
            isActive && 'bg-primary/5 border border-primary/20'
          )}
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="truncate">{column.name}</span>
            <Badge variant="outline" className="text-[10px] px-1 py-0 shrink-0">
              {column.type === 'numeric' ? 'NUM' : 'CAT'}
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            {isActive && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove();
                }}
                className="p-0.5 hover:bg-destructive/10 rounded"
              >
                <X className="h-3 w-3 text-destructive" />
              </button>
            )}
            <ChevronDown
              className={cn(
                'h-3.5 w-3.5 transition-transform text-muted-foreground',
                isOpen && 'rotate-180'
              )}
            />
          </div>
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="px-2 py-2 space-y-2">
          {column.type === 'numeric' ? (
            <NumericFilter column={column} filter={filter} onUpdate={onUpdate} />
          ) : (
            <CategoryFilter column={column} filter={filter} onUpdate={onUpdate} />
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ─────────────────────────────────────────────
// Numeric range slider
// ─────────────────────────────────────────────
function NumericFilter({
  column,
  filter,
  onUpdate,
}: {
  column: ColumnInfo;
  filter?: FilterConfig;
  onUpdate: (update: Partial<FilterConfig>) => void;
}) {
  const min = column.min ?? 0;
  const max = column.max ?? 100;
  const currentMin = filter?.min ?? min;
  const currentMax = filter?.max ?? max;

  return (
    <div className="space-y-3">
      <Slider
        min={min}
        max={max}
        step={(max - min) / 100 || 1}
        value={[currentMin, currentMax]}
        onValueChange={([newMin, newMax]) =>
          onUpdate({ type: 'range', min: newMin, max: newMax })
        }
        className="w-full"
      />
      <div className="flex items-center gap-2 text-xs">
        <Input
          type="number"
          value={currentMin}
          onChange={(e) =>
            onUpdate({ type: 'range', min: parseFloat(e.target.value) || min, max: currentMax })
          }
          className="h-7 text-xs"
        />
        <span className="text-muted-foreground">~</span>
        <Input
          type="number"
          value={currentMax}
          onChange={(e) =>
            onUpdate({ type: 'range', min: currentMin, max: parseFloat(e.target.value) || max })
          }
          className="h-7 text-xs"
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Category checkbox list
// ─────────────────────────────────────────────
function CategoryFilter({
  column,
  filter,
  onUpdate,
}: {
  column: ColumnInfo;
  filter?: FilterConfig;
  onUpdate: (update: Partial<FilterConfig>) => void;
}) {
  const [search, setSearch] = useState('');
  const categories = column.categories ?? [];
  const selected = filter?.selectedCategories ?? [];

  const filtered = useMemo(
    () =>
      search
        ? categories.filter((c) => c.toLowerCase().includes(search.toLowerCase()))
        : categories,
    [categories, search]
  );

  const toggleCategory = (cat: string) => {
    const next = selected.includes(cat)
      ? selected.filter((c) => c !== cat)
      : [...selected, cat];
    onUpdate({ type: 'category', selectedCategories: next });
  };

  const selectAll = () =>
    onUpdate({ type: 'category', selectedCategories: [...categories] });
  const selectNone = () =>
    onUpdate({ type: 'category', selectedCategories: [] });

  return (
    <div className="space-y-2">
      {categories.length > 8 && (
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-7 text-xs pl-7"
          />
        </div>
      )}

      <div className="flex gap-2 text-[10px]">
        <button onClick={selectAll} className="text-primary hover:underline">
          All
        </button>
        <button onClick={selectNone} className="text-primary hover:underline">
          None
        </button>
        <span className="text-muted-foreground ml-auto">
          {selected.length}/{categories.length}
        </span>
      </div>

      <ScrollArea className="max-h-[140px]">
        <div className="space-y-1">
          {filtered.map((cat) => (
            <label
              key={cat}
              className="flex items-center gap-2 text-xs cursor-pointer hover:bg-muted/50 px-1 py-0.5 rounded"
            >
              <Checkbox
                checked={selected.includes(cat)}
                onCheckedChange={() => toggleCategory(cat)}
                className="h-3.5 w-3.5"
              />
              <span className="truncate">{cat}</span>
            </label>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
