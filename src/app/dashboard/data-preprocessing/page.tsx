'use client';

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { List as FixedSizeList } from 'react-window';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import { 
  Loader2, Trash2, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, 
  Search, Download, Undo, Database, 
  Eye, EyeOff, Upload, FileSpreadsheet, SortAsc, SortDesc, 
  Type, Hash, Calendar, Sparkles, Columns, Rows, Eraser, 
  RefreshCw, CheckCircle2, XCircle, Keyboard, Wand2, 
  MoreVertical, X, Plus, FileText, GitMerge, Layers, ChevronDown
} from 'lucide-react';
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { UserNav } from '@/components/user-nav';

// ============================================================================
// TYPES
// ============================================================================

type CellValue = string | number | null;
type TableRowData = CellValue[];
type ColumnType = 'auto' | 'text' | 'number' | 'date';
type FillMethod = 'mean' | 'median' | 'mode' | 'zero' | 'forward' | 'backward';
type TransformType = 'log' | 'log10' | 'sqrt' | 'square' | 'zscore' | 'minmax' | 'abs' | 'round' | '';
type JoinType = 'left' | 'inner' | 'right' | 'full';

interface TabData {
  id: string;
  fileName: string;
  headers: string[];
  rows: TableRowData[];
  columnTypes: ColumnType[];
}

interface ColumnStats {
  type: 'numeric' | 'text' | 'date' | 'mixed';
  forcedType: ColumnType;
  missing: number;
  unique: number;
  min?: number;
  max?: number;
  mean?: number;
}

interface HistoryEntry {
  data: TabData;
  description: string;
}

interface FilteredRow {
  row: TableRowData;
  idx: number;
}

interface EncodingOptions {
  dropFirst: boolean;
  keepOriginal: boolean;
  prefix: string;
}

const generateId = () => `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// ============================================================================
// EDITABLE CELL COMPONENT (Optimized - only shows Input when editing)
// ============================================================================

interface EditableCellProps {
  value: CellValue;
  rowIdx: number;
  colIdx: number;
  isColSelected: boolean;
  isEmpty: boolean;
  onChange: (rowIdx: number, colIdx: number, value: string) => void;
  onSaveHistory: (description: string) => void;
}

const EditableCell = React.memo(function EditableCell({
  value,
  rowIdx,
  colIdx,
  isColSelected,
  isEmpty,
  onChange,
  onSaveHistory,
}: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDoubleClick = useCallback(() => {
    setEditValue(value == null ? '' : String(value));
    setIsEditing(true);
  }, [value]);

  const handleBlur = useCallback(() => {
    const newValue = editValue;
    const oldValue = value == null ? '' : String(value);
    if (newValue !== oldValue) {
      onSaveHistory('Edit cell');
      onChange(rowIdx, colIdx, newValue);
    }
    setIsEditing(false);
  }, [editValue, value, rowIdx, colIdx, onChange, onSaveHistory]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
    }
  }, [handleBlur]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  if (isEditing) {
    return (
      <Input
        ref={inputRef}
        value={editValue}
        onChange={e => setEditValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={cn(
          "h-9 border-none rounded-none focus:ring-2 focus:ring-primary",
          isEmpty && 'text-red-400'
        )}
      />
    );
  }

  return (
    <div
      onDoubleClick={handleDoubleClick}
      className={cn(
        "h-9 px-3 flex items-center cursor-text select-none truncate text-sm",
        isColSelected && 'bg-primary/5',
        isEmpty && 'bg-red-50/50 text-red-400 italic'
      )}
    >
      {isEmpty ? 'null' : String(value)}
    </div>
  );
});

// ============================================================================
// VIRTUALIZED TABLE COMPONENT
// ============================================================================

interface VirtualizedTableProps {
  data: TabData;
  filteredRows: FilteredRow[];
  columnStats: Map<number, ColumnStats>;
  selectedCols: Set<number>;
  selectedRows: Set<number>;
  showStats: boolean;
  onCellChange: (rowIdx: number, colIdx: number, value: string) => void;
  onHeaderChange: (colIdx: number, value: string) => void;
  onToggleCol: (idx: number) => void;
  onToggleRow: (idx: number) => void;
  onToggleAllRows: () => void;
  onSetColumnType: (colIdx: number, type: ColumnType) => void;
  onSortByCol: (colIdx: number, dir: 'asc' | 'desc') => void;
  onSaveHistory: (description: string) => void;
}

const getTypeIcon = (type: ColumnType) => {
  if (type === 'number') return <Hash className="w-3 h-3" />;
  if (type === 'text') return <Type className="w-3 h-3" />;
  if (type === 'date') return <Calendar className="w-3 h-3" />;
  return <Sparkles className="w-3 h-3" />;
};

// Row component for virtualization
interface RowComponentProps {
  index: number;
  style: React.CSSProperties;
  data: {
    filteredRows: FilteredRow[];
    headers: string[];
    selectedCols: Set<number>;
    selectedRows: Set<number>;
    onCellChange: (rowIdx: number, colIdx: number, value: string) => void;
    onToggleRow: (idx: number) => void;
    onSaveHistory: (description: string) => void;
  };
}

const RowComponent = React.memo(function RowComponent({ index, style, data }: RowComponentProps) {
  const { filteredRows, headers, selectedCols, selectedRows, onCellChange, onToggleRow, onSaveHistory } = data;
  const { row, idx } = filteredRows[index];
  const isRowSelected = selectedRows.has(idx);

  return (
    <div style={style} className={cn("flex border-b", isRowSelected && 'bg-primary/5')}>
      <div className="w-12 flex-shrink-0 flex items-center justify-center border-r bg-muted/30">
        <Checkbox checked={isRowSelected} onCheckedChange={() => onToggleRow(idx)} />
      </div>
      {row.map((cell, colIdx) => {
        const isEmpty = cell == null || String(cell).trim() === '';
        return (
          <div
            key={colIdx}
            className={cn("w-[150px] flex-shrink-0 border-r", selectedCols.has(colIdx) && 'bg-primary/5')}
          >
            <EditableCell
              value={cell}
              rowIdx={idx}
              colIdx={colIdx}
              isColSelected={selectedCols.has(colIdx)}
              isEmpty={isEmpty}
              onChange={onCellChange}
              onSaveHistory={onSaveHistory}
            />
          </div>
        );
      })}
    </div>
  );
});

function VirtualizedTable({
  data,
  filteredRows,
  columnStats,
  selectedCols,
  selectedRows,
  showStats,
  onCellChange,
  onHeaderChange,
  onToggleCol,
  onToggleRow,
  onToggleAllRows,
  onSetColumnType,
  onSortByCol,
  onSaveHistory,
}: VirtualizedTableProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(400);



  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerHeight(Math.max(rect.height - 80, 200));
      }
    };
    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  // 헤더와 본문 스크롤 동기화
const handleBodyScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
  if (headerRef.current) {
    headerRef.current.scrollLeft = e.currentTarget.scrollLeft;
  }
}, []);

  const itemData = useMemo(() => ({
    filteredRows,
    headers: data.headers,
    selectedCols,
    selectedRows,
    onCellChange,
    onToggleRow,
    onSaveHistory,
  }), [filteredRows, data.headers, selectedCols, selectedRows, onCellChange, onToggleRow, onSaveHistory]);

  const totalWidth = 48 + data.headers.length * 150;

  return (
    <div ref={containerRef} className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div 
        ref={headerRef}
        className="flex-shrink-0 overflow-x-hidden"
        style={{ scrollbarWidth: 'none' }}
        >

        <div className="flex" style={{ minWidth: totalWidth }}>
          <div className="w-12 flex-shrink-0 flex items-center justify-center border-r border-b bg-muted">
            <Checkbox
              checked={selectedRows.size === filteredRows.length && filteredRows.length > 0}
              onCheckedChange={onToggleAllRows}
            />
          </div>
          {data.headers.map((header, i) => {
            const stat = columnStats.get(i);
            return (
              <div
                key={i}
                className={cn(
                  "w-[150px] flex-shrink-0 border-r border-b bg-muted/50 p-2",
                  selectedCols.has(i) && 'bg-primary/10'
                )}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Checkbox checked={selectedCols.has(i)} onCheckedChange={() => onToggleCol(i)} />
                    <Input
                      value={header}
                      onChange={e => onHeaderChange(i, e.target.value)}
                      className="h-7 border-none bg-transparent font-semibold text-sm flex-1 p-0"
                    />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger>
                            {getTypeIcon(data.columnTypes[i])}
                            <span className="ml-2">Type</span>
                          </DropdownMenuSubTrigger>
                          <DropdownMenuSubContent>
                            <DropdownMenuItem onClick={() => onSetColumnType(i, 'auto')}>
                              <Sparkles className="w-4 h-4 mr-2" />Auto
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onSetColumnType(i, 'text')}>
                              <Type className="w-4 h-4 mr-2" />Text
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onSetColumnType(i, 'number')}>
                              <Hash className="w-4 h-4 mr-2" />Number
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onSetColumnType(i, 'date')}>
                              <Calendar className="w-4 h-4 mr-2" />Date
                            </DropdownMenuItem>
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onSortByCol(i, 'asc')}>
                          <SortAsc className="w-4 h-4 mr-2" />Sort Ascending
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onSortByCol(i, 'desc')}>
                          <SortDesc className="w-4 h-4 mr-2" />Sort Descending
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  {showStats && stat && (
                    <div className="text-xs text-muted-foreground pl-6">
                      <Badge variant="outline" className="text-xs">
                        {stat.forcedType === 'auto' ? stat.type : stat.forcedType}
                      </Badge>
                      {stat.missing > 0 && <div className="text-red-500 mt-1">{stat.missing} missing</div>}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Virtualized Rows */}
      <div 
        className="flex-1 overflow-x-auto overflow-y-hidden"
        onScroll={handleBodyScroll}
      >
        <div style={{ width: totalWidth }}>
          <FixedSizeList
            height={containerHeight}
            itemCount={filteredRows.length}
            itemSize={36}
            width="100%"
            itemData={itemData}
            overscanCount={5}
            style={{ overflowX: 'hidden', overflowY: 'auto' }}
          >
            {RowComponent}
          </FixedSizeList>
        </div>
      </div>
    </div>

  );
}

// ============================================================================
// DIALOG COMPONENTS
// ============================================================================

// Keyboard Shortcuts Dialog
function KeyboardShortcutsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">Ctrl+Z</kbd>
            <span>Undo</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">Ctrl+Shift+Z</kbd>
            <span>Redo</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">Ctrl+S</kbd>
            <span>Export CSV</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">Delete</kbd>
            <span>Delete selected</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">Escape</kbd>
            <span>Clear selection</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">?</kbd>
            <span>Show shortcuts</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Merge Dialog
interface MergeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tabs: TabData[];
  targetTabId: string | null;
  sourceTabId: string | null;
  setSourceTabId: (id: string | null) => void;
  mergeMode: 'append' | 'join';
  setMergeMode: (mode: 'append' | 'join') => void;
  joinType: JoinType;
  setJoinType: (type: JoinType) => void;
  joinKey: string;
  setJoinKey: (key: string) => void;
  onExecute: () => void;
}

function MergeDialog({
  open, onOpenChange, tabs, targetTabId, sourceTabId, setSourceTabId,
  mergeMode, setMergeMode, joinType, setJoinType, joinKey, setJoinKey, onExecute,
}: MergeDialogProps) {
  const targetTab = tabs.find(t => t.id === targetTabId);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Merge Tabs</DialogTitle>
          <DialogDescription>Merge data from another tab into the current tab</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label>Source Tab</Label>
            <Select value={sourceTabId || ''} onValueChange={setSourceTabId}>
              <SelectTrigger><SelectValue placeholder="Select tab..." /></SelectTrigger>
              <SelectContent>
                {tabs.filter(t => t.id !== targetTabId).map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.fileName} ({t.rows.length} rows)</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <RadioGroup value={mergeMode} onValueChange={v => setMergeMode(v as 'append' | 'join')}>
            <label className={cn("flex items-start gap-3 p-3 border rounded-lg cursor-pointer", mergeMode === 'append' && 'border-primary bg-primary/5')}>
              <RadioGroupItem value="append" />
              <div>
                <p className="font-medium text-sm">Append Rows</p>
                <p className="text-xs text-muted-foreground">Add rows below existing data</p>
              </div>
            </label>
            <label className={cn("flex items-start gap-3 p-3 border rounded-lg cursor-pointer", mergeMode === 'join' && 'border-primary bg-primary/5')}>
              <RadioGroupItem value="join" />
              <div>
                <p className="font-medium text-sm">Join Columns</p>
                <p className="text-xs text-muted-foreground">Match by key column (SQL-style join)</p>
              </div>
            </label>
          </RadioGroup>
          {mergeMode === 'join' && (
            <>
              <div>
                <Label>Join Type</Label>
                <Select value={joinType} onValueChange={v => setJoinType(v as JoinType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inner">INNER - Only matching rows</SelectItem>
                    <SelectItem value="left">LEFT - Keep all target rows</SelectItem>
                    <SelectItem value="right">RIGHT - Keep all source rows</SelectItem>
                    <SelectItem value="full">FULL - Keep all rows from both</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Join Key Column</Label>
                <Select value={joinKey} onValueChange={setJoinKey}>
                  <SelectTrigger><SelectValue placeholder="Select column..." /></SelectTrigger>
                  <SelectContent>
                    {targetTab?.headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onExecute} disabled={!sourceTabId || (mergeMode === 'join' && !joinKey)}>Merge</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// One-Hot Encoding Dialog
interface EncodingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedColNames: string[];
  options: EncodingOptions;
  setOptions: (options: EncodingOptions) => void;
  onApply: () => void;
}

function EncodingDialog({ open, onOpenChange, selectedColNames, options, setOptions, onApply }: EncodingDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>One-Hot Encoding</DialogTitle>
          <DialogDescription>Convert categorical columns to binary columns</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="p-3 bg-muted rounded-lg text-sm">
            <p className="font-medium">{selectedColNames.length} column(s) selected</p>
            <p className="text-muted-foreground text-xs mt-1">{selectedColNames.join(', ')}</p>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Drop First Category</Label>
                <p className="text-xs text-muted-foreground">Avoid multicollinearity (recommended for regression)</p>
              </div>
              <Checkbox checked={options.dropFirst} onCheckedChange={(c) => setOptions({ ...options, dropFirst: !!c })} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Keep Original Column</Label>
                <p className="text-xs text-muted-foreground">Preserve the source column after encoding</p>
              </div>
              <Checkbox checked={options.keepOriginal} onCheckedChange={(c) => setOptions({ ...options, keepOriginal: !!c })} />
            </div>
            <div>
              <Label className="text-sm font-medium">Column Prefix (optional)</Label>
              <Input placeholder="e.g., city → city_Seoul, city_Busan" value={options.prefix} onChange={e => setOptions({ ...options, prefix: e.target.value })} className="mt-1" />
              <p className="text-xs text-muted-foreground mt-1">Leave empty to use original column name as prefix</p>
            </div>
          </div>
          <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg text-xs">
            <p className="font-medium mb-1 text-blue-900 dark:text-blue-100">Preview:</p>
            <p className="text-blue-800 dark:text-blue-200">City → City_Seoul (0/1), City_Busan (0/1), ...</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onApply}>Apply Encoding</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Confirm Delete Dialog
function ConfirmDeleteDialog({
  open, onOpenChange, title, description, onConfirm,
}: { open: boolean; onOpenChange: (open: boolean) => void; title: string; description: string; onConfirm: () => void; }) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function DataPreprocessingPage() {
  const { toast } = useToast();
  
  // Multi-tab state
  const [tabs, setTabs] = useState<TabData[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  
  // Per-tab history
  const [historyMap, setHistoryMap] = useState<Map<string, HistoryEntry[]>>(new Map());
  const [historyIndexMap, setHistoryIndexMap] = useState<Map<string, number>>(new Map());
  
  // UI state
  const [selectedCols, setSelectedCols] = useState<Set<number>>(new Set());
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [showStats, setShowStats] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  
  // Dialog states
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [showEncodingDialog, setShowEncodingDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmType, setDeleteConfirmType] = useState<'rows' | 'cols'>('rows');
  
  // Transform options
  const [fillMethod, setFillMethod] = useState<FillMethod>('mean');
  const [transformType, setTransformType] = useState<TransformType>('');
  
  // Encoding options
  const [encodingOptions, setEncodingOptions] = useState<EncodingOptions>({ dropFirst: false, keepOriginal: false, prefix: '' });
  
  // Merge dialog state
  const [mergeTargetTabId, setMergeTargetTabId] = useState<string | null>(null);
  const [mergeMode, setMergeMode] = useState<'append' | 'join'>('append');
  const [joinType, setJoinType] = useState<JoinType>('left');
  const [joinKey, setJoinKey] = useState('');
  const [mergeSourceTabId, setMergeSourceTabId] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Current active tab data
  const activeTab = tabs.find(t => t.id === activeTabId);
  const tableData = activeTab || { id: '', fileName: '', headers: [], rows: [], columnTypes: [] };
  const history = activeTabId ? (historyMap.get(activeTabId) || []) : [];
  const historyIndex = activeTabId ? (historyIndexMap.get(activeTabId) ?? -1) : -1;

  // Calculate column stats
  const columnStats = useMemo(() => {
    const stats = new Map<number, ColumnStats>();
    if (!activeTab) return stats;
    
    activeTab.headers.forEach((_, colIdx) => {
      const values = activeTab.rows.map(row => row[colIdx]);
      const nonNull = values.filter(v => v !== null && v !== undefined && String(v).trim() !== '');
      const numericValues = nonNull.map(v => parseFloat(String(v))).filter(n => !isNaN(n));
      const forcedType = activeTab.columnTypes[colIdx] || 'auto';
      
      let detectedType: 'numeric' | 'text' | 'date' | 'mixed' = 'text';
      if (forcedType === 'number' || (forcedType === 'auto' && numericValues.length > nonNull.length * 0.5)) {
        detectedType = 'numeric';
      } else if (forcedType === 'date') {
        detectedType = 'date';
      }
      
      const stat: ColumnStats = {
        type: detectedType,
        forcedType,
        missing: values.length - nonNull.length,
        unique: new Set(nonNull.map(v => String(v))).size,
      };
      
      if (detectedType === 'numeric' && numericValues.length > 0) {
        stat.min = Math.min(...numericValues);
        stat.max = Math.max(...numericValues);
        stat.mean = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
      }
      
      stats.set(colIdx, stat);
    });
    
    return stats;
  }, [activeTab]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    const rows = tableData.rows.map((row, idx) => ({ row, idx })).filter(({ row }) => 
      !searchTerm || row.some(c => String(c ?? '').toLowerCase().includes(searchTerm.toLowerCase()))
    );
    return rows;
  }, [tableData.rows, searchTerm]);

  const totalMissing = Array.from(columnStats.values()).reduce((s, c) => s + c.missing, 0);
  
  const selectedColNames = useMemo(() => {
    if (!activeTab) return [];
    return Array.from(selectedCols).map(i => activeTab.headers[i]);
  }, [activeTab, selectedCols]);

  // Update tab helper
  const updateTab = useCallback((tabId: string, updates: Partial<TabData>) => {
    setTabs(prev => prev.map(tab => tab.id === tabId ? { ...tab, ...updates } : tab));
  }, []);

  // Save to history
  const saveHistory = useCallback((description: string) => {
    if (!activeTabId || !activeTab) return;
    
    const entry: HistoryEntry = {
      data: JSON.parse(JSON.stringify(activeTab)),
      description,
    };
    
    const currentHistory = historyMap.get(activeTabId) || [];
    const currentIndex = historyIndexMap.get(activeTabId) ?? -1;
    const newHistory = [...currentHistory.slice(0, currentIndex + 1), entry].slice(-50);
    
    setHistoryMap(prev => new Map(prev).set(activeTabId, newHistory));
    setHistoryIndexMap(prev => new Map(prev).set(activeTabId, newHistory.length - 1));
  }, [activeTabId, activeTab, historyMap, historyIndexMap]);

  // Undo
  const undo = useCallback(() => {
    if (!activeTabId || historyIndex <= 0) return;
    const prevEntry = history[historyIndex - 1];
    updateTab(activeTabId, prevEntry.data);
    setHistoryIndexMap(prev => new Map(prev).set(activeTabId, historyIndex - 1));
    toast({ title: '↩ Undo', description: `Reverted: ${history[historyIndex].description}` });
  }, [activeTabId, history, historyIndex, updateTab, toast]);

  // Redo
  const redo = useCallback(() => {
    if (!activeTabId || historyIndex >= history.length - 1) return;
    const nextEntry = history[historyIndex + 1];
    updateTab(activeTabId, nextEntry.data);
    setHistoryIndexMap(prev => new Map(prev).set(activeTabId, historyIndex + 1));
    toast({ title: '↪ Redo', description: `Restored: ${nextEntry.description}` });
  }, [activeTabId, history, historyIndex, updateTab, toast]);

  // Parse file
  const parseFile = useCallback((file: File): Promise<{ headers: string[]; rows: TableRowData[] }> => {
    return new Promise((resolve, reject) => {
      const ext = file.name.split('.').pop()?.toLowerCase();
      
      if (ext === 'json') {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const json = JSON.parse(e.target?.result as string);
            if (Array.isArray(json) && json.length > 0 && typeof json[0] === 'object' && !Array.isArray(json[0])) {
              const headers = Object.keys(json[0]);
              const rows = json.map((item: any) => headers.map(h => item[h] ?? null));
              resolve({ headers, rows });
            } else if (json.headers && json.rows) {
              resolve({ headers: json.headers, rows: json.rows });
            } else if (Array.isArray(json) && Array.isArray(json[0])) {
              const headers = (json[0] as string[]).map((h, i) => h?.toString() || `Column ${i + 1}`);
              resolve({ headers, rows: json.slice(1) });
            } else {
              reject(new Error('Unsupported JSON format'));
            }
          } catch (err) { reject(err); }
        };
        reader.onerror = () => reject(new Error('Read failed'));
        reader.readAsText(file);
      } else if (ext === 'xlsx' || ext === 'xls') {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const wb = XLSX.read(data, { type: 'array' });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
            if (jsonData.length > 0) {
              const headers = (jsonData[0] as string[]).map((h, i) => h?.toString() || `Column ${i + 1}`);
              const rows = jsonData.slice(1).map(row => headers.map((_, i) => row[i] ?? null));
              resolve({ headers, rows });
            } else reject(new Error('Empty file'));
          } catch (err) { reject(err); }
        };
        reader.onerror = () => reject(new Error('Read failed'));
        reader.readAsArrayBuffer(file);
      } else {
        const reader = new FileReader();
        reader.onload = (e) => {
          const parsed = Papa.parse(e.target?.result as string, { header: false, skipEmptyLines: true });
          if (parsed.data.length > 0) {
            const headers = (parsed.data[0] as string[]).map((h, i) => h || `Column ${i + 1}`);
            resolve({ headers, rows: parsed.data.slice(1) as TableRowData[] });
          } else reject(new Error('Empty file'));
        };
        reader.onerror = () => reject(new Error('Read failed'));
        reader.readAsText(file);
      }
    });
  }, []);

  // Add new tab
  const addTab = useCallback((data: { fileName: string; headers: string[]; rows: TableRowData[] }) => {
    const id = generateId();
    const newTab: TabData = {
      id,
      fileName: data.fileName,
      headers: data.headers,
      rows: data.rows,
      columnTypes: data.headers.map(() => 'auto'),
    };
    
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(id);
    
    const initialEntry: HistoryEntry = { data: JSON.parse(JSON.stringify(newTab)), description: 'File loaded' };
    setHistoryMap(prev => new Map(prev).set(id, [initialEntry]));
    setHistoryIndexMap(prev => new Map(prev).set(id, 0));
    
    setSelectedCols(new Set());
    setSelectedRows(new Set());
    
    return id;
  }, []);

  // Close tab
  const closeTab = useCallback((tabId: string) => {
    setTabs(prev => {
      const newTabs = prev.filter(t => t.id !== tabId);
      if (tabId === activeTabId) {
        setActiveTabId(newTabs.length > 0 ? newTabs[0].id : null);
      }
      return newTabs;
    });
    setHistoryMap(prev => { const m = new Map(prev); m.delete(tabId); return m; });
    setHistoryIndexMap(prev => { const m = new Map(prev); m.delete(tabId); return m; });
    setSelectedCols(new Set());
    setSelectedRows(new Set());
  }, [activeTabId]);

  // Switch tab
  const switchTab = useCallback((tabId: string) => {
    setActiveTabId(tabId);
    setSelectedCols(new Set());
    setSelectedRows(new Set());
    setSearchTerm('');
  }, []);

  // Process uploaded files
  const processFiles = useCallback(async (files: File[]) => {
    if (files.length === 0) return;
    setIsLoading(true);
    
    for (const file of files) {
      try {
        const data = await parseFile(file);
        addTab({ fileName: file.name, headers: data.headers, rows: data.rows });
        toast({ title: 'Success', description: `${file.name}: ${data.rows.length} rows × ${data.headers.length} columns` });
      } catch (err) {
        toast({ title: 'Error', description: `Failed to parse ${file.name}`, variant: 'destructive' });
      }
    }
    
    setIsLoading(false);
  }, [parseFile, addTab, toast]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) processFiles(files);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) processFiles(files);
  };

  // Sample data
  const createSampleData = () => {
    addTab({
      fileName: 'Sample Data',
      headers: ['ID', 'Name', 'Age', 'City', 'Score', 'Grade', 'Status'],
      rows: [
        ['001', 'John Doe', 25, 'New York', 85.5, 'B', 'Active'],
        ['002', 'Jane Smith', 30, 'Los Angeles', 92.3, 'A', 'Active'],
        ['003', 'Bob Johnson', 35, 'Chicago', 78.1, 'C', 'Inactive'],
        ['004', 'Alice Brown', 28, 'Houston', 88.7, 'B+', 'Active'],
        ['005', 'Charlie Wilson', 32, 'Phoenix', 95.2, 'A+', 'Active'],
        ['006', 'Diana Lee', null, 'Boston', 91.0, 'A', 'Active'],
        ['007', 'Eric Davis', 29, 'Seattle', null, null, 'Inactive'],
        ['008', 'Fiona Clark', 31, 'Miami', 84.5, 'B', 'Active'],
        ['009', 'George Harris', 27, null, 89.2, 'B+', 'Active'],
        ['010', 'Helen Martinez', 33, 'Denver', 76.8, 'C+', 'Active'],
      ],
    });
    toast({ title: 'Success', description: 'Sample data loaded with 10 rows' });
  };

  // Cell/Header editing
  const handleCellChange = useCallback((rowIdx: number, colIdx: number, value: string) => {
    if (!activeTabId || !activeTab) return;
    const newRows = activeTab.rows.map((row, i) => i === rowIdx ? row.map((c, j) => j === colIdx ? (value === '' ? null : value) : c) : row);
    updateTab(activeTabId, { rows: newRows });
  }, [activeTabId, activeTab, updateTab]);

  const handleHeaderChange = useCallback((colIdx: number, value: string) => {
    if (!activeTabId || !activeTab) return;
    const newHeaders = activeTab.headers.map((h, i) => i === colIdx ? value : h);
    updateTab(activeTabId, { headers: newHeaders });
  }, [activeTabId, activeTab, updateTab]);

  // Selection
  const toggleCol = useCallback((idx: number) => setSelectedCols(prev => { const s = new Set(prev); s.has(idx) ? s.delete(idx) : s.add(idx); return s; }), []);
  const toggleRow = useCallback((idx: number) => setSelectedRows(prev => { const s = new Set(prev); s.has(idx) ? s.delete(idx) : s.add(idx); return s; }), []);
  const toggleAllRows = useCallback(() => setSelectedRows(selectedRows.size === filteredRows.length ? new Set() : new Set(filteredRows.map(r => r.idx))), [selectedRows.size, filteredRows]);
  const clearSelection = useCallback(() => { setSelectedCols(new Set()); setSelectedRows(new Set()); }, []);

  // Row operations
  const addRowAbove = useCallback(() => {
    if (!activeTabId || !activeTab || selectedRows.size === 0) return;
    saveHistory('Add row above');
    const target = Math.min(...Array.from(selectedRows));
    const newRows = [...activeTab.rows];
    newRows.splice(target, 0, new Array(activeTab.headers.length).fill(null));
    updateTab(activeTabId, { rows: newRows });
    setSelectedRows(new Set());
  }, [activeTabId, activeTab, selectedRows, saveHistory, updateTab]);

  const addRowBelow = useCallback(() => {
    if (!activeTabId || !activeTab || selectedRows.size === 0) return;
    saveHistory('Add row below');
    const target = Math.max(...Array.from(selectedRows));
    const newRows = [...activeTab.rows];
    newRows.splice(target + 1, 0, new Array(activeTab.headers.length).fill(null));
    updateTab(activeTabId, { rows: newRows });
    setSelectedRows(new Set());
  }, [activeTabId, activeTab, selectedRows, saveHistory, updateTab]);

  const deleteSelectedRows = useCallback(() => {
    if (!activeTabId || !activeTab || selectedRows.size === 0) return 0;
    saveHistory(`Delete ${selectedRows.size} row(s)`);
    const newRows = activeTab.rows.filter((_, i) => !selectedRows.has(i));
    updateTab(activeTabId, { rows: newRows });
    const count = selectedRows.size;
    setSelectedRows(new Set());
    toast({ title: 'Success', description: `${count} row(s) removed` });
    return count;
  }, [activeTabId, activeTab, selectedRows, saveHistory, updateTab, toast]);

  // Column operations
  const addColLeft = useCallback(() => {
    if (!activeTabId || !activeTab || selectedCols.size === 0) return;
    saveHistory('Add column left');
    const target = Math.min(...Array.from(selectedCols));
    const newHeaders = [...activeTab.headers]; newHeaders.splice(target, 0, `Column ${activeTab.headers.length + 1}`);
    const newTypes = [...activeTab.columnTypes]; newTypes.splice(target, 0, 'auto');
    const newRows = activeTab.rows.map(row => { const r = [...row]; r.splice(target, 0, null); return r; });
    updateTab(activeTabId, { headers: newHeaders, rows: newRows, columnTypes: newTypes });
    setSelectedCols(new Set());
  }, [activeTabId, activeTab, selectedCols, saveHistory, updateTab]);

  const addColRight = useCallback(() => {
    if (!activeTabId || !activeTab || selectedCols.size === 0) return;
    saveHistory('Add column right');
    const target = Math.max(...Array.from(selectedCols));
    const newHeaders = [...activeTab.headers]; newHeaders.splice(target + 1, 0, `Column ${activeTab.headers.length + 1}`);
    const newTypes = [...activeTab.columnTypes]; newTypes.splice(target + 1, 0, 'auto');
    const newRows = activeTab.rows.map(row => { const r = [...row]; r.splice(target + 1, 0, null); return r; });
    updateTab(activeTabId, { headers: newHeaders, rows: newRows, columnTypes: newTypes });
    setSelectedCols(new Set());
  }, [activeTabId, activeTab, selectedCols, saveHistory, updateTab]);

  const deleteSelectedCols = useCallback(() => {
    if (!activeTabId || !activeTab || selectedCols.size === 0) return 0;
    saveHistory(`Delete ${selectedCols.size} column(s)`);
    const indices = Array.from(selectedCols).sort((a, b) => b - a);
    const newHeaders = [...activeTab.headers];
    const newTypes = [...activeTab.columnTypes];
    const newRows = activeTab.rows.map(row => [...row]);
    indices.forEach(idx => { newHeaders.splice(idx, 1); newTypes.splice(idx, 1); newRows.forEach(r => r.splice(idx, 1)); });
    updateTab(activeTabId, { headers: newHeaders, rows: newRows, columnTypes: newTypes });
    const count = selectedCols.size;
    setSelectedCols(new Set());
    toast({ title: 'Success', description: `${count} column(s) removed` });
    return count;
  }, [activeTabId, activeTab, selectedCols, saveHistory, updateTab, toast]);

  // Column type
  const setColumnType = useCallback((colIdx: number, type: ColumnType) => {
    if (!activeTabId || !activeTab) return;
    saveHistory(`Set type to ${type}`);
    const newTypes = activeTab.columnTypes.map((t, i) => i === colIdx ? type : t);
    const newRows = activeTab.rows.map(row => {
      const newRow = [...row];
      const val = newRow[colIdx];
      if (val !== null && val !== undefined && String(val).trim() !== '') {
        if (type === 'number') { const n = parseFloat(String(val)); newRow[colIdx] = isNaN(n) ? val : n; }
        else if (type === 'text') { newRow[colIdx] = String(val); }
      }
      return newRow;
    });
    updateTab(activeTabId, { rows: newRows, columnTypes: newTypes });
  }, [activeTabId, activeTab, saveHistory, updateTab]);

  // Sort
  const sortByCol = useCallback((colIdx: number, dir: 'asc' | 'desc') => {
    if (!activeTabId || !activeTab) return;
    saveHistory(`Sort by ${activeTab.headers[colIdx]}`);
    const stat = columnStats.get(colIdx);
    const isNum = stat?.type === 'numeric' || activeTab.columnTypes[colIdx] === 'number';
    const sorted = [...activeTab.rows].sort((a, b) => {
      const av = a[colIdx], bv = b[colIdx];
      if (av == null) return dir === 'asc' ? 1 : -1;
      if (bv == null) return dir === 'asc' ? -1 : 1;
      if (isNum) { const an = parseFloat(String(av)), bn = parseFloat(String(bv)); if (!isNaN(an) && !isNaN(bn)) return dir === 'asc' ? an - bn : bn - an; }
      return dir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
    updateTab(activeTabId, { rows: sorted });
  }, [activeTabId, activeTab, columnStats, saveHistory, updateTab]);

  // Duplicates
  const findDuplicates = useCallback(() => {
    if (!activeTab) return;
    const seen = new Map<string, number>();
    const dupes = new Set<number>();
    activeTab.rows.forEach((row, i) => { const k = JSON.stringify(row); if (seen.has(k)) { dupes.add(seen.get(k)!); dupes.add(i); } else seen.set(k, i); });
    setSelectedRows(dupes);
    toast({ title: dupes.size > 0 ? 'Duplicates Found' : 'No Duplicates', description: `${dupes.size} rows selected` });
  }, [activeTab, toast]);

  const removeDuplicates = useCallback(() => {
    if (!activeTabId || !activeTab) return;
    saveHistory('Remove duplicates');
    const seen = new Set<string>();
    const unique = activeTab.rows.filter(row => { const k = JSON.stringify(row); if (seen.has(k)) return false; seen.add(k); return true; });
    const removed = activeTab.rows.length - unique.length;
    updateTab(activeTabId, { rows: unique });
    setSelectedRows(new Set());
    toast({ title: 'Success', description: `${removed} duplicate(s) removed` });
  }, [activeTabId, activeTab, saveHistory, updateTab, toast]);

  // Fill missing
  const fillMissing = useCallback(() => {
    if (!activeTabId || !activeTab || selectedCols.size === 0) return;
    saveHistory(`Fill missing (${fillMethod})`);
    const newRows = activeTab.rows.map(row => [...row]);
    selectedCols.forEach(colIdx => {
      const vals = newRows.map(r => r[colIdx]).filter(v => v != null && String(v).trim() !== '');
      const nums = vals.map(v => parseFloat(String(v))).filter(n => !isNaN(n));
      const isNum = nums.length > vals.length * 0.5;
      let fill: CellValue = null;
      
      if (fillMethod === 'mean' && isNum && nums.length) fill = parseFloat((nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2));
      else if (fillMethod === 'median' && isNum && nums.length) { const s = [...nums].sort((a, b) => a - b); const m = Math.floor(s.length / 2); fill = s.length % 2 ? s[m] : parseFloat(((s[m - 1] + s[m]) / 2).toFixed(2)); }
      else if (fillMethod === 'mode' && vals.length) { const freq: Record<string, number> = {}; vals.forEach(v => freq[String(v)] = (freq[String(v)] || 0) + 1); fill = Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0]; }
      else if (fillMethod === 'zero') fill = isNum ? 0 : '';
      else if (fillMethod === 'forward') { let last: CellValue = null; newRows.forEach(r => { if (r[colIdx] == null || String(r[colIdx]).trim() === '') r[colIdx] = last; else last = r[colIdx]; }); return; }
      else if (fillMethod === 'backward') { let next: CellValue = null; for (let i = newRows.length - 1; i >= 0; i--) { if (newRows[i][colIdx] == null || String(newRows[i][colIdx]).trim() === '') newRows[i][colIdx] = next; else next = newRows[i][colIdx]; } return; }
      
      if (fill !== null) newRows.forEach(r => { if (r[colIdx] == null || String(r[colIdx]).trim() === '') r[colIdx] = fill; });
    });
    updateTab(activeTabId, { rows: newRows });
    toast({ title: 'Success', description: `${selectedCols.size} column(s) processed` });
  }, [activeTabId, activeTab, selectedCols, fillMethod, saveHistory, updateTab, toast]);

  // Transform
  const applyTransform = useCallback(() => {
    if (!activeTabId || !activeTab || !transformType || selectedCols.size === 0) return;
    saveHistory(`Transform: ${transformType}`);
    const newRows = activeTab.rows.map(row => [...row]);
    selectedCols.forEach(colIdx => {
      const indices: number[] = [], vals: number[] = [];
      newRows.forEach((r, i) => { const n = parseFloat(String(r[colIdx])); if (!isNaN(n)) { indices.push(i); vals.push(n); } });
      if (!vals.length) return;
      
      let trans: number[] = [];
      if (transformType === 'log') trans = vals.map(v => v > 0 ? Math.log(v) : NaN);
      else if (transformType === 'log10') trans = vals.map(v => v > 0 ? Math.log10(v) : NaN);
      else if (transformType === 'sqrt') trans = vals.map(v => v >= 0 ? Math.sqrt(v) : NaN);
      else if (transformType === 'square') trans = vals.map(v => v * v);
      else if (transformType === 'zscore') { const m = vals.reduce((a, b) => a + b, 0) / vals.length; const s = Math.sqrt(vals.reduce((sum, v) => sum + (v - m) ** 2, 0) / (vals.length - 1)); trans = vals.map(v => s ? (v - m) / s : 0); }
      else if (transformType === 'minmax') { const min = Math.min(...vals), max = Math.max(...vals), r = max - min; trans = vals.map(v => r ? (v - min) / r : 0); }
      else if (transformType === 'abs') trans = vals.map(v => Math.abs(v));
      else if (transformType === 'round') trans = vals.map(v => Math.round(v));
      
      indices.forEach((rowIdx, i) => { const v = trans[i]; newRows[rowIdx][colIdx] = isNaN(v) ? null : (transformType === 'round' ? v : parseFloat(v.toFixed(4))); });
    });
    updateTab(activeTabId, { rows: newRows });
    toast({ title: 'Success', description: `${transformType} applied` });
  }, [activeTabId, activeTab, transformType, selectedCols, saveHistory, updateTab, toast]);

  // One-Hot Encoding
  const openEncodingDialog = useCallback(() => {
    if (selectedCols.size === 0) {
      toast({ title: 'No Selection', description: 'Select columns to encode', variant: 'destructive' });
      return;
    }
    setEncodingOptions({ dropFirst: false, keepOriginal: false, prefix: '' });
    setShowEncodingDialog(true);
  }, [selectedCols, toast]);

  const applyOneHotEncoding = useCallback(() => {
    if (!activeTabId || !activeTab || selectedCols.size === 0) return;
    saveHistory('One-Hot Encoding');
    
    const colIndices = Array.from(selectedCols).sort((a, b) => a - b);
    let newHeaders = [...activeTab.headers];
    let newRows = activeTab.rows.map(row => [...row]);
    let newTypes = [...activeTab.columnTypes];
    const skipped: string[] = [];
    
    [...colIndices].reverse().forEach(colIdx => {
      const colName = activeTab.headers[colIdx];
      const prefix = encodingOptions.prefix || colName;
      
      const uniqueVals = Array.from(new Set(
        activeTab.rows.map(r => r[colIdx]).filter(v => v != null && String(v).trim() !== '').map(v => String(v))
      )).sort();
      
      if (uniqueVals.length > 50) { skipped.push(colName); return; }
      
      const valsToEncode = encodingOptions.dropFirst ? uniqueVals.slice(1) : uniqueVals;
      const newColHeaders = valsToEncode.map(v => `${prefix}_${v}`);
      const insertPos = encodingOptions.keepOriginal ? colIdx + 1 : colIdx;
      
      if (!encodingOptions.keepOriginal) {
        newHeaders.splice(colIdx, 1);
        newTypes.splice(colIdx, 1);
        newRows.forEach(row => row.splice(colIdx, 1));
      }
      
      newHeaders.splice(insertPos, 0, ...newColHeaders);
      newTypes.splice(insertPos, 0, ...newColHeaders.map(() => 'number' as ColumnType));
      
      newRows.forEach((row, rowIdx) => {
        const originalVal = String(activeTab.rows[rowIdx][colIdx] ?? '');
        const encodedVals = valsToEncode.map(v => originalVal === v ? 1 : 0);
        row.splice(insertPos, 0, ...encodedVals);
      });
    });
    
    updateTab(activeTabId, { headers: newHeaders, rows: newRows, columnTypes: newTypes });
    setShowEncodingDialog(false);
    setSelectedCols(new Set());
    
    if (skipped.length > 0) {
      toast({ title: 'Warning', description: `Skipped: ${skipped.join(', ')} (too many values)`, variant: 'destructive' });
    }
    toast({ title: 'Success', description: `One-Hot Encoding applied to ${colIndices.length - skipped.length} column(s)` });
  }, [activeTabId, activeTab, selectedCols, encodingOptions, saveHistory, updateTab, toast]);

  // Merge tabs
  const openMergeDialog = useCallback((targetId: string) => {
    setMergeTargetTabId(targetId);
    setMergeSourceTabId(tabs.find(t => t.id !== targetId)?.id || null);
    setMergeMode('append');
    setJoinKey('');
    setShowMergeDialog(true);
  }, [tabs]);

  const executeMerge = useCallback(() => {
    if (!mergeTargetTabId || !mergeSourceTabId) return;
    const target = tabs.find(t => t.id === mergeTargetTabId);
    const source = tabs.find(t => t.id === mergeSourceTabId);
    if (!target || !source) return;
    
    saveHistory(`Merge from ${source.fileName}`);
    
    if (mergeMode === 'append') {
      const headerMap = new Map(target.headers.map((h, i) => [h, i]));
      const newHeaders = [...target.headers];
      source.headers.forEach(h => { if (!headerMap.has(h)) { headerMap.set(h, newHeaders.length); newHeaders.push(h); } });
      const padded = target.rows.map(r => { const nr = [...r]; while (nr.length < newHeaders.length) nr.push(null); return nr; });
      const mapped = source.rows.map(r => { const nr: TableRowData = new Array(newHeaders.length).fill(null); source.headers.forEach((h, i) => { const ti = headerMap.get(h); if (ti !== undefined) nr[ti] = r[i]; }); return nr; });
      updateTab(mergeTargetTabId, { headers: newHeaders, rows: [...padded, ...mapped], columnTypes: newHeaders.map(() => 'auto') });
      toast({ title: 'Success', description: `${source.rows.length} rows appended` });
    } else if (mergeMode === 'join' && joinKey) {
      const tKeyIdx = target.headers.indexOf(joinKey);
      const sKeyIdx = source.headers.indexOf(joinKey);
      if (tKeyIdx === -1 || sKeyIdx === -1) { toast({ title: 'Error', description: 'Key not found', variant: 'destructive' }); return; }
      
      const newCols = source.headers.filter((h, i) => i !== sKeyIdx && !target.headers.includes(h));
      const newHeaders = [...target.headers, ...newCols];
      
      const sourceLookup = new Map<string, TableRowData>();
      source.rows.forEach(r => sourceLookup.set(String(r[sKeyIdx] ?? ''), r));
      
      const targetLookup = new Map<string, TableRowData>();
      target.rows.forEach(r => targetLookup.set(String(r[tKeyIdx] ?? ''), r));
      
      const getSourceExtras = (sourceRow: TableRowData | undefined): CellValue[] => {
        if (!sourceRow) return new Array(newCols.length).fill(null);
        return newCols.map(h => sourceRow[source.headers.indexOf(h)]);
      };
      
      const createEmptyTargetRow = (key: CellValue): TableRowData => {
        const row: TableRowData = new Array(target.headers.length).fill(null);
        row[tKeyIdx] = key;
        return row;
      };
      
      let mergedRows: TableRowData[] = [];
      
      if (joinType === 'inner') {
        target.rows.forEach(tRow => {
          const key = String(tRow[tKeyIdx] ?? '');
          const sRow = sourceLookup.get(key);
          if (sRow) mergedRows.push([...tRow, ...getSourceExtras(sRow)]);
        });
      } else if (joinType === 'left') {
        target.rows.forEach(tRow => {
          const key = String(tRow[tKeyIdx] ?? '');
          const sRow = sourceLookup.get(key);
          mergedRows.push([...tRow, ...getSourceExtras(sRow)]);
        });
      } else if (joinType === 'right') {
        source.rows.forEach(sRow => {
          const key = String(sRow[sKeyIdx] ?? '');
          const tRow = targetLookup.get(key);
          if (tRow) {
            mergedRows.push([...tRow, ...getSourceExtras(sRow)]);
          } else {
            mergedRows.push([...createEmptyTargetRow(sRow[sKeyIdx]), ...getSourceExtras(sRow)]);
          }
        });
      } else if (joinType === 'full') {
        const processedKeys = new Set<string>();
        target.rows.forEach(tRow => {
          const key = String(tRow[tKeyIdx] ?? '');
          processedKeys.add(key);
          const sRow = sourceLookup.get(key);
          mergedRows.push([...tRow, ...getSourceExtras(sRow)]);
        });
        source.rows.forEach(sRow => {
          const key = String(sRow[sKeyIdx] ?? '');
          if (!processedKeys.has(key)) {
            mergedRows.push([...createEmptyTargetRow(sRow[sKeyIdx]), ...getSourceExtras(sRow)]);
          }
        });
      }
      
      updateTab(mergeTargetTabId, { headers: newHeaders, rows: mergedRows, columnTypes: newHeaders.map(() => 'auto') });
      toast({ title: 'Success', description: `${joinType.toUpperCase()} JOIN: ${mergedRows.length} rows, ${newCols.length} new columns` });
    }
    setShowMergeDialog(false);
  }, [mergeTargetTabId, mergeSourceTabId, tabs, mergeMode, joinType, joinKey, saveHistory, updateTab, toast]);

  // Export
  const downloadFile = useCallback((format: 'csv' | 'xlsx' | 'json') => {
    if (!activeTab) return;
    const base = activeTab.fileName.replace(/\.[^/.]+$/, '') || 'data';
    
    if (format === 'csv') {
      const csv = Papa.unparse({ fields: activeTab.headers, data: activeTab.rows });
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `${base}.csv`; link.click();
    } else if (format === 'xlsx') {
      const ws = XLSX.utils.aoa_to_sheet([activeTab.headers, ...activeTab.rows]);
      const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Data');
      XLSX.writeFile(wb, `${base}.xlsx`);
    } else {
      const json = activeTab.rows.map(row => { const obj: Record<string, CellValue> = {}; activeTab.headers.forEach((h, i) => obj[h] = row[i]); return obj; });
      const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
      const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `${base}.json`; link.click();
    }
    toast({ title: 'Success', description: `${format.toUpperCase()} downloaded` });
  }, [activeTab, toast]);

  // Confirm delete handler
  const handleConfirmDelete = useCallback(() => {
    if (deleteConfirmType === 'rows') {
      deleteSelectedRows();
    } else {
      deleteSelectedCols();
    }
    setShowDeleteConfirm(false);
  }, [deleteConfirmType, deleteSelectedRows, deleteSelectedCols]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); downloadFile('csv'); }
      if (e.key === 'Delete' && selectedRows.size > 0) { setDeleteConfirmType('rows'); setShowDeleteConfirm(true); }
      if (e.key === 'Escape') { clearSelection(); }
      if (e.key === '?') setShowKeyboardShortcuts(true);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo, selectedRows, downloadFile, clearSelection]);

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <SidebarProvider>
      <div 
        className="flex min-h-screen w-full relative"
        onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={e => { e.preventDefault(); setIsDragOver(false); }}
        onDrop={handleDrop}
      >
        {/* Drag & Drop Overlay */}
        {isDragOver && (
          <div className="absolute inset-0 z-50 bg-primary/10 backdrop-blur-sm flex items-center justify-center">
            <div className="bg-background rounded-2xl shadow-2xl p-12 text-center border-2 border-dashed border-primary">
              <Upload className="w-16 h-16 text-primary mx-auto mb-4" />
              <h3 className="text-2xl font-bold mb-2">Drop files here</h3>
              <p className="text-muted-foreground">CSV, Excel, JSON supported</p>
            </div>
          </div>
        )}

        {/* Hidden file input */}
        <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".csv,.txt,.tsv,.xlsx,.xls,.json" multiple />

        <Sidebar>
          <SidebarHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                <Database className="h-6 w-6 text-primary-foreground" />
              </div>
              <h1 className="text-xl font-headline font-bold">Data Studio</h1>
            </div>
          </SidebarHeader>
          
          <SidebarContent>
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-4">
                {/* File Operations */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2"><FileSpreadsheet className="w-4 h-4" />Import / Export</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button onClick={() => fileInputRef.current?.click()} className="w-full" size="sm"><Upload className="mr-2 w-4 h-4" />Upload Files</Button>
                    <Button variant="outline" onClick={createSampleData} className="w-full" size="sm"><Sparkles className="mr-2 w-4 h-4" />Sample Data</Button>
                    <Separator className="my-2" />
                    <div className="flex">
                      <Button variant="outline" onClick={() => downloadFile('csv')} disabled={!activeTab} size="sm" className="flex-1 rounded-r-none border-r-0">
                        <Download className="mr-2 w-4 h-4" />Download CSV
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" disabled={!activeTab} className="px-2 rounded-l-none"><ChevronDown className="w-4 h-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => downloadFile('csv')}><FileText className="mr-2 w-4 h-4" />CSV</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => downloadFile('xlsx')}><FileSpreadsheet className="mr-2 w-4 h-4" />Excel</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => downloadFile('json')}><FileText className="mr-2 w-4 h-4" />JSON</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>

                {/* Row Operations */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2"><Rows className="w-4 h-4" />Rows</CardTitle>
                    {selectedRows.size > 0 && <Badge variant="secondary" className="text-xs">{selectedRows.size} selected</Badge>}
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" size="sm" onClick={addRowAbove} disabled={selectedRows.size === 0}><ArrowUp className="mr-1 w-3 h-3" />Above</Button>
                      <Button variant="outline" size="sm" onClick={addRowBelow} disabled={selectedRows.size === 0}><ArrowDown className="mr-1 w-3 h-3" />Below</Button>
                    </div>
                    <Button variant="outline" size="sm" className="w-full text-destructive" onClick={() => { setDeleteConfirmType('rows'); setShowDeleteConfirm(true); }} disabled={selectedRows.size === 0}>
                      <Trash2 className="mr-2 w-3 h-3" />Delete
                    </Button>
                  </CardContent>
                </Card>

                {/* Column Operations */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2"><Columns className="w-4 h-4" />Columns</CardTitle>
                    {selectedCols.size > 0 && <Badge variant="secondary" className="text-xs">{selectedCols.size} selected</Badge>}
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" size="sm" onClick={addColLeft} disabled={selectedCols.size === 0}><ArrowLeft className="mr-1 w-3 h-3" />Left</Button>
                      <Button variant="outline" size="sm" onClick={addColRight} disabled={selectedCols.size === 0}><ArrowRight className="mr-1 w-3 h-3" />Right</Button>
                    </div>
                    <Button variant="outline" size="sm" className="w-full text-destructive" onClick={() => { setDeleteConfirmType('cols'); setShowDeleteConfirm(true); }} disabled={selectedCols.size === 0}>
                      <Trash2 className="mr-2 w-3 h-3" />Delete
                    </Button>
                  </CardContent>
                </Card>

                {/* Data Quality */}
                <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2"><Search className="w-4 h-4" />Data Quality</CardTitle>
                        <CardDescription className="text-xs">
                        <div>mean/median/zero: numeric only</div>
                        <div>mode/forward/backward: numeric & text</div>                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                      <Select value={fillMethod} onValueChange={v => setFillMethod(v as FillMethod)}>
                      <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mean">Mean</SelectItem>
                        <SelectItem value="median">Median</SelectItem>
                        <SelectItem value="mode">Mode</SelectItem>
                        <SelectItem value="zero">Zero</SelectItem>
                        <SelectItem value="forward">Forward Fill</SelectItem>
                        <SelectItem value="backward">Backward Fill</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button onClick={fillMissing} className="w-full" size="sm" disabled={selectedCols.size === 0}><Eraser className="mr-2 w-3 h-3" />Fill Missing</Button>
                    <Separator />
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" size="sm" onClick={findDuplicates} disabled={!activeTab}><Search className="mr-1 w-3 h-3" />Find</Button>
                      <Button variant="outline" size="sm" onClick={removeDuplicates} disabled={!activeTab}><XCircle className="mr-1 w-3 h-3" />Remove</Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Transform */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2"><Wand2 className="w-4 h-4" />Transform</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Select value={transformType} onValueChange={v => setTransformType(v as TransformType)}>
                      <SelectTrigger className="h-8"><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="log">ln</SelectItem>
                        <SelectItem value="log10">log10</SelectItem>
                        <SelectItem value="sqrt">√</SelectItem>
                        <SelectItem value="square">x²</SelectItem>
                        <SelectItem value="zscore">Z-Score</SelectItem>
                        <SelectItem value="minmax">Min-Max</SelectItem>
                        <SelectItem value="abs">Abs</SelectItem>
                        <SelectItem value="round">Round</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button onClick={applyTransform} disabled={!transformType || selectedCols.size === 0} size="sm" className="w-full"><Sparkles className="mr-2 w-3 h-3" />Apply</Button>
                    <Separator />
                    <Button variant="outline" onClick={openEncodingDialog} disabled={selectedCols.size === 0} size="sm" className="w-full"><Hash className="mr-2 w-3 h-3" />One-Hot Encoding</Button>
                  </CardContent>
                </Card>

                {/* History */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2"><RefreshCw className="w-4 h-4" />History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" size="sm" onClick={undo} disabled={historyIndex <= 0}><Undo className="mr-1 w-3 h-3" />Undo</Button>
                      <Button variant="outline" size="sm" onClick={redo} disabled={historyIndex >= history.length - 1}><RefreshCw className="mr-1 w-3 h-3" />Redo</Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 text-center">{historyIndex + 1} / {history.length}</p>
                  </CardContent>
                </Card>

                {/* Merge */}
                {tabs.length > 1 && activeTabId && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2"><GitMerge className="w-4 h-4" />Merge Tabs</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Button variant="outline" size="sm" className="w-full" onClick={() => openMergeDialog(activeTabId)}><Layers className="mr-2 w-3 h-3" />Merge into this tab</Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            </ScrollArea>
          </SidebarContent>

          <SidebarFooter className="flex-col gap-2">
            <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground" onClick={() => setShowKeyboardShortcuts(true)}>
              <Keyboard className="mr-2 w-3 h-3" />Press ? for shortcuts
            </Button>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset>
          <div className="p-4 md:p-6 h-full flex flex-col gap-4 max-w-7xl mx-auto w-full">
            <header className="flex items-center justify-between border-b pb-4">
              <SidebarTrigger className="md:hidden" />
              <div className="flex-1 flex justify-center">
                <h1 className="text-xl font-headline font-bold flex items-center gap-2"><Database className="h-5 w-5" />Data Studio</h1>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowStats(!showStats)}>
                  {showStats ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                  {showStats ? 'Hide' : 'Show'} Stats
                </Button>
                <UserNav />
              </div>
            </header>

            {/* Tab Bar */}
            {tabs.length > 0 && (
              <Card className="p-0">
                <div className="flex items-center gap-1 p-2 overflow-x-auto border-b">
                  {tabs.map(tab => (
                    <div key={tab.id} onClick={() => switchTab(tab.id)} className={cn(
                      "flex items-center gap-2 px-4 py-2 cursor-pointer rounded-md transition-colors",
                      tab.id === activeTabId ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                    )}>
                      <FileSpreadsheet className="w-4 h-4" />
                      <span className="text-sm font-medium truncate max-w-[120px]">{tab.fileName}</span>
                      <button onClick={e => { e.stopPropagation(); closeTab(tab.id); }} className={cn("ml-1 p-0.5 rounded hover:bg-opacity-20", tab.id === activeTabId ? 'hover:bg-white' : 'hover:bg-slate-300')}>
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()}><Plus className="w-4 h-4" /></Button>
                </div>
              </Card>
            )}

            {/* Data Info & Search */}
            {activeTab && (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" />{activeTab.fileName}</CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        {activeTab.rows.length} rows × {activeTab.headers.length} columns
                        {totalMissing > 0 && <Badge variant="destructive" className="text-xs ml-2">{totalMissing} missing values</Badge>}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedRows.size > 0 && <Badge variant="secondary">{selectedRows.size} rows selected</Badge>}
                      {selectedCols.size > 0 && <Badge variant="secondary">{selectedCols.size} cols selected</Badge>}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="Search in data..." className="pl-10" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Main Content Area */}
            <Card className="flex-1 flex flex-col overflow-hidden">
              {!activeTab ? (
                <div className="flex flex-col items-center justify-center h-full py-16">
                  <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mb-6">
                    <Database className="w-10 h-10 text-primary/60" />
                  </div>
                  <h3 className="text-xl font-semibold text-primary mb-2">No Data Loaded</h3>
                  <p className="text-muted-foreground mb-6">Upload files or load sample data to get started</p>
                  <div className="flex gap-3">
                    <Button onClick={() => fileInputRef.current?.click()}><Upload className="mr-2 w-4 h-4" />Upload Files</Button>
                    <Button variant="outline" onClick={createSampleData}><Sparkles className="mr-2 w-4 h-4" />Load Sample</Button>
                  </div>
                </div>
              ) : (
                <VirtualizedTable
                  data={activeTab}
                  filteredRows={filteredRows}
                  columnStats={columnStats}
                  selectedCols={selectedCols}
                  selectedRows={selectedRows}
                  showStats={showStats}
                  onCellChange={handleCellChange}
                  onHeaderChange={handleHeaderChange}
                  onToggleCol={toggleCol}
                  onToggleRow={toggleRow}
                  onToggleAllRows={toggleAllRows}
                  onSetColumnType={setColumnType}
                  onSortByCol={sortByCol}
                  onSaveHistory={saveHistory}
                />
              )}
            </Card>

            {/* Footer Stats */}
            {activeTab && (
              <div className="text-xs text-muted-foreground">
              </div>
            )}
          </div>
        </SidebarInset>
      </div>

      {/* Dialogs */}
      <KeyboardShortcutsDialog open={showKeyboardShortcuts} onOpenChange={setShowKeyboardShortcuts} />

      <MergeDialog
        open={showMergeDialog}
        onOpenChange={setShowMergeDialog}
        tabs={tabs}
        targetTabId={mergeTargetTabId}
        sourceTabId={mergeSourceTabId}
        setSourceTabId={setMergeSourceTabId}
        mergeMode={mergeMode}
        setMergeMode={setMergeMode}
        joinType={joinType}
        setJoinType={setJoinType}
        joinKey={joinKey}
        setJoinKey={setJoinKey}
        onExecute={executeMerge}
      />

      <EncodingDialog
        open={showEncodingDialog}
        onOpenChange={setShowEncodingDialog}
        selectedColNames={selectedColNames}
        options={encodingOptions}
        setOptions={setEncodingOptions}
        onApply={applyOneHotEncoding}
      />

      <ConfirmDeleteDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title={deleteConfirmType === 'rows' ? 'Delete Rows?' : 'Delete Columns?'}
        description={`Are you sure you want to delete ${deleteConfirmType === 'rows' ? selectedRows.size : selectedCols.size} ${deleteConfirmType}? This action cannot be undone.`}
        onConfirm={handleConfirmDelete}
      />

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">Loading files...</p>
          </div>
        </div>
      )}
    </SidebarProvider>
  );
}
