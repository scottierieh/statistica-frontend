
'use client';

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarInset,
  SidebarTrigger,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenu,
  SidebarGroupLabel
} from '@/components/ui/sidebar';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from '@/hooks/use-toast';
import { 
  Loader2, Trash2, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, 
  Search, Download, AlertTriangle, Undo, Database, 
  Eye, EyeOff, Upload, FileSpreadsheet, SortAsc, SortDesc, 
  Type, Hash, Calendar, Sparkles, Columns, Rows, Eraser, 
  RefreshCw, CheckCircle2, XCircle, Keyboard, Wand2, 
  MoreVertical, X, Plus, Calculator, ChevronDown, Clock,
  FileText, GitMerge, Settings, Layers
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { UserNav } from '@/components/user-nav';

// Types
type CellValue = string | number | null;
type TableRowData = CellValue[];
type ColumnType = 'auto' | 'text' | 'number' | 'date';

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

// Sidebar menu categories
const menuCategories = [
  {
    name: 'File Operations',
    icon: FileSpreadsheet,
    items: [
      { id: 'upload', label: 'Upload Files', icon: Upload },
      { id: 'sample', label: 'Sample Data', icon: Sparkles },
      { id: 'export-csv', label: 'Export CSV', icon: Download },
      { id: 'export-xlsx', label: 'Export Excel', icon: Download },
      { id: 'export-json', label: 'Export JSON', icon: Download },
    ]
  },
  {
    name: 'Row Operations',
    icon: Rows,
    items: [
      { id: 'add-row-above', label: 'Add Row Above', icon: ArrowUp },
      { id: 'add-row-below', label: 'Add Row Below', icon: ArrowDown },
      { id: 'delete-rows', label: 'Delete Selected Rows', icon: Trash2 },
    ]
  },
  {
    name: 'Column Operations',
    icon: Columns,
    items: [
      { id: 'add-col-left', label: 'Add Column Left', icon: ArrowLeft },
      { id: 'add-col-right', label: 'Add Column Right', icon: ArrowRight },
      { id: 'delete-cols', label: 'Delete Selected Columns', icon: Trash2 },
    ]
  },
  {
    name: 'Data Quality',
    icon: AlertTriangle,
    items: [
      { id: 'fill-missing', label: 'Fill Missing Values', icon: Eraser },
      { id: 'find-duplicates', label: 'Find Duplicates', icon: Search },
      { id: 'remove-duplicates', label: 'Remove Duplicates', icon: XCircle },
    ]
  },
  {
    name: 'Transform',
    icon: Wand2,
    items: [
      { id: 'transform', label: 'Apply Transform', icon: Sparkles },
      { id: 'one-hot', label: 'One-Hot Encoding', icon: Hash },
    ]
  },
  {
    name: 'Merge',
    icon: GitMerge,
    items: [
      { id: 'merge-tabs', label: 'Merge Tabs', icon: Layers },
    ]
  },
];

// Generate unique ID
const generateId = () => `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

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
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [openCategories, setOpenCategories] = useState<string[]>(['File Operations']);
  const [menuSearchTerm, setMenuSearchTerm] = useState('');
  
  // Transform options
  const [fillMethod, setFillMethod] = useState('mean');
  const [transformType, setTransformType] = useState('');
  
  // One-Hot Encoding options
  const [showEncodingDialog, setShowEncodingDialog] = useState(false);
  const [encodingDropFirst, setEncodingDropFirst] = useState(false);
  const [encodingKeepOriginal, setEncodingKeepOriginal] = useState(false);
  const [encodingPrefix, setEncodingPrefix] = useState('');
  
  // Merge dialog state
  const [mergeTargetTabId, setMergeTargetTabId] = useState<string | null>(null);
  const [mergeMode, setMergeMode] = useState<'append' | 'join'>('append');
  const [joinType, setJoinType] = useState<'left' | 'inner' | 'right' | 'full'>('left');
  const [joinKey, setJoinKey] = useState('');
  const [mergeSourceTabId, setMergeSourceTabId] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Current active tab data
  const activeTab = tabs.find(t => t.id === activeTabId);
  const tableData = activeTab || { id: '', fileName: '', headers: [], rows: [], columnTypes: [] };
  const history = activeTabId ? (historyMap.get(activeTabId) || []) : [];
  const historyIndex = activeTabId ? (historyIndexMap.get(activeTabId) ?? -1) : -1;

  const toggleCategory = (category: string) => {
    setOpenCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  // Calculate column stats for active tab
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

  // Update active tab helper
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

  // Drag and drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
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
  const handleCellChange = (rowIdx: number, colIdx: number, value: string) => {
    if (!activeTabId) return;
    const newRows = tableData.rows.map((row, i) => i === rowIdx ? row.map((c, j) => j === colIdx ? (value === '' ? null : value) : c) : row);
    updateTab(activeTabId, { rows: newRows });
  };

  const handleHeaderChange = (colIdx: number, value: string) => {
    if (!activeTabId) return;
    const newHeaders = tableData.headers.map((h, i) => i === colIdx ? value : h);
    updateTab(activeTabId, { headers: newHeaders });
  };

  // Selection
  const toggleCol = (idx: number) => setSelectedCols(prev => { const s = new Set(prev); s.has(idx) ? s.delete(idx) : s.add(idx); return s; });
  const toggleRow = (idx: number) => setSelectedRows(prev => { const s = new Set(prev); s.has(idx) ? s.delete(idx) : s.add(idx); return s; });
  const toggleAllRows = () => setSelectedRows(selectedRows.size === filteredRows.length ? new Set() : new Set(filteredRows.map(r => r.idx)));

  // Row operations
  const addRowAbove = () => {
    if (!activeTabId || selectedRows.size === 0) return;
    saveHistory('Add row above');
    const target = Math.min(...Array.from(selectedRows));
    const newRows = [...tableData.rows];
    newRows.splice(target, 0, new Array(tableData.headers.length).fill(null));
    updateTab(activeTabId, { rows: newRows });
    setSelectedRows(new Set());
  };

  const addRowBelow = () => {
    if (!activeTabId || selectedRows.size === 0) return;
    saveHistory('Add row below');
    const target = Math.max(...Array.from(selectedRows));
    const newRows = [...tableData.rows];
    newRows.splice(target + 1, 0, new Array(tableData.headers.length).fill(null));
    updateTab(activeTabId, { rows: newRows });
    setSelectedRows(new Set());
  };

  const deleteSelectedRows = () => {
    if (!activeTabId || selectedRows.size === 0) return;
    saveHistory(`Delete ${selectedRows.size} row(s)`);
    const newRows = tableData.rows.filter((_, i) => !selectedRows.has(i));
    updateTab(activeTabId, { rows: newRows });
    setSelectedRows(new Set());
    toast({ title: 'Success', description: `${selectedRows.size} row(s) removed` });
  };

  // Column operations
  const addColLeft = () => {
    if (!activeTabId || selectedCols.size === 0) return;
    saveHistory('Add column left');
    const target = Math.min(...Array.from(selectedCols));
    const newHeaders = [...tableData.headers]; newHeaders.splice(target, 0, `Column ${tableData.headers.length + 1}`);
    const newTypes = [...tableData.columnTypes]; newTypes.splice(target, 0, 'auto');
    const newRows = tableData.rows.map(row => { const r = [...row]; r.splice(target, 0, null); return r; });
    updateTab(activeTabId, { headers: newHeaders, rows: newRows, columnTypes: newTypes });
    setSelectedCols(new Set());
  };

  const addColRight = () => {
    if (!activeTabId || selectedCols.size === 0) return;
    saveHistory('Add column right');
    const target = Math.max(...Array.from(selectedCols));
    const newHeaders = [...tableData.headers]; newHeaders.splice(target + 1, 0, `Column ${tableData.headers.length + 1}`);
    const newTypes = [...tableData.columnTypes]; newTypes.splice(target + 1, 0, 'auto');
    const newRows = tableData.rows.map(row => { const r = [...row]; r.splice(target + 1, 0, null); return r; });
    updateTab(activeTabId, { headers: newHeaders, rows: newRows, columnTypes: newTypes });
    setSelectedCols(new Set());
  };

  const deleteSelectedCols = () => {
    if (!activeTabId || selectedCols.size === 0) return;
    saveHistory(`Delete ${selectedCols.size} column(s)`);
    const indices = Array.from(selectedCols).sort((a, b) => b - a);
    const newHeaders = [...tableData.headers];
    const newTypes = [...tableData.columnTypes];
    const newRows = tableData.rows.map(row => [...row]);
    indices.forEach(idx => { newHeaders.splice(idx, 1); newTypes.splice(idx, 1); newRows.forEach(r => r.splice(idx, 1)); });
    updateTab(activeTabId, { headers: newHeaders, rows: newRows, columnTypes: newTypes });
    setSelectedCols(new Set());
  };

  // Column type
  const setColumnType = (colIdx: number, type: ColumnType) => {
    if (!activeTabId) return;
    saveHistory(`Set type to ${type}`);
    const newTypes = tableData.columnTypes.map((t, i) => i === colIdx ? type : t);
    const newRows = tableData.rows.map(row => {
      const newRow = [...row];
      const val = newRow[colIdx];
      if (val !== null && val !== undefined && String(val).trim() !== '') {
        if (type === 'number') { const n = parseFloat(String(val)); newRow[colIdx] = isNaN(n) ? val : n; }
        else if (type === 'text') { newRow[colIdx] = String(val); }
      }
      return newRow;
    });
    updateTab(activeTabId, { rows: newRows, columnTypes: newTypes });
  };

  // Sort
  const sortByCol = (colIdx: number, dir: 'asc' | 'desc') => {
    if (!activeTabId) return;
    saveHistory(`Sort by ${tableData.headers[colIdx]}`);
    const stat = columnStats.get(colIdx);
    const isNum = stat?.type === 'numeric' || tableData.columnTypes[colIdx] === 'number';
    const sorted = [...tableData.rows].sort((a, b) => {
      const av = a[colIdx], bv = b[colIdx];
      if (av == null) return dir === 'asc' ? 1 : -1;
      if (bv == null) return dir === 'asc' ? -1 : 1;
      if (isNum) { const an = parseFloat(String(av)), bn = parseFloat(String(bv)); if (!isNaN(an) && !isNaN(bn)) return dir === 'asc' ? an - bn : bn - an; }
      return dir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
    updateTab(activeTabId, { rows: sorted });
  };

  // Duplicates
  const findDuplicates = () => {
    const seen = new Map<string, number>();
    const dupes = new Set<number>();
    tableData.rows.forEach((row, i) => { const k = JSON.stringify(row); if (seen.has(k)) { dupes.add(seen.get(k)!); dupes.add(i); } else seen.set(k, i); });
    setSelectedRows(dupes);
    toast({ title: dupes.size > 0 ? 'Duplicates Found' : 'No Duplicates', description: `${dupes.size} rows selected` });
  };

  const removeDuplicates = () => {
    if (!activeTabId) return;
    saveHistory('Remove duplicates');
    const seen = new Set<string>();
    const unique = tableData.rows.filter(row => { const k = JSON.stringify(row); if (seen.has(k)) return false; seen.add(k); return true; });
    const removed = tableData.rows.length - unique.length;
    updateTab(activeTabId, { rows: unique });
    setSelectedRows(new Set());
    toast({ title: 'Success', description: `${removed} duplicate(s) removed` });
  };

  // Fill missing
  const fillMissing = () => {
    if (!activeTabId || selectedCols.size === 0) return;
    saveHistory(`Fill missing (${fillMethod})`);
    const newRows = tableData.rows.map(row => [...row]);
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
  };

  // Transform
  const applyTransform = () => {
    if (!activeTabId || !transformType || selectedCols.size === 0) return;
    saveHistory(`Transform: ${transformType}`);
    const newRows = tableData.rows.map(row => [...row]);
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
  };

  // One-Hot Encoding
  const openEncodingDialog = () => {
    if (selectedCols.size === 0) {
      toast({ title: 'No Selection', description: 'Select columns to encode', variant: 'destructive' });
      return;
    }
    setEncodingPrefix('');
    setShowEncodingDialog(true);
  };

  const applyOneHotEncoding = () => {
    if (!activeTabId || selectedCols.size === 0) return;
    saveHistory('One-Hot Encoding');
    
    const colIndices = Array.from(selectedCols).sort((a, b) => a - b);
    let newHeaders = [...tableData.headers];
    let newRows = tableData.rows.map(row => [...row]);
    let newTypes = [...tableData.columnTypes];
    
    [...colIndices].reverse().forEach(colIdx => {
      const colName = tableData.headers[colIdx];
      const prefix = encodingPrefix || colName;
      
      const uniqueVals = Array.from(new Set(
        tableData.rows
          .map(r => r[colIdx])
          .filter(v => v != null && String(v).trim() !== '')
          .map(v => String(v))
      )).sort();
      
      if (uniqueVals.length > 50) {
        toast({ title: 'Warning', description: `${colName}: Too many unique values (${uniqueVals.length}). Skipped.`, variant: 'destructive' });
        return;
      }
      
      const valsToEncode = encodingDropFirst ? uniqueVals.slice(1) : uniqueVals;
      const newColHeaders = valsToEncode.map(v => `${prefix}_${v}`);
      const insertPos = encodingKeepOriginal ? colIdx + 1 : colIdx;
      
      if (!encodingKeepOriginal) {
        newHeaders.splice(colIdx, 1);
        newTypes.splice(colIdx, 1);
        newRows.forEach(row => row.splice(colIdx, 1));
      }
      
      newHeaders.splice(insertPos, 0, ...newColHeaders);
      newTypes.splice(insertPos, 0, ...newColHeaders.map(() => 'number' as ColumnType));
      
      newRows.forEach((row, rowIdx) => {
        const originalVal = String(tableData.rows[rowIdx][colIdx] ?? '');
        const encodedVals = valsToEncode.map(v => originalVal === v ? 1 : 0);
        row.splice(insertPos, 0, ...encodedVals);
      });
    });
    
    updateTab(activeTabId, { headers: newHeaders, rows: newRows, columnTypes: newTypes });
    setShowEncodingDialog(false);
    setSelectedCols(new Set());
    toast({ title: 'Success', description: `One-Hot Encoding applied to ${colIndices.length} column(s)` });
  };

  // Merge tabs
  const openMergeDialog = (targetId: string) => {
    setMergeTargetTabId(targetId);
    setMergeSourceTabId(tabs.find(t => t.id !== targetId)?.id || null);
    setShowMergeDialog(true);
  };

  const executeMerge = () => {
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
          if (sRow) {
            mergedRows.push([...tRow, ...getSourceExtras(sRow)]);
          }
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
  };

  // Export
  const downloadFile = (format: 'csv' | 'xlsx' | 'json') => {
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
  };

  // Handle menu item click
  const handleMenuAction = (actionId: string) => {
    switch (actionId) {
      case 'upload':
        fileInputRef.current?.click();
        break;
      case 'sample':
        createSampleData();
        break;
      case 'export-csv':
        downloadFile('csv');
        break;
      case 'export-xlsx':
        downloadFile('xlsx');
        break;
      case 'export-json':
        downloadFile('json');
        break;
      case 'add-row-above':
        addRowAbove();
        break;
      case 'add-row-below':
        addRowBelow();
        break;
      case 'delete-rows':
        deleteSelectedRows();
        break;
      case 'add-col-left':
        addColLeft();
        break;
      case 'add-col-right':
        addColRight();
        break;
      case 'delete-cols':
        deleteSelectedCols();
        break;
      case 'fill-missing':
        fillMissing();
        break;
      case 'find-duplicates':
        findDuplicates();
        break;
      case 'remove-duplicates':
        removeDuplicates();
        break;
      case 'transform':
        applyTransform();
        break;
      case 'one-hot':
        openEncodingDialog();
        break;
      case 'merge-tabs':
        if (activeTabId && tabs.length > 1) {
          openMergeDialog(activeTabId);
        } else {
          toast({ title: 'Cannot Merge', description: 'Need at least 2 tabs to merge', variant: 'destructive' });
        }
        break;
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); downloadFile('csv'); }
      if (e.key === 'Delete' && selectedRows.size > 0) deleteSelectedRows();
      if (e.key === 'Escape') { setSelectedRows(new Set()); setSelectedCols(new Set()); }
      if (e.key === '?') setShowKeyboardShortcuts(true);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo, selectedRows, deleteSelectedRows]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    return tableData.rows.map((row, idx) => ({ row, idx })).filter(({ row }) => !searchTerm || row.some(c => String(c ?? '').toLowerCase().includes(searchTerm.toLowerCase())));
  }, [tableData.rows, searchTerm]);

  // Filter menu categories
  const filteredMenuCategories = useMemo(() => {
    if (!menuSearchTerm) return menuCategories;
    const lowercasedFilter = menuSearchTerm.toLowerCase();
    return menuCategories.map(category => {
      const filteredItems = category.items.filter(item => item.label.toLowerCase().includes(lowercasedFilter));
      return filteredItems.length > 0 ? { ...category, items: filteredItems } : null;
    }).filter(Boolean) as typeof menuCategories;
  }, [menuSearchTerm]);

  const totalMissing = Array.from(columnStats.values()).reduce((s, c) => s + c.missing, 0);

  const getTypeIcon = (type: ColumnType) => {
    if (type === 'number') return <Hash className="w-3 h-3" />;
    if (type === 'text') return <Type className="w-3 h-3" />;
    if (type === 'date') return <Calendar className="w-3 h-3" />;
    return <Sparkles className="w-3 h-3" />;
  };

  return (
    <SidebarProvider>
      <div 
        className="flex min-h-screen w-full"
        onDragOver={e => e.preventDefault()}
        onDrop={handleDrop}
      >
        <Sidebar>
          <SidebarHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                <Database className="h-6 w-6 text-primary-foreground" />
              </div>
              <h1 className="text-xl font-headline font-bold">Data Studio</h1>
            </div>
            <div className="p-2 space-y-2">
              <Button 
                onClick={() => fileInputRef.current?.click()} 
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                Upload Files
              </Button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                className="hidden" 
                accept=".csv,.txt,.tsv,.xlsx,.xls,.json" 
                multiple 
              />
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search operations..." 
                  value={menuSearchTerm} 
                  onChange={e => setMenuSearchTerm(e.target.value)} 
                  className="pl-9" 
                />
              </div>
            </div>
          </SidebarHeader>
          
          <SidebarContent>
            <SidebarMenu>
              {filteredMenuCategories.map(category => (
                <Collapsible 
                  key={category.name} 
                  open={openCategories.includes(category.name)} 
                  onOpenChange={() => toggleCategory(category.name)}
                >
                  <CollapsibleTrigger asChild>
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start text-base px-2 font-semibold bg-muted text-foreground"
                    >
                      <category.icon className="mr-2 h-5 w-5" />
                      <span>{category.name}</span>
                      <ChevronDown className={cn("ml-auto h-4 w-4 transition-transform", openCategories.includes(category.name) && 'rotate-180')} />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenu>
                      {category.items.map(item => (
                        <SidebarMenuItem key={item.id}>
                          <SidebarMenuButton onClick={() => handleMenuAction(item.id)}>
                            <item.icon className="h-4 w-4" />
                            {item.label}
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </SidebarMenu>

            {/* Transform Options */}
            <div className="px-4 py-2 space-y-4">
              <Separator />
              <div className="space-y-2">
                <SidebarGroupLabel className="text-xs font-semibold">Fill Method</SidebarGroupLabel>
                <Select value={fillMethod} onValueChange={setFillMethod}>
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mean">Mean</SelectItem>
                    <SelectItem value="median">Median</SelectItem>
                    <SelectItem value="mode">Mode</SelectItem>
                    <SelectItem value="zero">Zero</SelectItem>
                    <SelectItem value="forward">Forward Fill</SelectItem>
                    <SelectItem value="backward">Backward Fill</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <SidebarGroupLabel className="text-xs font-semibold">Transform Type</SidebarGroupLabel>
                <Select value={transformType} onValueChange={setTransformType}>
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="log">ln (Natural Log)</SelectItem>
                    <SelectItem value="log10">log10</SelectItem>
                    <SelectItem value="sqrt">√ (Square Root)</SelectItem>
                    <SelectItem value="square">x² (Square)</SelectItem>
                    <SelectItem value="zscore">Z-Score</SelectItem>
                    <SelectItem value="minmax">Min-Max Normalize</SelectItem>
                    <SelectItem value="abs">Absolute Value</SelectItem>
                    <SelectItem value="round">Round</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </SidebarContent>

          <SidebarFooter className="flex-col gap-2">
            <div className="w-full flex gap-2">
              <Button 
                variant="outline" 
                onClick={undo} 
                disabled={historyIndex <= 0}
                className="flex-1"
              >
                <Undo className="h-4 w-4" />
                <span className="group-data-[collapsible=icon]:hidden">Undo</span>
              </Button>
              <Button 
                variant="outline" 
                onClick={redo} 
                disabled={historyIndex >= history.length - 1}
                className="flex-1"
              >
                <RefreshCw className="h-4 w-4" />
                <span className="group-data-[collapsible=icon]:hidden">Redo</span>
              </Button>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full text-xs text-muted-foreground" 
              onClick={() => setShowKeyboardShortcuts(true)}
            >
              <Keyboard className="mr-2 w-3 h-3" />
              Press ? for shortcuts
            </Button>
            <Separator />
            <UserNav />
          </SidebarFooter>
        </Sidebar>

        <SidebarInset>
          <div className="p-4 md:p-6 h-full flex flex-col gap-4">
            <header className="flex items-center justify-between md:justify-end">
              <SidebarTrigger className="md:hidden" />
              <h1 className="text-2xl font-headline font-bold md:hidden">Data Studio</h1>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowStats(!showStats)}
                >
                  {showStats ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                  {showStats ? 'Hide' : 'Show'} Stats
                </Button>
              </div>
            </header>

            {/* Tab Bar */}
            {tabs.length > 0 && (
              <Card className="p-0">
                <div className="flex items-center gap-1 p-2 overflow-x-auto border-b">
                  {tabs.map(tab => (
                    <div 
                      key={tab.id} 
                      onClick={() => switchTab(tab.id)} 
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 cursor-pointer rounded-md transition-colors",
                        tab.id === activeTabId 
                          ? 'bg-primary text-primary-foreground' 
                          : 'hover:bg-muted'
                      )}
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      <span className="text-sm font-medium truncate max-w-[120px]">{tab.fileName}</span>
                      <button 
                        onClick={e => { e.stopPropagation(); closeTab(tab.id); }} 
                        className={cn(
                          "ml-1 p-0.5 rounded hover:bg-opacity-20",
                          tab.id === activeTabId ? 'hover:bg-white' : 'hover:bg-slate-300'
                        )}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            )}

            {/* Data Info & Search */}
            {activeTab && (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        {activeTab.fileName}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        {activeTab.rows.length} rows × {activeTab.headers.length} columns
                        {totalMissing > 0 && (
                          <Badge variant="destructive" className="text-xs ml-2">
                            {totalMissing} missing values
                          </Badge>
                        )}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedRows.size > 0 && (
                        <Badge variant="secondary">{selectedRows.size} rows selected</Badge>
                      )}
                      {selectedCols.size > 0 && (
                        <Badge variant="secondary">{selectedCols.size} cols selected</Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      placeholder="Search in data..." 
                      className="pl-10" 
                      value={searchTerm} 
                      onChange={e => setSearchTerm(e.target.value)} 
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Main Content Area */}
            <Card className="flex-1 overflow-hidden">
              {!activeTab ? (
                <div className="flex flex-col items-center justify-center h-full py-16">
                  <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mb-6">
                    <Database className="w-10 h-10 text-primary/60" />
                  </div>
                  <h3 className="text-xl font-semibold text-primary mb-2">No Data Loaded</h3>
                  <p className="text-muted-foreground mb-6">Upload files or load sample data to get started</p>
                  <div className="flex gap-3">
                    <Button onClick={() => fileInputRef.current?.click()}>
                      <Upload className="mr-2 w-4 h-4" />
                      Upload Files
                    </Button>
                    <Button variant="outline" onClick={createSampleData}>
                      <Sparkles className="mr-2 w-4 h-4" />
                      Load Sample
                    </Button>
                  </div>
                </div>
              ) : (
                <ScrollArea className="h-full">
                  <Table>
                    <TableHeader className="sticky top-0 z-10 bg-background">
                      <TableRow>
                        <TableHead className="w-12 bg-muted">
                          <Checkbox 
                            checked={selectedRows.size === filteredRows.length && filteredRows.length > 0} 
                            onCheckedChange={toggleAllRows} 
                          />
                        </TableHead>
                        {activeTab.headers.map((header, i) => {
                          const stat = columnStats.get(i);
                          return (
                            <TableHead 
                              key={i} 
                              className={cn(
                                "min-w-[150px]",
                                selectedCols.has(i) && 'bg-primary/10'
                              )}
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <Checkbox 
                                    checked={selectedCols.has(i)} 
                                    onCheckedChange={() => toggleCol(i)} 
                                  />
                                  <Input 
                                    value={header} 
                                    onChange={e => handleHeaderChange(i, e.target.value)} 
                                    className="h-7 border-none bg-transparent font-semibold text-sm flex-1" 
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
                                          {getTypeIcon(activeTab.columnTypes[i])}
                                          <span className="ml-2">Type</span>
                                        </DropdownMenuSubTrigger>
                                        <DropdownMenuSubContent>
                                          <DropdownMenuItem onClick={() => setColumnType(i, 'auto')}>
                                            <Sparkles className="w-4 h-4 mr-2" />Auto
                                          </DropdownMenuItem>
                                          <DropdownMenuItem onClick={() => setColumnType(i, 'text')}>
                                            <Type className="w-4 h-4 mr-2" />Text
                                          </DropdownMenuItem>
                                          <DropdownMenuItem onClick={() => setColumnType(i, 'number')}>
                                            <Hash className="w-4 h-4 mr-2" />Number
                                          </DropdownMenuItem>
                                          <DropdownMenuItem onClick={() => setColumnType(i, 'date')}>
                                            <Calendar className="w-4 h-4 mr-2" />Date
                                          </DropdownMenuItem>
                                        </DropdownMenuSubContent>
                                      </DropdownMenuSub>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem onClick={() => sortByCol(i, 'asc')}>
                                        <SortAsc className="w-4 h-4 mr-2" />Sort Ascending
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => sortByCol(i, 'desc')}>
                                        <SortDesc className="w-4 h-4 mr-2" />Sort Descending
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                                {showStats && stat && (
                                  <div className="text-xs text-muted-foreground pl-6">
                                    <Badge variant="outline" className="text-xs mr-1">
                                      {stat.forcedType === 'auto' ? stat.type : stat.forcedType}
                                    </Badge>
                                    {stat.missing > 0 && (
                                      <span className="text-red-500">{stat.missing} missing</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </TableHead>
                          );
                        })}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRows.map(({ row, idx }) => (
                        <TableRow 
                          key={idx} 
                          className={selectedRows.has(idx) ? 'bg-primary/5' : ''}
                        >
                          <TableCell className="bg-muted">
                            <Checkbox 
                              checked={selectedRows.has(idx)} 
                              onCheckedChange={() => toggleRow(idx)} 
                            />
                          </TableCell>
                          {row.map((cell, colIdx) => {
                            const empty = cell == null || String(cell).trim() === '';
                            return (
                              <TableCell 
                                key={colIdx} 
                                className={cn(
                                  "p-0",
                                  selectedCols.has(colIdx) && 'bg-primary/5',
                                  empty && 'bg-red-50/50'
                                )}
                              >
                                <Input 
                                  value={cell == null ? '' : String(cell)} 
                                  onChange={e => handleCellChange(idx, colIdx, e.target.value)} 
                                  className={cn(
                                    "h-9 border-none rounded-none",
                                    empty && 'text-red-400 placeholder:text-red-300'
                                  )} 
                                  placeholder={empty ? 'null' : ''} 
                                />
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </Card>

            {/* Footer Stats */}
            {activeTab && (
              <div className="text-xs text-muted-foreground flex justify-between">
                <span>
                  Showing {filteredRows.length} of {activeTab.rows.length} rows • {activeTab.headers.length} columns
                </span>
                <span>
                  History: {historyIndex + 1} / {history.length}
                </span>
              </div>
            )}
          </div>
        </SidebarInset>
      </div>

      {/* Keyboard Shortcuts Dialog */}
      <Dialog open={showKeyboardShortcuts} onOpenChange={setShowKeyboardShortcuts}>
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

      {/* Merge Dialog */}
      <Dialog open={showMergeDialog} onOpenChange={setShowMergeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Merge Tabs</DialogTitle>
            <DialogDescription>Merge data from another tab into the current tab</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Source Tab</Label>
              <Select value={mergeSourceTabId || ''} onValueChange={setMergeSourceTabId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select tab..." />
                </SelectTrigger>
                <SelectContent>
                  {tabs.filter(t => t.id !== mergeTargetTabId).map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.fileName} ({t.rows.length} rows)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <RadioGroup value={mergeMode} onValueChange={v => setMergeMode(v as 'append' | 'join')}>
              <label className={cn(
                "flex items-start gap-3 p-3 border rounded-lg cursor-pointer",
                mergeMode === 'append' && 'border-primary bg-primary/5'
              )}>
                <RadioGroupItem value="append" />
                <div>
                  <p className="font-medium text-sm">Append Rows</p>
                  <p className="text-xs text-muted-foreground">Add rows below existing data</p>
                </div>
              </label>
              <label className={cn(
                "flex items-start gap-3 p-3 border rounded-lg cursor-pointer",
                mergeMode === 'join' && 'border-primary bg-primary/5'
              )}>
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
                  <Select value={joinType} onValueChange={v => setJoinType(v as 'left' | 'inner' | 'right' | 'full')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
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
                    <SelectTrigger>
                      <SelectValue placeholder="Select column..." />
                    </SelectTrigger>
                    <SelectContent>
                      {activeTab?.headers.map(h => (
                        <SelectItem key={h} value={h}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMergeDialog(false)}>Cancel</Button>
            <Button 
              onClick={executeMerge} 
              disabled={!mergeSourceTabId || (mergeMode === 'join' && !joinKey)}
            >
              Merge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* One-Hot Encoding Dialog */}
      <Dialog open={showEncodingDialog} onOpenChange={setShowEncodingDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>One-Hot Encoding</DialogTitle>
            <DialogDescription>Convert categorical columns to binary columns</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-muted rounded-lg text-sm">
              <p className="font-medium">{selectedCols.size} column(s) selected</p>
              <p className="text-muted-foreground text-xs mt-1">
                {Array.from(selectedCols).map(i => tableData.headers[i]).join(', ')}
              </p>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Drop First Category</Label>
                  <p className="text-xs text-muted-foreground">Avoid multicollinearity (recommended for regression)</p>
                </div>
                <Checkbox 
                  checked={encodingDropFirst} 
                  onCheckedChange={(c) => setEncodingDropFirst(!!c)} 
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Keep Original Column</Label>
                  <p className="text-xs text-muted-foreground">Preserve the source column after encoding</p>
                </div>
                <Checkbox 
                  checked={encodingKeepOriginal} 
                  onCheckedChange={(c) => setEncodingKeepOriginal(!!c)} 
                />
              </div>
              
              <div>
                <Label className="text-sm font-medium">Column Prefix (optional)</Label>
                <Input 
                  placeholder="e.g., city → city_Seoul, city_Busan" 
                  value={encodingPrefix} 
                  onChange={e => setEncodingPrefix(e.target.value)}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Leave empty to use original column name as prefix
                </p>
              </div>
            </div>
            
            <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg text-xs">
              <p className="font-medium mb-1 text-blue-900 dark:text-blue-100">Preview:</p>
              <p className="text-blue-800 dark:text-blue-200">
                City → City_Seoul (0/1), City_Busan (0/1), ...
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEncodingDialog(false)}>Cancel</Button>
            <Button onClick={applyOneHotEncoding}>Apply Encoding</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
