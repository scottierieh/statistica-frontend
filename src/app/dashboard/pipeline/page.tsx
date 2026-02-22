'use client';

import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarFooter, SidebarInset, SidebarTrigger,
} from '@/components/ui/sidebar';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import {
  Loader2, Trash2, Search, AlertTriangle, Database, Eye, EyeOff, FileSpreadsheet,
  Eraser, RefreshCw, CheckCircle2, XCircle, Plus, Play, Clock, Settings2,
  GripVertical, ChevronDown, ChevronUp, Filter, Type, Calendar, BarChart3,
  Workflow, Copy, MoreVertical, Pencil, FileText, Link2, ArrowDownToLine,
  SlidersHorizontal, Braces, Table2, Columns, Sigma, Binary, Timer, AlertCircle,
  Minimize2, Maximize2, TableProperties, Import, Download
} from 'lucide-react';
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from '@/lib/utils';
import { UserNav } from '@/components/user-nav';
import { usePipelines, usePipelineMutations, type PipelineData, type PipelineStepData } from '@/hooks/use-pipelines';

// ─── Types ───────────────────────────────────────────────────────────────────
type StepCategory = 'collect' | 'clean' | 'transform' | 'feature' | 'export';
interface StepConfig { [key: string]: any; }
interface PreviewData { headers: string[]; rows: (string | number | null)[][]; totalRows: number; totalCols: number; }
interface PipelineStep {
  id: string; type: string; category: StepCategory; label: string; description: string;
  enabled: boolean; config: StepConfig; status: 'idle' | 'running' | 'success' | 'error' | 'skipped';
  error?: string; duration?: number; preview?: PreviewData;
}
interface StepTemplate {
  type: string; category: StepCategory; label: string; description: string;
  icon: React.ReactNode; defaultConfig: StepConfig;
}

// ─── API Config ──────────────────────────────────────────────────────────────
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ─── Constants ───────────────────────────────────────────────────────────────
const generateStepId = () => `step-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const CATEGORY_COLORS: Record<StepCategory, { bg: string; border: string; text: string; badge: string }> = {
  collect:   { bg: 'bg-blue-50 dark:bg-blue-950/30',    border: 'border-blue-200 dark:border-blue-800',       text: 'text-blue-700 dark:text-blue-300',       badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  clean:     { bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-200 dark:border-emerald-800', text: 'text-emerald-700 dark:text-emerald-300', badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200' },
  transform: { bg: 'bg-violet-50 dark:bg-violet-950/30',  border: 'border-violet-200 dark:border-violet-800',   text: 'text-violet-700 dark:text-violet-300',   badge: 'bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200' },
  feature:   { bg: 'bg-amber-50 dark:bg-amber-950/30',    border: 'border-amber-200 dark:border-amber-800',     text: 'text-amber-700 dark:text-amber-300',     badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200' },
  export:    { bg: 'bg-rose-50 dark:bg-rose-950/30',      border: 'border-rose-200 dark:border-rose-800',       text: 'text-rose-700 dark:text-rose-300',       badge: 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200' },
};
const CATEGORY_LABELS: Record<StepCategory, string> = {
  collect: 'Collect', clean: 'Clean', transform: 'Transform', feature: 'Feature Engineering', export: 'Export',
};

const STEP_TEMPLATES: StepTemplate[] = [
  { type: 'source_file', category: 'collect', label: 'File Source', description: 'Load data from files (CSV, Excel, JSON)', icon: <FileSpreadsheet className="w-4 h-4" />, defaultConfig: { fileType: 'csv', path: '', encoding: 'utf-8' } },
  { type: 'source_api', category: 'collect', label: 'API Source', description: 'Fetch data from REST APIs', icon: <Link2 className="w-4 h-4" />, defaultConfig: { url: '', method: 'GET', headers: {}, params: {} } },
  { type: 'source_database', category: 'collect', label: 'Database Query', description: 'Extract data from database via SQL query', icon: <Database className="w-4 h-4" />, defaultConfig: { connectionId: '', query: '' } },
  { type: 'remove_duplicates', category: 'clean', label: 'Remove Duplicates', description: 'Remove duplicate rows', icon: <XCircle className="w-4 h-4" />, defaultConfig: { subset: [], keep: 'first' } },
  { type: 'fill_missing', category: 'clean', label: 'Fill Missing Values', description: 'Fill missing values with specified method', icon: <Eraser className="w-4 h-4" />, defaultConfig: { columns: [], method: 'mean' } },
  { type: 'remove_outliers', category: 'clean', label: 'Remove Outliers', description: 'Detect and remove outliers', icon: <AlertTriangle className="w-4 h-4" />, defaultConfig: { columns: [], method: 'iqr', threshold: 1.5 } },
  { type: 'filter_rows', category: 'clean', label: 'Filter Rows', description: 'Keep only rows matching conditions', icon: <Filter className="w-4 h-4" />, defaultConfig: { column: '', operator: '==', value: '' } },
  { type: 'drop_columns', category: 'clean', label: 'Drop Columns', description: 'Drop unnecessary columns', icon: <Columns className="w-4 h-4" />, defaultConfig: { columns: [] } },
  { type: 'type_cast', category: 'transform', label: 'Type Casting', description: 'Cast column data types', icon: <Type className="w-4 h-4" />, defaultConfig: { mappings: {} } },
  { type: 'normalize', category: 'transform', label: 'Normalize / Scale', description: 'Normalize using Z-Score or Min-Max', icon: <SlidersHorizontal className="w-4 h-4" />, defaultConfig: { columns: [], method: 'minmax' } },
  { type: 'math_transform', category: 'transform', label: 'Math Transform', description: 'Math transforms (log, sqrt, square, etc.)', icon: <Sigma className="w-4 h-4" />, defaultConfig: { columns: [], operation: 'log' } },
  { type: 'rename_columns', category: 'transform', label: 'Rename Columns', description: 'Rename columns', icon: <Pencil className="w-4 h-4" />, defaultConfig: { mappings: {} } },
  { type: 'sort', category: 'transform', label: 'Sort', description: 'Sort data', icon: <ArrowDownToLine className="w-4 h-4" />, defaultConfig: { column: '', direction: 'asc' } },
  { type: 'one_hot_encoding', category: 'feature', label: 'One-Hot Encoding', description: 'Convert categorical variables to binary columns', icon: <Binary className="w-4 h-4" />, defaultConfig: { columns: [], dropFirst: false, prefix: '' } },
  { type: 'date_features', category: 'feature', label: 'Date Features', description: 'Extract year, month, day, day-of-week from dates', icon: <Calendar className="w-4 h-4" />, defaultConfig: { column: '', features: ['year', 'month', 'day', 'dayOfWeek'] } },
  { type: 'binning', category: 'feature', label: 'Binning', description: 'Bin continuous variables into intervals', icon: <BarChart3 className="w-4 h-4" />, defaultConfig: { column: '', bins: 5, labels: [] } },
  { type: 'custom_formula', category: 'feature', label: 'Custom Formula', description: 'Create new columns from formulas', icon: <Braces className="w-4 h-4" />, defaultConfig: { newColumn: '', formula: '' } },
  { type: 'export_file', category: 'export', label: 'Export File', description: 'Export to CSV, Excel, or JSON', icon: <FileText className="w-4 h-4" />, defaultConfig: { format: 'csv', path: '', includeIndex: false } },
  { type: 'export_database', category: 'export', label: 'Export to Database', description: 'Save to database table', icon: <Database className="w-4 h-4" />, defaultConfig: { connectionId: '', table: '', ifExists: 'replace' } },
];

// ─── Preview Table ───────────────────────────────────────────────────────────
function PreviewTable({ preview }: { preview: PreviewData }) {
  return (
    <div className="border rounded-md overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 bg-muted/50 border-b">
        <span className="text-xs font-medium flex items-center gap-1.5"><TableProperties className="w-3 h-3" />Preview</span>
        <span className="text-xs text-muted-foreground">{preview.totalRows} rows × {preview.totalCols} cols</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead><tr className="border-b bg-muted/30">
            {preview.headers.map((h, i) => <th key={i} className="px-3 py-1.5 text-left font-medium text-muted-foreground whitespace-nowrap">{h}</th>)}
          </tr></thead>
          <tbody>
            {preview.rows.map((row, i) => <tr key={i} className="border-b last:border-0 hover:bg-muted/20">
              {row.map((cell, j) => <td key={j} className={cn("px-3 py-1 whitespace-nowrap", cell === null && "text-red-400 italic")}>{cell === null ? 'null' : String(cell)}</td>)}
            </tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Step Config Form ────────────────────────────────────────────────────────
function StepConfigForm({ step, onChange }: { step: PipelineStep; onChange: (config: StepConfig) => void }) {
  const c = step.config;
  const u = (k: string, v: any) => onChange({ ...c, [k]: v });
  const csv = (v: string) => v.split(',').map(s => s.trim()).filter(Boolean);

  const SelectField = ({ label, value, onValue, items }: { label: string; value: string; onValue: (v: string) => void; items: { v: string; l: string }[] }) => (
    <div><Label className="text-xs">{label}</Label><Select value={value} onValueChange={onValue}><SelectTrigger className="h-8 mt-1"><SelectValue /></SelectTrigger><SelectContent>{items.map(i => <SelectItem key={i.v} value={i.v}>{i.l}</SelectItem>)}</SelectContent></Select></div>
  );
  const TextField = ({ label, placeholder, value, onValue }: { label: string; placeholder: string; value: string; onValue: (v: string) => void }) => (
    <div><Label className="text-xs">{label}</Label><Input className="h-8 mt-1" placeholder={placeholder} value={value} onChange={e => onValue(e.target.value)} /></div>
  );
  const CsvField = ({ label, placeholder, value, onValue }: { label: string; placeholder: string; value: string[]; onValue: (v: string[]) => void }) => (
    <div><Label className="text-xs">{label}</Label><Input className="h-8 mt-1" placeholder={placeholder} value={value.join(', ')} onChange={e => onValue(csv(e.target.value))} /></div>
  );

  switch (step.type) {
    case 'source_file': return (<div className="space-y-3"><SelectField label="File Type" value={c.fileType} onValue={v => u('fileType', v)} items={[{ v: 'csv', l: 'CSV' }, { v: 'xlsx', l: 'Excel' }, { v: 'json', l: 'JSON' }]} /><TextField label="File Path / URL" placeholder="/data/input.csv" value={c.path} onValue={v => u('path', v)} /><SelectField label="Encoding" value={c.encoding} onValue={v => u('encoding', v)} items={[{ v: 'utf-8', l: 'UTF-8' }, { v: 'euc-kr', l: 'EUC-KR' }, { v: 'ascii', l: 'ASCII' }]} /></div>);
    case 'source_api': return (<div className="space-y-3"><TextField label="URL" placeholder="https://api.example.com/data" value={c.url} onValue={v => u('url', v)} /><SelectField label="Method" value={c.method} onValue={v => u('method', v)} items={[{ v: 'GET', l: 'GET' }, { v: 'POST', l: 'POST' }]} /></div>);
    case 'source_database': return (<div className="space-y-3"><TextField label="Connection" placeholder="Connection ID" value={c.connectionId} onValue={v => u('connectionId', v)} /><div><Label className="text-xs">SQL Query</Label><Textarea className="mt-1 font-mono text-xs" rows={3} placeholder="SELECT * FROM table" value={c.query} onChange={e => u('query', e.target.value)} /></div></div>);
    case 'fill_missing': return (<div className="space-y-3"><SelectField label="Method" value={c.method} onValue={v => u('method', v)} items={[{ v: 'mean', l: 'Mean' }, { v: 'median', l: 'Median' }, { v: 'mode', l: 'Mode' }, { v: 'zero', l: 'Zero' }, { v: 'forward', l: 'Forward Fill' }, { v: 'backward', l: 'Backward Fill' }]} /><CsvField label="Target Columns (empty = all)" placeholder="col1, col2" value={c.columns || []} onValue={v => u('columns', v)} /></div>);
    case 'remove_duplicates': return (<div className="space-y-3"><SelectField label="Keep" value={c.keep} onValue={v => u('keep', v)} items={[{ v: 'first', l: 'Keep First' }, { v: 'last', l: 'Keep Last' }]} /><CsvField label="Subset Columns (empty = all)" placeholder="col1, col2" value={c.subset || []} onValue={v => u('subset', v)} /></div>);
    case 'remove_outliers': return (<div className="space-y-3"><SelectField label="Method" value={c.method} onValue={v => u('method', v)} items={[{ v: 'iqr', l: 'IQR' }, { v: 'zscore', l: 'Z-Score' }]} /><div><Label className="text-xs">Threshold</Label><Input className="h-8 mt-1" type="number" step="0.1" value={c.threshold} onChange={e => u('threshold', parseFloat(e.target.value))} /></div><CsvField label="Target Columns" placeholder="col1, col2" value={c.columns || []} onValue={v => u('columns', v)} /></div>);
    case 'filter_rows': return (<div className="space-y-3"><TextField label="Column" placeholder="column_name" value={c.column} onValue={v => u('column', v)} /><SelectField label="Operator" value={c.operator} onValue={v => u('operator', v)} items={[{ v: '==', l: '== (Equal)' }, { v: '!=', l: '!= (Not Equal)' }, { v: '>', l: '> (Greater)' }, { v: '<', l: '< (Less)' }, { v: '>=', l: '≥' }, { v: '<=', l: '≤' }, { v: 'contains', l: 'Contains' }, { v: 'not_null', l: 'Not Null' }]} />{c.operator !== 'not_null' && <TextField label="Value" placeholder="filter value" value={c.value} onValue={v => u('value', v)} />}</div>);
    case 'drop_columns': return <CsvField label="Columns to Drop" placeholder="col1, col2, col3" value={c.columns || []} onValue={v => u('columns', v)} />;
    case 'normalize': return (<div className="space-y-3"><SelectField label="Method" value={c.method} onValue={v => u('method', v)} items={[{ v: 'minmax', l: 'Min-Max (0~1)' }, { v: 'zscore', l: 'Z-Score' }, { v: 'robust', l: 'Robust Scaler' }]} /><CsvField label="Target Columns" placeholder="col1, col2" value={c.columns || []} onValue={v => u('columns', v)} /></div>);
    case 'math_transform': return (<div className="space-y-3"><SelectField label="Operation" value={c.operation} onValue={v => u('operation', v)} items={[{ v: 'log', l: 'ln' }, { v: 'log10', l: 'log10' }, { v: 'sqrt', l: '√' }, { v: 'square', l: 'x²' }, { v: 'abs', l: '|x|' }, { v: 'round', l: 'Round' }]} /><CsvField label="Target Columns" placeholder="col1, col2" value={c.columns || []} onValue={v => u('columns', v)} /></div>);
    case 'rename_columns': return (<div><Label className="text-xs">Mappings (old:new, one per line)</Label><Textarea className="mt-1 font-mono text-xs" rows={3} placeholder={"old_name:new_name\ncol1:column_one"} value={Object.entries(c.mappings || {}).map(([k, v]) => `${k}:${v}`).join('\n')} onChange={e => { const m: Record<string, string> = {}; e.target.value.split('\n').forEach(l => { const p = l.split(':').map(s => s.trim()); if (p[0] && p[1]) m[p[0]] = p[1]; }); u('mappings', m); }} /></div>);
    case 'sort': return (<div className="space-y-3"><TextField label="Column" placeholder="column_name" value={c.column} onValue={v => u('column', v)} /><SelectField label="Direction" value={c.direction} onValue={v => u('direction', v)} items={[{ v: 'asc', l: 'Ascending' }, { v: 'desc', l: 'Descending' }]} /></div>);
    case 'one_hot_encoding': return (<div className="space-y-3"><CsvField label="Target Columns" placeholder="col1, col2" value={c.columns || []} onValue={v => u('columns', v)} /><div className="flex items-center justify-between"><Label className="text-xs">Drop First</Label><Switch checked={c.dropFirst} onCheckedChange={v => u('dropFirst', v)} /></div><TextField label="Prefix (optional)" placeholder="auto" value={c.prefix} onValue={v => u('prefix', v)} /></div>);
    case 'date_features': return (<div className="space-y-3"><TextField label="Date Column" placeholder="date_column" value={c.column} onValue={v => u('column', v)} /><div><Label className="text-xs">Features to Extract</Label><div className="flex flex-wrap gap-2 mt-1">{['year','month','day','dayOfWeek','hour','quarter','weekOfYear'].map(f => (<label key={f} className="flex items-center gap-1 text-xs"><Checkbox checked={(c.features||[]).includes(f)} onCheckedChange={chk => { const fs = c.features||[]; u('features', chk ? [...fs, f] : fs.filter((x:string) => x !== f)); }} />{f}</label>))}</div></div></div>);
    case 'binning': return (<div className="space-y-3"><TextField label="Column" placeholder="column_name" value={c.column} onValue={v => u('column', v)} /><div><Label className="text-xs">Number of Bins</Label><Input className="h-8 mt-1" type="number" min={2} max={20} value={c.bins} onChange={e => u('bins', parseInt(e.target.value))} /></div></div>);
    case 'custom_formula': return (<div className="space-y-3"><TextField label="New Column Name" placeholder="new_column" value={c.newColumn} onValue={v => u('newColumn', v)} /><div><Label className="text-xs">Formula</Label><Textarea className="mt-1 font-mono text-xs" rows={2} placeholder="col1 * 2 + col2" value={c.formula} onChange={e => u('formula', e.target.value)} /><p className="text-xs text-muted-foreground mt-1">Reference columns by name. Supports arithmetic and functions.</p></div></div>);
    case 'export_file': return (<div className="space-y-3"><SelectField label="Format" value={c.format} onValue={v => u('format', v)} items={[{ v: 'csv', l: 'CSV' }, { v: 'xlsx', l: 'Excel' }, { v: 'json', l: 'JSON' }]} /><TextField label="Output Path" placeholder="/output/result.csv" value={c.path} onValue={v => u('path', v)} /></div>);
    case 'export_database': return (<div className="space-y-3"><TextField label="Connection" placeholder="Connection ID" value={c.connectionId} onValue={v => u('connectionId', v)} /><TextField label="Table Name" placeholder="output_table" value={c.table} onValue={v => u('table', v)} /><SelectField label="If Table Exists" value={c.ifExists} onValue={v => u('ifExists', v)} items={[{ v: 'replace', l: 'Replace' }, { v: 'append', l: 'Append' }, { v: 'fail', l: 'Fail' }]} /></div>);
    default: return <p className="text-xs text-muted-foreground">No configuration available</p>;
  }
}

// ─── Inline Add Button ───────────────────────────────────────────────────────
function InlineAddButton({ onClick }: { onClick: () => void }) {
  return (
    <div className="flex justify-center py-0.5 group/add">
      <div className="relative flex flex-col items-center">
        <div className="w-px h-2 bg-border" />
        <button onClick={onClick} className="w-6 h-6 rounded-full border-2 border-dashed border-muted-foreground/20 flex items-center justify-center text-muted-foreground/20 hover:border-primary hover:text-primary hover:bg-primary/5 transition-all duration-200 opacity-0 group-hover/add:opacity-100 focus:opacity-100">
          <Plus className="w-3 h-3" />
        </button>
        <div className="w-px h-2 bg-border" />
      </div>
    </div>
  );
}

// ─── Step Card ───────────────────────────────────────────────────────────────
function PipelineStepCard({ step, index, isExpanded, showPreview, onToggleExpand, onTogglePreview, onUpdate, onDelete, onDuplicate, onMoveUp, onMoveDown, isFirst, isLast, onDragStart, onDragOver, onDragEnd, onDrop, isDragTarget }: {
  step: PipelineStep; index: number; isExpanded: boolean; showPreview: boolean;
  onToggleExpand: () => void; onTogglePreview: () => void;
  onUpdate: (u: Partial<PipelineStep>) => void; onDelete: () => void; onDuplicate: () => void;
  onMoveUp: () => void; onMoveDown: () => void; isFirst: boolean; isLast: boolean;
  onDragStart: (e: React.DragEvent) => void; onDragOver: (e: React.DragEvent) => void;
  onDragEnd: (e: React.DragEvent) => void; onDrop: (e: React.DragEvent) => void; isDragTarget: boolean;
}) {
  const colors = CATEGORY_COLORS[step.category];
  const template = STEP_TEMPLATES.find(t => t.type === step.type);
  const statusIcon = { idle: null, running: <Loader2 className="w-4 h-4 animate-spin text-blue-500" />, success: <CheckCircle2 className="w-4 h-4 text-emerald-500" />, error: <XCircle className="w-4 h-4 text-red-500" />, skipped: <AlertCircle className="w-4 h-4 text-muted-foreground" /> }[step.status];

  return (
    <div className="relative" onDragOver={onDragOver} onDrop={onDrop}>
      {!isFirst && <div className="absolute -top-4 left-8 w-px h-4 bg-border" />}
      {isDragTarget && <div className="absolute -top-1 left-4 right-4 h-0.5 bg-primary rounded-full z-10" />}
      <Card draggable onDragStart={onDragStart} onDragEnd={onDragEnd} className={cn("transition-all duration-200", colors.border, !step.enabled && 'opacity-50', step.status === 'running' && 'ring-2 ring-blue-400 ring-offset-2', step.status === 'error' && 'ring-2 ring-red-400 ring-offset-2', isDragTarget && 'ring-2 ring-primary ring-offset-2')}>
        <div className={cn("flex items-center gap-3 px-4 py-3 cursor-pointer select-none", colors.bg)} onClick={onToggleExpand}>
          <div className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground" onMouseDown={e => e.stopPropagation()}><GripVertical className="w-4 h-4" /></div>
          <div className={cn("flex items-center justify-center w-7 h-7 rounded-md text-xs font-bold", colors.badge)}>{index + 1}</div>
          <div className="flex items-center gap-2">{template?.icon}<span className="font-medium text-sm">{step.label}</span></div>
          <Badge variant="outline" className={cn("text-xs ml-1 hidden sm:inline-flex", colors.text)}>{CATEGORY_LABELS[step.category]}</Badge>
          {statusIcon && <div className="ml-1">{statusIcon}</div>}
          {step.duration !== undefined && step.status === 'success' && <span className="text-xs text-muted-foreground ml-1 hidden sm:inline">{step.duration < 1000 ? `${step.duration}ms` : `${(step.duration / 1000).toFixed(1)}s`}</span>}
          <div className="flex-1" />
          {step.status === 'success' && (
            <TooltipProvider delayDuration={300}><Tooltip><TooltipTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={e => { e.stopPropagation(); onTogglePreview(); }}>
                {showPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </Button>
            </TooltipTrigger><TooltipContent side="top"><p className="text-xs">{showPreview ? 'Hide' : 'Show'} Preview</p></TooltipContent></Tooltip></TooltipProvider>
          )}
          <Switch checked={step.enabled} onCheckedChange={v => onUpdate({ enabled: v })} onClick={e => e.stopPropagation()} className="mr-1" />
          <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={e => e.stopPropagation()}><MoreVertical className="w-4 h-4" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onDuplicate}><Copy className="w-4 h-4 mr-2" />Duplicate</DropdownMenuItem>
              <DropdownMenuItem onClick={onMoveUp} disabled={isFirst}><ChevronUp className="w-4 h-4 mr-2" />Move Up</DropdownMenuItem>
              <DropdownMenuItem onClick={onMoveDown} disabled={isLast}><ChevronDown className="w-4 h-4 mr-2" />Move Down</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="text-red-600"><Trash2 className="w-4 h-4 mr-2" />Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
        {isExpanded && (
          <CardContent className="pt-4 pb-4 border-t space-y-4">
            <p className="text-xs text-muted-foreground">{step.description}</p>
            <Tabs defaultValue="config" className="w-full">
              <TabsList className="h-8">
                <TabsTrigger value="config" className="text-xs h-7"><Settings2 className="w-3 h-3 mr-1.5" />Configuration</TabsTrigger>
                <TabsTrigger value="preview" className="text-xs h-7" disabled={step.status !== 'success'}><Eye className="w-3 h-3 mr-1.5" />Preview{step.status !== 'success' && <span className="text-muted-foreground ml-1">(run first)</span>}</TabsTrigger>
              </TabsList>
              <TabsContent value="config" className="mt-3"><StepConfigForm step={step} onChange={config => onUpdate({ config })} /></TabsContent>
              <TabsContent value="preview" className="mt-3">
                {step.preview ? <PreviewTable preview={step.preview} /> : <div className="text-center py-6 text-xs text-muted-foreground"><Eye className="w-6 h-6 mx-auto mb-2 opacity-30" /><p>Run the pipeline to generate a preview.</p></div>}
              </TabsContent>
            </Tabs>
            {step.error && <div className="p-2 bg-red-50 dark:bg-red-950/30 rounded-md border border-red-200 dark:border-red-800"><p className="text-xs text-red-600 dark:text-red-400">{step.error}</p></div>}
          </CardContent>
        )}
        {showPreview && !isExpanded && step.preview && <CardContent className="pt-0 pb-3 border-t"><PreviewTable preview={step.preview} /></CardContent>}
      </Card>
      {!isLast && <div className="flex justify-center py-1"><div className="w-px h-3 bg-border" /><ChevronDown className="w-4 h-4 text-muted-foreground -ml-[8.5px] mt-1" /></div>}
    </div>
  );
}

// ─── Helper: Convert Firestore pipeline to local UI format ───────────────────
function toLocalPipeline(p: PipelineData): { id: string; name: string; description: string; steps: PipelineStep[]; status: 'idle' | 'running' | 'completed' | 'failed'; lastRun?: string; updatedAt: string; createdAt: string } {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    steps: (p.steps || []).map((s, i) => ({
      id: s.type + '-' + i,
      type: s.type,
      category: s.category,
      label: s.label,
      description: s.description,
      enabled: s.enabled,
      config: s.config,
      status: 'idle' as const,
    })),
    status: p.status || 'idle',
    lastRun: p.lastRun || undefined,
    updatedAt: p.updatedAt?.toDate?.() ? p.updatedAt.toDate().toISOString() : new Date().toISOString(),
    createdAt: p.createdAt?.toDate?.() ? p.createdAt.toDate().toISOString() : new Date().toISOString(),
  };
}

// ─── Helper: Convert local steps to Firestore format ─────────────────────────
function toFirestoreSteps(steps: PipelineStep[]): PipelineStepData[] {
  return steps.map(s => ({
    type: s.type,
    category: s.category,
    label: s.label,
    description: s.description,
    enabled: s.enabled,
    config: s.config,
  }));
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function DataPipelinePage() {
  const { toast } = useToast();

  // ── Firestore hooks ──────────────────────────────────
  const { pipelines: firestorePipelines, loading: pipelinesLoading } = usePipelines();
  const {
    createPipeline: fsCreate,
    updatePipeline: fsUpdate,
    deletePipeline: fsDelete,
    updatePipelineRunResult,
  } = usePipelineMutations();

  // ── Convert Firestore data to local format ───────────
  const pipelines = useMemo(() => {
    if (!firestorePipelines) return [];
    return firestorePipelines.map(toLocalPipeline);
  }, [firestorePipelines]);

  // ── Local UI state (not persisted) ───────────────────
  const [activePipelineId, setActivePipelineId] = useState<string | null>(null);
  const [localSteps, setLocalSteps] = useState<Record<string, PipelineStep[]>>({});
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [previewSteps, setPreviewSteps] = useState<Set<string>>(new Set());
  const [showAddStep, setShowAddStep] = useState(false);
  const [addStepCategory, setAddStepCategory] = useState<StepCategory | 'all'>('all');
  const [addStepInsertIndex, setAddStepInsertIndex] = useState<number | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [pipelineSearch, setPipelineSearch] = useState('');
  const [stepSearch, setStepSearch] = useState('');
  const [showNewPipelineDialog, setShowNewPipelineDialog] = useState(false);
  const [newPipelineName, setNewPipelineName] = useState('');
  const [newPipelineDesc, setNewPipelineDesc] = useState('');
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importJson, setImportJson] = useState('');
  const [dragSourceIndex, setDragSourceIndex] = useState<number | null>(null);
  const [dragTargetIndex, setDragTargetIndex] = useState<number | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState('');
  const nameInputRef = useRef<HTMLInputElement>(null);

  // ── Active pipeline (merge Firestore + local runtime state) ──
  const basePipeline = pipelines.find(p => p.id === activePipelineId);
  const activePipeline = useMemo(() => {
    if (!basePipeline) return null;
    const overrideSteps = localSteps[basePipeline.id];
    if (overrideSteps) {
      return { ...basePipeline, steps: overrideSteps };
    }
    return basePipeline;
  }, [basePipeline, localSteps]);

  // ── Save steps to Firestore (debounced-style, called explicitly) ──
  const saveStepsToFirestore = useCallback(async (pipelineId: string, steps: PipelineStep[]) => {
    try {
      await fsUpdate(pipelineId, { steps: toFirestoreSteps(steps) });
    } catch (e) {
      console.error('Failed to save steps:', e);
    }
  }, [fsUpdate]);

  // ── Update local steps + auto-save to Firestore ──────
  const updateLocalSteps = useCallback((pipelineId: string, steps: PipelineStep[]) => {
    setLocalSteps(prev => ({ ...prev, [pipelineId]: steps }));
    saveStepsToFirestore(pipelineId, steps);
  }, [saveStepsToFirestore]);

  // ── CRUD: Create Pipeline → Firestore ────────────────
  const createPipeline = useCallback(async () => {
    if (!newPipelineName.trim()) return;
    try {
      const id = await fsCreate({ name: newPipelineName.trim(), description: newPipelineDesc.trim() });
      setActivePipelineId(id);
      setShowNewPipelineDialog(false);
      setNewPipelineName('');
      setNewPipelineDesc('');
      toast({ title: 'Pipeline Created', description: newPipelineName.trim() });
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to create pipeline', variant: 'destructive' });
    }
  }, [newPipelineName, newPipelineDesc, fsCreate, toast]);

  // ── CRUD: Delete Pipeline → Firestore ────────────────
  const deletePipeline = useCallback(async (id: string) => {
    try {
      await fsDelete(id);
      if (activePipelineId === id) setActivePipelineId(null);
      setLocalSteps(prev => { const n = { ...prev }; delete n[id]; return n; });
      toast({ title: 'Pipeline Deleted' });
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to delete pipeline', variant: 'destructive' });
    }
  }, [activePipelineId, fsDelete, toast]);

  // ── CRUD: Update Pipeline metadata → Firestore ───────
  const updatePipelineMeta = useCallback(async (updates: { name?: string; description?: string }) => {
    if (!activePipelineId) return;
    try {
      await fsUpdate(activePipelineId, updates);
    } catch (e) {
      console.error('Failed to update pipeline:', e);
    }
  }, [activePipelineId, fsUpdate]);

  // ── Step operations ──────────────────────────────────
  const addStep = useCallback((template: StepTemplate, insertAt?: number | null) => {
    if (!activePipelineId || !activePipeline) return;
    const step: PipelineStep = {
      id: generateStepId(), type: template.type, category: template.category,
      label: template.label, description: template.description,
      enabled: true, config: { ...template.defaultConfig }, status: 'idle',
    };
    const ns = [...activePipeline.steps];
    ns.splice(insertAt ?? ns.length, 0, step);
    updateLocalSteps(activePipelineId, ns);
    setExpandedSteps(prev => new Set(prev).add(step.id));
    setShowAddStep(false);
    setAddStepInsertIndex(null);
    toast({ title: 'Step Added', description: template.label });
  }, [activePipelineId, activePipeline, updateLocalSteps, toast]);

  const updateStep = useCallback((id: string, u: Partial<PipelineStep>) => {
    if (!activePipeline || !activePipelineId) return;
    const newSteps = activePipeline.steps.map(s => s.id === id ? { ...s, ...u } : s);
    // For config changes, save to Firestore. For runtime status, only local.
    if (u.config || u.enabled !== undefined || u.label) {
      updateLocalSteps(activePipelineId, newSteps);
    } else {
      setLocalSteps(prev => ({ ...prev, [activePipelineId]: newSteps }));
    }
  }, [activePipeline, activePipelineId, updateLocalSteps]);

  const deleteStep = useCallback((id: string) => {
    if (!activePipeline || !activePipelineId) return;
    const newSteps = activePipeline.steps.filter(s => s.id !== id);
    updateLocalSteps(activePipelineId, newSteps);
    toast({ title: 'Step Removed' });
  }, [activePipeline, activePipelineId, updateLocalSteps, toast]);

  const duplicateStep = useCallback((id: string) => {
    if (!activePipeline || !activePipelineId) return;
    const orig = activePipeline.steps.find(s => s.id === id);
    if (!orig) return;
    const idx = activePipeline.steps.findIndex(s => s.id === id);
    const copy: PipelineStep = {
      ...JSON.parse(JSON.stringify(orig)),
      id: generateStepId(),
      label: `${orig.label} (copy)`,
      status: 'idle',
      preview: undefined,
    };
    const ns = [...activePipeline.steps];
    ns.splice(idx + 1, 0, copy);
    updateLocalSteps(activePipelineId, ns);
  }, [activePipeline, activePipelineId, updateLocalSteps]);

  const moveStep = useCallback((id: string, dir: 'up' | 'down') => {
    if (!activePipeline || !activePipelineId) return;
    const ss = [...activePipeline.steps];
    const i = ss.findIndex(s => s.id === id);
    if (i === -1) return;
    const ni = dir === 'up' ? i - 1 : i + 1;
    if (ni < 0 || ni >= ss.length) return;
    [ss[i], ss[ni]] = [ss[ni], ss[i]];
    updateLocalSteps(activePipelineId, ss);
  }, [activePipeline, activePipelineId, updateLocalSteps]);

  // ── Drag handlers ────────────────────────────────────
  const handleDragStart = (i: number) => (e: React.DragEvent) => { setDragSourceIndex(i); e.dataTransfer.effectAllowed = 'move'; if (e.currentTarget instanceof HTMLElement) e.currentTarget.style.opacity = '0.5'; };
  const handleDragOver = (i: number) => (e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (dragSourceIndex !== null && dragSourceIndex !== i) setDragTargetIndex(i); };
  const handleDragEnd = (e: React.DragEvent) => { if (e.currentTarget instanceof HTMLElement) e.currentTarget.style.opacity = '1'; setDragSourceIndex(null); setDragTargetIndex(null); };
  const handleDrop = (ti: number) => (e: React.DragEvent) => {
    e.preventDefault();
    if (!activePipeline || !activePipelineId || dragSourceIndex === null || dragSourceIndex === ti) return;
    const ss = [...activePipeline.steps];
    const [m] = ss.splice(dragSourceIndex, 1);
    ss.splice(ti, 0, m);
    updateLocalSteps(activePipelineId, ss);
    setDragSourceIndex(null);
    setDragTargetIndex(null);
  };

  // ── UI toggles ───────────────────────────────────────
  const toggleExpand = (id: string) => setExpandedSteps(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const togglePreview = (id: string) => setPreviewSteps(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const expandAll = () => { if (activePipeline) setExpandedSteps(new Set(activePipeline.steps.map(s => s.id))); };
  const collapseAll = () => setExpandedSteps(new Set());

  // ── RUN PIPELINE → FastAPI ───────────────────────────
  const runPipeline = useCallback(async () => {
    if (!activePipeline || !activePipelineId || isRunning) return;
    setIsRunning(true);

    // Set all enabled steps to 'running'
    const runningSteps = activePipeline.steps.map(s =>
      s.enabled ? { ...s, status: 'running' as const, error: undefined, duration: undefined, preview: undefined } : { ...s, status: 'idle' as const }
    );
    setLocalSteps(prev => ({ ...prev, [activePipelineId]: runningSteps }));

    try {
      const res = await fetch(`${API_BASE}/api/pipeline/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pipeline_id: activePipelineId,
          steps: activePipeline.steps.map(s => ({
            type: s.type,
            category: s.category,
            label: s.label,
            description: s.description,
            enabled: s.enabled,
            config: s.config,
          })),
          data: null, // TODO: connect to actual data source
        }),
      });

      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const result = await res.json();

      // Apply results to local steps
      const updatedSteps = activePipeline.steps.map((step, i) => {
        const stepResult = result.step_results?.find((r: any) => r.step_index === i);
        if (!stepResult) return { ...step, status: 'idle' as const };
        return {
          ...step,
          status: stepResult.status as PipelineStep['status'],
          duration: stepResult.duration_ms,
          error: stepResult.error || undefined,
          preview: stepResult.preview || undefined,
        };
      });
      setLocalSteps(prev => ({ ...prev, [activePipelineId]: updatedSteps }));

      // Save run result to Firestore
      await updatePipelineRunResult(activePipelineId, result.status, result.finished_at);

      if (result.status === 'completed') {
        toast({ title: 'Pipeline Completed', description: `${result.steps_succeeded} steps executed in ${(result.total_duration_ms / 1000).toFixed(1)}s` });
      } else {
        const failedStep = result.step_results?.find((r: any) => r.status === 'error');
        toast({ title: 'Pipeline Failed', description: failedStep?.error || 'Unknown error', variant: 'destructive' });
      }
    } catch (e: any) {
      toast({ title: 'Pipeline Error', description: e.message || 'Failed to connect to server', variant: 'destructive' });
      // Reset steps to idle
      const resetSteps = activePipeline.steps.map(s => ({ ...s, status: 'idle' as const }));
      setLocalSteps(prev => ({ ...prev, [activePipelineId]: resetSteps }));
    } finally {
      setIsRunning(false);
    }
  }, [activePipeline, activePipelineId, isRunning, updatePipelineRunResult, toast]);

  // ── Reset steps ──────────────────────────────────────
  const resetSteps = useCallback(() => {
    if (!activePipeline || !activePipelineId) return;
    const reset = activePipeline.steps.map(s => ({ ...s, status: 'idle' as const, error: undefined, duration: undefined, preview: undefined }));
    setLocalSteps(prev => ({ ...prev, [activePipelineId]: reset }));
    setPreviewSteps(new Set());
  }, [activePipeline, activePipelineId]);

  // ── Export pipeline as JSON ──────────────────────────
  const exportPipeline = useCallback(() => {
    if (!activePipeline) return;
    const d = {
      name: activePipeline.name, description: activePipeline.description,
      steps: activePipeline.steps.map(s => ({ type: s.type, category: s.category, label: s.label, description: s.description, enabled: s.enabled, config: s.config })),
    };
    const blob = new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${activePipeline.name.replace(/\s+/g, '_').toLowerCase()}.pipeline.json`;
    a.click();
    toast({ title: 'Exported', description: 'Pipeline JSON downloaded' });
  }, [activePipeline, toast]);

  // ── Import pipeline from JSON → Firestore ────────────
  const importPipeline = useCallback(async () => {
    try {
      const d = JSON.parse(importJson);
      if (!d.name || !Array.isArray(d.steps)) throw new Error('Invalid format');
      const id = await fsCreate({
        name: d.name,
        description: d.description || '',
        steps: d.steps.map((s: any) => ({
          type: s.type, category: s.category, label: s.label,
          description: s.description || '', enabled: s.enabled !== false, config: s.config || {},
        })),
      });
      setActivePipelineId(id);
      setShowImportDialog(false);
      setImportJson('');
      toast({ title: 'Imported', description: `${d.name} with ${d.steps.length} steps` });
    } catch {
      toast({ title: 'Import Failed', description: 'Invalid JSON format', variant: 'destructive' });
    }
  }, [importJson, fsCreate, toast]);

  // ── Inline name editing ──────────────────────────────
  const startEditingName = () => { if (!activePipeline) return; setEditNameValue(activePipeline.name); setEditingName(true); setTimeout(() => nameInputRef.current?.focus(), 50); };
  const saveEditedName = () => { if (editNameValue.trim()) updatePipelineMeta({ name: editNameValue.trim() }); setEditingName(false); };
  const openAddStepAt = (i: number) => { setAddStepInsertIndex(i); setShowAddStep(true); };

  // ── Filtered templates ───────────────────────────────
  const filteredTemplates = useMemo(() => {
    let t = addStepCategory === 'all' ? STEP_TEMPLATES : STEP_TEMPLATES.filter(t => t.category === addStepCategory);
    if (stepSearch) { const q = stepSearch.toLowerCase(); t = t.filter(t => t.label.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)); }
    return t;
  }, [addStepCategory, stepSearch]);

  const stepCounts = useMemo(() => {
    if (!activePipeline) return {};
    const c: Record<string, number> = {};
    activePipeline.steps.forEach(s => { c[s.category] = (c[s.category] || 0) + 1; });
    return c;
  }, [activePipeline]);

  // ── Loading state ────────────────────────────────────
  if (pipelinesLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading pipelines...</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <Sidebar>
          <SidebarHeader><div className="flex items-center gap-2"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary"><Workflow className="h-6 w-6 text-primary-foreground" /></div><div><h1 className="text-lg font-headline font-bold">Pipeline</h1><p className="text-xs text-muted-foreground">Data Studio</p></div></div></SidebarHeader>
          <SidebarContent><ScrollArea className="flex-1"><div className="p-4 space-y-4">
            <div className="flex gap-2"><Button className="flex-1" size="sm" onClick={() => setShowNewPipelineDialog(true)}><Plus className="mr-2 w-4 h-4" />New</Button><Button variant="outline" size="sm" onClick={() => setShowImportDialog(true)}><Import className="w-4 h-4" /></Button></div>
            {pipelines.length > 3 && <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" /><Input className="h-8 pl-8 text-xs" placeholder="Search pipelines..." value={pipelineSearch} onChange={e => setPipelineSearch(e.target.value)} /></div>}
            <div className="space-y-2">
              {pipelines.filter(p => !pipelineSearch || p.name.toLowerCase().includes(pipelineSearch.toLowerCase())).map(pipeline => (
                <Card key={pipeline.id} className={cn("cursor-pointer transition-colors", pipeline.id === activePipelineId ? 'border-primary bg-primary/5' : 'hover:bg-muted/50')} onClick={() => setActivePipelineId(pipeline.id)}>
                  <CardContent className="p-3"><div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{pipeline.name}</p><p className="text-xs text-muted-foreground mt-0.5">{pipeline.steps.length} steps{pipeline.lastRun && <> • Last: {new Date(pipeline.lastRun).toLocaleDateString()}</>}</p></div>
                    <div className="flex items-center gap-1 ml-2">
                      {{ idle: <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />, running: <Loader2 className="w-3 h-3 animate-spin text-blue-500" />, completed: <CheckCircle2 className="w-3 h-3 text-emerald-500" />, failed: <XCircle className="w-3 h-3 text-red-500" /> }[pipeline.status]}
                      <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={e => e.stopPropagation()}><MoreVertical className="w-3 h-3" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end"><DropdownMenuItem onClick={e => { e.stopPropagation(); deletePipeline(pipeline.id); }} className="text-red-600"><Trash2 className="w-4 h-4 mr-2" />Delete</DropdownMenuItem></DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div></CardContent>
                </Card>
              ))}
              {pipelines.length === 0 && <div className="text-center py-8 text-muted-foreground"><Workflow className="w-8 h-8 mx-auto mb-2 opacity-30" /><p className="text-xs">No pipelines yet</p></div>}
            </div>
            <Separator />
            <div className="space-y-1">
              <Button variant="ghost" size="sm" className="w-full justify-start text-xs h-8" asChild><a href="/dashboard/data-studio/editor"><Table2 className="mr-2 w-3 h-3" />Data Editor</a></Button>
              <Button variant="ghost" size="sm" className="w-full justify-start text-xs h-8" asChild><a href="/dashboard/data-studio/integration"><Link2 className="mr-2 w-3 h-3" />Integration</a></Button>
            </div>
          </div></ScrollArea></SidebarContent>
          <SidebarFooter><div className="px-4 py-2 text-xs text-muted-foreground text-center">{pipelines.length} pipeline{pipelines.length !== 1 ? 's' : ''}</div></SidebarFooter>
        </Sidebar>

        <SidebarInset><div className="p-4 md:p-6 h-full flex flex-col gap-4">
          <header className="flex items-center justify-between border-b pb-4">
            <SidebarTrigger className="md:hidden" />
            <div className="flex-1 flex justify-center"><h1 className="text-xl font-headline font-bold flex items-center gap-2"><Workflow className="h-5 w-5" />Data Pipeline</h1></div>
            <UserNav />
          </header>

          {!activePipeline ? (
            <Card className="flex-1"><div className="flex flex-col items-center justify-center h-full py-16">
              <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mb-6"><Workflow className="w-10 h-10 text-primary/60" /></div>
              <h3 className="text-xl font-semibold text-primary mb-2">No Pipeline Selected</h3>
              <p className="text-muted-foreground mb-6">Create a new pipeline or select one from the sidebar</p>
              <div className="flex gap-3"><Button onClick={() => setShowNewPipelineDialog(true)}><Plus className="mr-2 w-4 h-4" />Create Pipeline</Button><Button variant="outline" onClick={() => setShowImportDialog(true)}><Import className="mr-2 w-4 h-4" />Import JSON</Button></div>
            </div></Card>
          ) : (<>
            {/* Pipeline Info */}
            <Card><CardHeader className="pb-3"><div className="flex items-center justify-between">
              <div className="flex-1">
                {editingName ? (
                  <div className="flex items-center gap-2"><Input ref={nameInputRef} className="h-8 text-lg font-bold w-64" value={editNameValue} onChange={e => setEditNameValue(e.target.value)} onBlur={saveEditedName} onKeyDown={e => { if (e.key === 'Enter') saveEditedName(); if (e.key === 'Escape') setEditingName(false); }} /></div>
                ) : (
                  <CardTitle className="flex items-center gap-2 cursor-pointer group" onClick={startEditingName}><Workflow className="h-5 w-5" />{activePipeline.name}<Pencil className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" /></CardTitle>
                )}
                {activePipeline.description && <CardDescription className="mt-1">{activePipeline.description}</CardDescription>}
              </div>
              <div className="flex items-center gap-2">
                <div className="hidden lg:flex items-center gap-1">{Object.entries(stepCounts).map(([cat, count]) => <Badge key={cat} variant="outline" className={cn("text-xs", CATEGORY_COLORS[cat as StepCategory]?.text)}>{CATEGORY_LABELS[cat as StepCategory]}: {count}</Badge>)}</div>
                <Separator orientation="vertical" className="h-6 hidden lg:block" />
                <TooltipProvider delayDuration={300}><Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" className="h-8 w-8" onClick={expandAll} disabled={!activePipeline.steps.length}><Maximize2 className="w-3.5 h-3.5" /></Button></TooltipTrigger><TooltipContent><p className="text-xs">Expand All</p></TooltipContent></Tooltip></TooltipProvider>
                <TooltipProvider delayDuration={300}><Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" className="h-8 w-8" onClick={collapseAll} disabled={!expandedSteps.size}><Minimize2 className="w-3.5 h-3.5" /></Button></TooltipTrigger><TooltipContent><p className="text-xs">Collapse All</p></TooltipContent></Tooltip></TooltipProvider>
                <TooltipProvider delayDuration={300}><Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" className="h-8 w-8" onClick={exportPipeline} disabled={!activePipeline.steps.length}><Download className="w-3.5 h-3.5" /></Button></TooltipTrigger><TooltipContent><p className="text-xs">Export JSON</p></TooltipContent></Tooltip></TooltipProvider>
                <Separator orientation="vertical" className="h-6" />
                <Button variant="outline" size="sm" onClick={resetSteps} disabled={isRunning}><RefreshCw className="w-4 h-4 mr-2" />Reset</Button>
                <Button size="sm" onClick={runPipeline} disabled={isRunning || activePipeline.steps.length === 0} className={isRunning ? 'animate-pulse' : ''}>
                  {isRunning ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Running...</> : <><Play className="w-4 h-4 mr-2" />Run Pipeline</>}
                </Button>
              </div>
            </div></CardHeader>
            {activePipeline.lastRun && <CardContent className="pt-0 pb-3"><div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />Last run: {new Date(activePipeline.lastRun).toLocaleString()}</span>
              <span className="flex items-center gap-1">{{ idle: <><div className="w-2 h-2 rounded-full bg-muted-foreground/30" /> Idle</>, running: <><Loader2 className="w-3 h-3 animate-spin text-blue-500" /> Running</>, completed: <><CheckCircle2 className="w-3 h-3 text-emerald-500" /> Completed</>, failed: <><XCircle className="w-3 h-3 text-red-500" /> Failed</> }[activePipeline.status]}</span>
              <span>{activePipeline.steps.filter(s => s.status === 'success').length} / {activePipeline.steps.filter(s => s.enabled).length} steps succeeded</span>
              {activePipeline.steps.some(s => s.duration) && <span className="flex items-center gap-1"><Timer className="w-3 h-3" />Total: {(activePipeline.steps.reduce((sum, s) => sum + (s.duration || 0), 0) / 1000).toFixed(1)}s</span>}
            </div></CardContent>}
            </Card>

            {/* Steps */}
            <Card className="flex-1 overflow-hidden"><ScrollArea className="h-full"><div className="p-6">
              {activePipeline.steps.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mb-4"><Plus className="w-8 h-8 text-muted-foreground" /></div>
                  <p className="text-muted-foreground mb-4">Add steps to your pipeline to get started</p>
                  <Button onClick={() => setShowAddStep(true)}><Plus className="mr-2 w-4 h-4" />Add First Step</Button>
                </div>
              ) : (
                <div className="space-y-0 max-w-3xl mx-auto">
                  {activePipeline.steps.map((step, index) => (
                    <React.Fragment key={step.id}>
                      {index === 0 && <InlineAddButton onClick={() => openAddStepAt(0)} />}
                      <PipelineStepCard step={step} index={index} isExpanded={expandedSteps.has(step.id)} showPreview={previewSteps.has(step.id)}
                        onToggleExpand={() => toggleExpand(step.id)} onTogglePreview={() => togglePreview(step.id)}
                        onUpdate={u => updateStep(step.id, u)} onDelete={() => deleteStep(step.id)} onDuplicate={() => duplicateStep(step.id)}
                        onMoveUp={() => moveStep(step.id, 'up')} onMoveDown={() => moveStep(step.id, 'down')}
                        isFirst={index === 0} isLast={index === activePipeline.steps.length - 1}
                        onDragStart={handleDragStart(index)} onDragOver={handleDragOver(index)} onDragEnd={handleDragEnd} onDrop={handleDrop(index)}
                        isDragTarget={dragTargetIndex === index} />
                      <InlineAddButton onClick={() => openAddStepAt(index + 1)} />
                    </React.Fragment>
                  ))}
                  <div className="flex justify-center pt-2">
                    <Button variant="outline" size="sm" onClick={() => setShowAddStep(true)} className="border-dashed">
                      <Plus className="mr-2 w-4 h-4" />Add Step
                    </Button>
                  </div>
                </div>
              )}
            </div></ScrollArea></Card>

            <div className="text-xs text-muted-foreground flex justify-between">
              <span>{activePipeline.steps.length} steps ({activePipeline.steps.filter(s => s.enabled).length} enabled)</span>
              <span>Updated: {new Date(activePipeline.updatedAt).toLocaleString()}</span>
            </div>
          </>)}
        </div></SidebarInset>
      </div>

      {/* New Pipeline Dialog */}
      <Dialog open={showNewPipelineDialog} onOpenChange={setShowNewPipelineDialog}><DialogContent>
        <DialogHeader><DialogTitle>New Pipeline</DialogTitle><DialogDescription>Create a new data processing pipeline</DialogDescription></DialogHeader>
        <div className="space-y-4 py-4">
          <div><Label>Name</Label><Input className="mt-1" placeholder="My Pipeline" value={newPipelineName} onChange={e => setNewPipelineName(e.target.value)} onKeyDown={e => e.key === 'Enter' && createPipeline()} /></div>
          <div><Label>Description (optional)</Label><Textarea className="mt-1" placeholder="What this pipeline does..." rows={2} value={newPipelineDesc} onChange={e => setNewPipelineDesc(e.target.value)} /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setShowNewPipelineDialog(false)}>Cancel</Button><Button onClick={createPipeline} disabled={!newPipelineName.trim()}>Create</Button></DialogFooter>
      </DialogContent></Dialog>

      {/* Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}><DialogContent>
        <DialogHeader><DialogTitle>Import Pipeline</DialogTitle><DialogDescription>Paste a pipeline JSON to import</DialogDescription></DialogHeader>
        <div className="py-4"><Textarea className="font-mono text-xs" rows={10} placeholder='{"name": "...", "steps": [...]}' value={importJson} onChange={e => setImportJson(e.target.value)} /></div>
        <DialogFooter><Button variant="outline" onClick={() => { setShowImportDialog(false); setImportJson(''); }}>Cancel</Button><Button onClick={importPipeline} disabled={!importJson.trim()}>Import</Button></DialogFooter>
      </DialogContent></Dialog>

      {/* Add Step Dialog */}
      <Dialog open={showAddStep} onOpenChange={o => { setShowAddStep(o); if (!o) { setAddStepInsertIndex(null); setStepSearch(''); } }}><DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader><DialogTitle>Add Step</DialogTitle><DialogDescription>{addStepInsertIndex != null ? `Insert at position ${addStepInsertIndex + 1}` : 'Append to end of pipeline'}</DialogDescription></DialogHeader>
        <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input className="pl-10" placeholder="Search steps..." value={stepSearch} onChange={e => setStepSearch(e.target.value)} /></div>
        <div className="flex gap-2 flex-wrap">
          <Button variant={addStepCategory === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setAddStepCategory('all')}>All</Button>
          {(Object.keys(CATEGORY_LABELS) as StepCategory[]).map(cat => <Button key={cat} variant={addStepCategory === cat ? 'default' : 'outline'} size="sm" onClick={() => setAddStepCategory(cat)} className={addStepCategory !== cat ? CATEGORY_COLORS[cat].text : ''}>{CATEGORY_LABELS[cat]}</Button>)}
        </div>
        <ScrollArea className="max-h-[50vh]"><div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pr-2">
          {filteredTemplates.map(t => { const colors = CATEGORY_COLORS[t.category]; return (
            <Card key={t.type} className={cn("cursor-pointer hover:shadow-md transition-all", colors.border, "hover:scale-[1.02]")} onClick={() => addStep(t, addStepInsertIndex)}>
              <CardContent className="p-4"><div className="flex items-start gap-3">
                <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0", colors.badge)}>{t.icon}</div>
                <div className="flex-1 min-w-0"><p className="text-sm font-medium">{t.label}</p><p className="text-xs text-muted-foreground mt-0.5">{t.description}</p><Badge variant="outline" className={cn("text-xs mt-2", colors.text)}>{CATEGORY_LABELS[t.category]}</Badge></div>
              </div></CardContent>
            </Card>
          ); })}
          {filteredTemplates.length === 0 && <div className="col-span-2 text-center py-8 text-muted-foreground"><Search className="w-6 h-6 mx-auto mb-2 opacity-30" /><p className="text-sm">No matching steps found</p></div>}
        </div></ScrollArea>
      </DialogContent></Dialog>
    </SidebarProvider>
  );
}