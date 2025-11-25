'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Trash2, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Save, Search, Download, FilePlus, AlertTriangle, Undo, Database, Filter, BarChart3, Settings, ChevronLeft, ChevronRight, Eye, EyeOff } from 'lucide-react';
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

type TableRowData = (string | number | null)[];
type TableData = {
    headers: string[];
    rows: TableRowData[];
};

type ColumnStats = {
  type: 'numeric' | 'text';
  missing: number;
  unique: number;
  min?: number;
  max?: number;
  mean?: number;
};

export default function DataPreprocessingPage() {
  const { toast } = useToast();
  const [tableData, setTableData] = useState<TableData>({ headers: [], rows: [] });
  const [selectedCols, setSelectedCols] = useState<Set<number>>(new Set());
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [fileName, setFileName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [transformHistory, setTransformHistory] = useState<TableData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [fillMethod, setFillMethod] = useState('mean');
  const [transformType, setTransformType] = useState('');
  const [columnStats, setColumnStats] = useState<Map<number, ColumnStats>>(new Map());
  const [showStats, setShowStats] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Calculate column statistics
  const calculateColumnStats = useCallback(() => {
    const stats = new Map<number, ColumnStats>();
    
    tableData.headers.forEach((header, colIdx) => {
      const values = tableData.rows.map(row => row[colIdx]);
      const nonNull = values.filter(v => v !== null && v !== undefined && String(v).trim() !== '');
      const numericValues = nonNull.map(v => parseFloat(String(v))).filter(n => !isNaN(n));
      const isNumeric = numericValues.length > nonNull.length * 0.5;
      
      const stat: ColumnStats = {
        type: isNumeric ? 'numeric' : 'text',
        missing: values.length - nonNull.length,
        unique: new Set(nonNull.map(v => String(v))).size,
      };
      
      if (isNumeric && numericValues.length > 0) {
        stat.min = Math.min(...numericValues);
        stat.max = Math.max(...numericValues);
        stat.mean = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
      }
      
      stats.set(colIdx, stat);
    });
    
    setColumnStats(stats);
  }, [tableData]);

  useEffect(() => {
    if (tableData.rows.length > 0) {
      calculateColumnStats();
    }
  }, [tableData, calculateColumnStats]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsLoading(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const parsed = Papa.parse(content, { header: false, skipEmptyLines: true });
      
      if (parsed.data.length > 0) {
        const headers = (parsed.data[0] as string[]).map((h, i) => h || `Column ${i + 1}`);
        const rows = parsed.data.slice(1) as TableRowData[];
        setTableData({ headers, rows });
        setTransformHistory([]);
        toast({ 
          title: '✓ File Loaded', 
          description: `${rows.length} rows × ${headers.length} columns loaded.`,
          className: 'bg-blue-50 border-blue-200'
        });
      }
      setIsLoading(false);
    };
    reader.readAsText(file);
  };
  
  const createSampleData = () => {
    const headers = ['ID', 'Name', 'Age', 'City', 'Score', 'Grade', 'Status'];
    const rows = [
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
    ];
    setTableData({ headers, rows: rows as TableRowData[] });
    setFileName('Sample Data');
    setTransformHistory([]);
    toast({ 
      title: '✓ Sample Data Loaded', 
      description: '10 rows with various data types.',
      className: 'bg-blue-50 border-blue-200'
    });
  };

  const handleCellChange = (rowIndex: number, colIndex: number, value: string) => {
    const newRows = [...tableData.rows];
    newRows[rowIndex][colIndex] = value;
    setTableData({ ...tableData, rows: newRows });
  };

  const handleHeaderChange = (colIndex: number, value: string) => {
    const newHeaders = [...tableData.headers];
    newHeaders[colIndex] = value;
    setTableData({ ...tableData, headers: newHeaders });
  };

  const toggleColumn = (colIndex: number) => {
    const newSelected = new Set(selectedCols);
    if (newSelected.has(colIndex)) {
      newSelected.delete(colIndex);
    } else {
      newSelected.add(colIndex);
    }
    setSelectedCols(newSelected);
  };

  const toggleRow = (rowIndex: number) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(rowIndex)) {
      newSelected.delete(rowIndex);
    } else {
      newSelected.add(rowIndex);
    }
    setSelectedRows(newSelected);
  };

  const toggleAllRows = () => {
    if (selectedRows.size === tableData.rows.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(tableData.rows.map((_, i) => i)));
    }
  };

  const saveState = () => {
    setTransformHistory([...transformHistory, { 
      headers: [...tableData.headers], 
      rows: tableData.rows.map(row => [...row]) 
    }]);
  };

  const addRowAbove = () => {
    if (selectedRows.size === 0) {
      toast({ title: 'No Selection', description: 'Please select a row first.', variant: 'destructive' });
      return;
    }
    const targetRow = Math.min(...Array.from(selectedRows));
    const newRow = new Array(tableData.headers.length).fill('');
    const newRows = [...tableData.rows];
    newRows.splice(targetRow, 0, newRow);
    setTableData({ ...tableData, rows: newRows });
    setSelectedRows(new Set());
    toast({ title: '✓ Row Added', description: 'New row inserted above selection.' });
  };

  const addRowBelow = () => {
    if (selectedRows.size === 0) {
      toast({ title: 'No Selection', description: 'Please select a row first.', variant: 'destructive' });
      return;
    }
    const targetRow = Math.max(...Array.from(selectedRows));
    const newRow = new Array(tableData.headers.length).fill('');
    const newRows = [...tableData.rows];
    newRows.splice(targetRow + 1, 0, newRow);
    setTableData({ ...tableData, rows: newRows });
    setSelectedRows(new Set());
    toast({ title: '✓ Row Added', description: 'New row inserted below selection.' });
  };

  const deleteSelectedRows = () => {
    if (selectedRows.size === 0) {
      toast({ title: 'No Selection', description: 'Please select rows to delete.', variant: 'destructive' });
      return;
    }
    const indices = Array.from(selectedRows).sort((a, b) => b - a);
    const newRows = [...tableData.rows];
    indices.forEach(idx => newRows.splice(idx, 1));
    setTableData({ ...tableData, rows: newRows });
    setSelectedRows(new Set());
    toast({ title: '✓ Rows Deleted', description: `${indices.length} row(s) removed.` });
  };

  const addColumnLeft = () => {
    if (selectedCols.size === 0) {
      toast({ title: 'No Selection', description: 'Please select a column first.', variant: 'destructive' });
      return;
    }
    const targetCol = Math.min(...Array.from(selectedCols));
    const newHeaders = [...tableData.headers];
    newHeaders.splice(targetCol, 0, `Column ${tableData.headers.length + 1}`);
    const newRows = tableData.rows.map(row => {
      const newRow = [...row];
      newRow.splice(targetCol, 0, '');
      return newRow;
    });
    setTableData({ headers: newHeaders, rows: newRows });
    setSelectedCols(new Set());
    toast({ title: '✓ Column Added', description: 'New column inserted to the left.' });
  };

  const addColumnRight = () => {
    if (selectedCols.size === 0) {
      toast({ title: 'No Selection', description: 'Please select a column first.', variant: 'destructive' });
      return;
    }
    const targetCol = Math.max(...Array.from(selectedCols));
    const newHeaders = [...tableData.headers];
    newHeaders.splice(targetCol + 1, 0, `Column ${tableData.headers.length + 1}`);
    const newRows = tableData.rows.map(row => {
      const newRow = [...row];
      newRow.splice(targetCol + 1, 0, '');
      return newRow;
    });
    setTableData({ headers: newHeaders, rows: newRows });
    setSelectedCols(new Set());
    toast({ title: '✓ Column Added', description: 'New column inserted to the right.' });
  };

  const deleteSelectedColumns = () => {
    if (selectedCols.size === 0) {
      toast({ title: 'No Selection', description: 'Please select columns to delete.', variant: 'destructive' });
      return;
    }
    const indices = Array.from(selectedCols).sort((a, b) => b - a);
    const newHeaders = [...tableData.headers];
    const newRows = tableData.rows.map(row => [...row]);
    
    indices.forEach(idx => {
      newHeaders.splice(idx, 1);
      newRows.forEach(row => row.splice(idx, 1));
    });
    
    setTableData({ headers: newHeaders, rows: newRows });
    setSelectedCols(new Set());
    toast({ title: '✓ Columns Deleted', description: `${indices.length} column(s) removed.` });
  };

  const fillMissingValues = () => {
    if (selectedCols.size === 0) {
      toast({ title: 'No Selection', description: 'Please select columns to fill.', variant: 'destructive' });
      return;
    }

    saveState();
    const newRows = tableData.rows.map(row => [...row]);

    selectedCols.forEach(colIdx => {
      const values = newRows.map(row => row[colIdx]).filter(v => v !== null && v !== undefined && String(v).trim() !== '');
      const numericValues = values.map(v => parseFloat(String(v))).filter(n => !isNaN(n));
      const isNumericColumn = numericValues.length > values.length * 0.5;

      let fillValue: any = '';

      switch (fillMethod) {
        case 'mean':
          if (isNumericColumn && numericValues.length > 0) {
            fillValue = (numericValues.reduce((a, b) => a + b, 0) / numericValues.length).toFixed(2);
          } else {
            const freq: { [key: string]: number } = {};
            values.forEach(v => freq[String(v)] = (freq[String(v)] || 0) + 1);
            fillValue = values.length > 0 ? Object.keys(freq).reduce((a, b) => freq[a] > freq[b] ? a : b, '') : '';
          }
          break;

        case 'median':
          if (isNumericColumn && numericValues.length > 0) {
            const sorted = [...numericValues].sort((a, b) => a - b);
            const mid = Math.floor(sorted.length / 2);
            fillValue = sorted.length % 2 === 0 ? ((sorted[mid - 1] + sorted[mid]) / 2).toFixed(2) : sorted[mid].toFixed(2);
          } else {
            const freq: { [key: string]: number } = {};
            values.forEach(v => freq[String(v)] = (freq[String(v)] || 0) + 1);
            fillValue = values.length > 0 ? Object.keys(freq).reduce((a, b) => freq[a] > freq[b] ? a : b, '') : '';
          }
          break;

        case 'mode':
          if (values.length > 0) {
            const freq: { [key: string]: number } = {};
            values.forEach(v => freq[String(v)] = (freq[String(v)] || 0) + 1);
            fillValue = Object.keys(freq).reduce((a, b) => freq[a] > freq[b] ? a : b, '');
          }
          break;

        case 'zero':
          fillValue = isNumericColumn ? '0' : '';
          break;

        case 'forward':
          let lastVal: any = '';
          newRows.forEach(row => {
            if (row[colIdx] === null || row[colIdx] === undefined || String(row[colIdx]).trim() === '') {
              row[colIdx] = lastVal;
            } else {
              lastVal = row[colIdx];
            }
          });
          return;

        case 'backward':
          let nextVal: any = '';
          for (let i = newRows.length - 1; i >= 0; i--) {
            if (newRows[i][colIdx] === null || newRows[i][colIdx] === undefined || String(newRows[i][colIdx]).trim() === '') {
              newRows[i][colIdx] = nextVal;
            } else {
              nextVal = newRows[i][colIdx];
            }
          }
          return;
      }

      if (fillMethod !== 'forward' && fillMethod !== 'backward') {
        newRows.forEach(row => {
          if (row[colIdx] === null || row[colIdx] === undefined || String(row[colIdx]).trim() === '') {
            row[colIdx] = fillValue;
          }
        });
      }
    });

    setTableData({ ...tableData, rows: newRows });
    toast({ 
      title: '✓ Missing Values Filled', 
      description: `Applied ${fillMethod} method to ${selectedCols.size} column(s).`,
      className: 'bg-blue-50 border-blue-200'
    });
  };

  const applyTransformation = () => {
    if (!transformType || selectedCols.size === 0) {
      toast({ title: 'Invalid Selection', description: 'Select columns and transformation type.', variant: 'destructive' });
      return;
    }

    saveState();
    const newRows = tableData.rows.map(row => [...row]);

    selectedCols.forEach(colIdx => {
      const values = newRows.map(row => parseFloat(String(row[colIdx]))).filter(v => !isNaN(v));
      
      if (values.length === 0) return;

      let transformed: number[] = [];

      switch (transformType) {
        case 'log':
          transformed = values.map(v => v > 0 ? Math.log(v) : NaN);
          break;
        case 'log10':
          transformed = values.map(v => v > 0 ? Math.log10(v) : NaN);
          break;
        case 'sqrt':
          transformed = values.map(v => v >= 0 ? Math.sqrt(v) : NaN);
          break;
        case 'square':
          transformed = values.map(v => v * v);
          break;
        case 'zscore':
          const mean = values.reduce((a, b) => a + b, 0) / values.length;
          const std = Math.sqrt(values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (values.length - 1));
          transformed = values.map(v => std !== 0 ? (v - mean) / std : 0);
          break;
        case 'minmax':
          const min = Math.min(...values);
          const max = Math.max(...values);
          const range = max - min;
          transformed = values.map(v => range !== 0 ? (v - min) / range : 0);
          break;
        case 'abs':
          transformed = values.map(v => Math.abs(v));
          break;
        case 'round':
          transformed = values.map(v => Math.round(v));
          break;
      }

      let idx = 0;
      newRows.forEach(row => {
        const val = parseFloat(String(row[colIdx]));
        if (!isNaN(val)) {
          const newVal = transformed[idx++];
          row[colIdx] = isNaN(newVal) ? '' : (transformType === 'round' ? newVal.toString() : newVal.toFixed(4));
        }
      });
    });

    setTableData({ ...tableData, rows: newRows });
    toast({ 
      title: '✓ Transformation Applied', 
      description: `${transformType} applied to ${selectedCols.size} column(s).`,
      className: 'bg-blue-50 border-blue-200'
    });
  };

  const undoTransformation = () => {
    if (transformHistory.length === 0) {
      toast({ title: 'Nothing to Undo', description: 'No transformation history available.' });
      return;
    }
    const lastState = transformHistory[transformHistory.length - 1];
    setTableData(lastState);
    setTransformHistory(transformHistory.slice(0, -1));
    toast({ 
      title: '✓ Undo Successful', 
      description: 'Reverted to previous state.',
      className: 'bg-blue-50 border-blue-200'
    });
  };
  
  const downloadCSV = () => {
    const csv = Papa.unparse({
        fields: tableData.headers,
        data: tableData.rows
    });
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName.replace(/\.[^/.]+$/, '') + '_processed.csv' || 'processed_data.csv';
    link.click();
    toast({ 
      title: '✓ CSV Exported', 
      description: 'File downloaded successfully.',
      className: 'bg-blue-50 border-blue-200'
    });
  };

  const filteredRows = tableData.rows.map((row, idx) => ({ row, idx })).filter(({ row }) => {
    if (!searchTerm) return true;
    return row.some(cell => String(cell).toLowerCase().includes(searchTerm.toLowerCase()));
  });

  const totalMissing = Array.from(columnStats.values()).reduce((sum, stat) => sum + stat.missing, 0);

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-blue-50 via-white to-slate-50">
      {/* Sidebar */}
      <aside className={`${sidebarCollapsed ? 'w-0' : 'w-80'} transition-all duration-300 border-r border-blue-100 bg-white shadow-sm flex flex-col overflow-hidden`}>
        <div className="p-4 border-b border-blue-100 bg-gradient-to-r from-blue-500 to-blue-600">
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              <h2 className="font-semibold">Data Tools</h2>
            </div>
          </div>
        </div>
        
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {/* File Operations */}
            <Card className="border-blue-100 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2 text-blue-700">
                  <FilePlus className="w-4 h-4" />
                  File Operations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button 
                  onClick={() => fileInputRef.current?.click()} 
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  size="sm"
                >
                  <FilePlus className="mr-2 w-4 h-4" />Upload CSV
                </Button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  className="hidden" 
                  accept=".csv,.txt,.tsv" 
                />
                <Button 
                  variant="outline" 
                  onClick={createSampleData} 
                  className="w-full border-blue-200 hover:bg-blue-50"
                  size="sm"
                >
                  Load Sample Data
                </Button>
              </CardContent>
            </Card>
            
            {/* Row Operations */}
            <Card className="border-blue-100 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2 text-blue-700">
                  <Settings className="w-4 h-4" />
                  Row Operations
                </CardTitle>
                <CardDescription className="text-xs">
                  {selectedRows.size > 0 && `${selectedRows.size} row(s) selected`}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={addRowAbove} 
                  disabled={selectedRows.size === 0}
                  className="border-blue-200 hover:bg-blue-50"
                >
                  <ArrowUp className="mr-1 w-3 h-3"/>Above
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={addRowBelow} 
                  disabled={selectedRows.size === 0}
                  className="border-blue-200 hover:bg-blue-50"
                >
                  <ArrowDown className="mr-1 w-3 h-3"/>Below
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm" 
                  className="col-span-2" 
                  onClick={deleteSelectedRows} 
                  disabled={selectedRows.size === 0}
                >
                  <Trash2 className="mr-2 w-3 h-3"/>Delete Rows
                </Button>
              </CardContent>
            </Card>
            
            {/* Column Operations */}
            <Card className="border-blue-100 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2 text-blue-700">
                  <BarChart3 className="w-4 h-4" />
                  Column Operations
                </CardTitle>
                <CardDescription className="text-xs">
                  {selectedCols.size > 0 && `${selectedCols.size} column(s) selected`}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={addColumnLeft} 
                  disabled={selectedCols.size === 0}
                  className="border-blue-200 hover:bg-blue-50"
                >
                  <ArrowLeft className="mr-1 w-3 h-3"/>Left
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={addColumnRight} 
                  disabled={selectedCols.size === 0}
                  className="border-blue-200 hover:bg-blue-50"
                >
                  <ArrowRight className="mr-1 w-3 h-3"/>Right
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm" 
                  className="col-span-2" 
                  onClick={deleteSelectedColumns} 
                  disabled={selectedCols.size === 0}
                >
                  <Trash2 className="mr-2 w-3 h-3"/>Delete Columns
                </Button>
              </CardContent>
            </Card>
            
            {/* Data Quality */}
            <Card className="border-blue-100 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2 text-blue-700">
                  <AlertTriangle className="w-4 h-4" />
                  Data Quality
                </CardTitle>
                {totalMissing > 0 && (
                  <CardDescription className="text-xs">
                    <Badge variant="destructive" className="text-xs">
                      {totalMissing} missing values
                    </Badge>
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-blue-700">Fill Method</Label>
                  <Select value={fillMethod} onValueChange={setFillMethod}>
                    <SelectTrigger className="h-8 border-blue-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mean">Mean (Numeric)</SelectItem>
                      <SelectItem value="median">Median (Numeric)</SelectItem>
                      <SelectItem value="mode">Mode (Most Frequent)</SelectItem>
                      <SelectItem value="zero">Zero</SelectItem>
                      <SelectItem value="forward">Forward Fill</SelectItem>
                      <SelectItem value="backward">Backward Fill</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  onClick={fillMissingValues} 
                  className="w-full bg-blue-600 hover:bg-blue-700" 
                  size="sm"
                  disabled={selectedCols.size === 0}
                >
                  Fill Selected Columns
                </Button>
              </CardContent>
            </Card>
            
            {/* Data Transformation */}
            <Card className="border-blue-100 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2 text-blue-700">
                  <Filter className="w-4 h-4" />
                  Transform Data
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Select value={transformType} onValueChange={setTransformType}>
                  <SelectTrigger className="h-8 border-blue-200">
                    <SelectValue placeholder="Select transformation..."/>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="log">Natural Log (ln)</SelectItem>
                    <SelectItem value="log10">Log Base 10</SelectItem>
                    <SelectItem value="sqrt">Square Root (√)</SelectItem>
                    <SelectItem value="square">Square (x²)</SelectItem>
                    <SelectItem value="zscore">Z-Score Normalize</SelectItem>
                    <SelectItem value="minmax">Min-Max Scale [0,1]</SelectItem>
                    <SelectItem value="abs">Absolute Value</SelectItem>
                    <SelectItem value="round">Round to Integer</SelectItem>
                  </SelectContent>
                </Select>
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    onClick={applyTransformation} 
                    disabled={!transformType || selectedCols.size === 0}
                    className="bg-blue-600 hover:bg-blue-700"
                    size="sm"
                  >
                    Apply
                  </Button>
                  <Button 
                    onClick={undoTransformation} 
                    variant="outline" 
                    disabled={transformHistory.length === 0}
                    className="border-blue-200 hover:bg-blue-50"
                    size="sm"
                  >
                    <Undo className="mr-1 w-3 h-3"/>Undo
                  </Button>
                </div>
                {transformHistory.length > 0 && (
                  <p className="text-xs text-blue-600 text-center">
                    {transformHistory.length} step(s) in history
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
        
        <div className="p-4 border-t border-blue-100 bg-blue-50">
          <Button 
            onClick={downloadCSV} 
            disabled={tableData.rows.length === 0}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            <Download className="mr-2 w-4 h-4"/> Export CSV
          </Button>
        </div>
      </aside>

      {/* Collapse Toggle */}
      <button
        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        className="absolute left-0 top-1/2 -translate-y-1/2 bg-blue-600 text-white p-2 rounded-r-lg shadow-lg hover:bg-blue-700 transition-all z-10"
        style={{ left: sidebarCollapsed ? '0' : '320px' }}
      >
        {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-blue-100 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-2xl font-bold text-blue-900">
                {fileName || "Data Preprocessing Studio"}
              </h1>
              <p className="text-sm text-blue-600 mt-1">
                {tableData.rows.length > 0 ? (
                  <>
                    {tableData.rows.length} rows × {tableData.headers.length} columns
                    {totalMissing > 0 && (
                      <Badge variant="destructive" className="ml-2 text-xs">
                        {totalMissing} missing
                      </Badge>
                    )}
                  </>
                ) : (
                  'Upload a file or load sample data to get started'
                )}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowStats(!showStats)}
              className="border-blue-200 hover:bg-blue-50"
            >
              {showStats ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
              {showStats ? 'Hide' : 'Show'} Stats
            </Button>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400" />
            <Input 
              placeholder="Search in table..." 
              className="pl-10 border-blue-200 focus:border-blue-400 focus:ring-blue-400" 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
            />
          </div>
        </div>

        {/* Table Container */}
        <div className="flex-1 overflow-auto p-4">
          <div className="border border-blue-100 rounded-lg overflow-hidden bg-white shadow-md">
            <Table>
              <TableHeader className="sticky top-0 bg-gradient-to-r from-blue-50 to-blue-100 z-10">
                <TableRow className="border-b-2 border-blue-200">
                  <TableHead className="w-12 bg-blue-100">
                    <Checkbox 
                      checked={selectedRows.size === tableData.rows.length && tableData.rows.length > 0}
                      onCheckedChange={toggleAllRows}
                      className="border-blue-400"
                    />
                  </TableHead>
                  {tableData.headers.map((header, i) => {
                    const stats = columnStats.get(i);
                    return (
                      <TableHead 
                        key={i} 
                        className={`${selectedCols.has(i) ? 'bg-blue-200' : 'bg-blue-50'} border-l border-blue-200 transition-colors`}
                      >
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Checkbox 
                              checked={selectedCols.has(i)}
                              onCheckedChange={() => toggleColumn(i)}
                              className="border-blue-400"
                            />
                            <Input
                              type="text"
                              value={header}
                              onChange={(e) => handleHeaderChange(i, e.target.value)}
                              className="h-8 border-none focus-visible:ring-1 focus-visible:ring-blue-400 p-1 font-semibold flex-1 bg-transparent"
                            />
                          </div>
                          {showStats && stats && (
                            <div className="text-xs space-y-0.5 text-blue-700 pl-6">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs border-blue-300">
                                  {stats.type}
                                </Badge>
                                {stats.missing > 0 && (
                                  <Badge variant="destructive" className="text-xs">
                                    {stats.missing} missing
                                  </Badge>
                                )}
                              </div>
                              <div>{stats.unique} unique values</div>
                              {stats.type === 'numeric' && stats.mean !== undefined && (
                                <div className="space-y-0.5">
                                  <div>Range: {stats.min?.toFixed(2)} - {stats.max?.toFixed(2)}</div>
                                  <div>Mean: {stats.mean.toFixed(2)}</div>
                                </div>
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
                {filteredRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={tableData.headers.length + 1} className="text-center text-muted-foreground py-16">
                      {tableData.rows.length === 0 ? (
                        <div className="space-y-2">
                          <Database className="w-12 h-12 mx-auto text-blue-300" />
                          <p className="text-lg font-medium text-blue-900">No Data Loaded</p>
                          <p className="text-sm text-blue-600">Upload a CSV file or load sample data to begin</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Search className="w-12 h-12 mx-auto text-blue-300" />
                          <p className="text-lg font-medium text-blue-900">No Results Found</p>
                          <p className="text-sm text-blue-600">Try adjusting your search terms</p>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRows.map(({ row, idx: rowIndex }) => (
                    <TableRow 
                      key={rowIndex} 
                      className={`${selectedRows.has(rowIndex) ? 'bg-yellow-50' : ''} hover:bg-blue-50/50 transition-colors`}
                    >
                      <TableCell className="bg-slate-50">
                        <Checkbox 
                          checked={selectedRows.has(rowIndex)}
                          onCheckedChange={() => toggleRow(rowIndex)}
                          className="border-blue-400"
                        />
                      </TableCell>
                      {row.map((cell, colIndex) => {
                        const isEmpty = cell === null || cell === undefined || String(cell).trim() === '';
                        return (
                          <TableCell 
                            key={colIndex} 
                            className={`
                              ${selectedCols.has(colIndex) ? 'bg-blue-50' : ''} 
                              ${isEmpty ? 'bg-red-50' : ''} 
                              border-l border-blue-100 transition-colors
                            `}
                          >
                            <Input
                              type="text"
                              value={cell === null || cell === undefined ? '' : String(cell)}
                              onChange={(e) => handleCellChange(rowIndex, colIndex, e.target.value)}
                              className={`h-8 border-none focus-visible:ring-1 focus-visible:ring-blue-400 p-1 ${isEmpty ? 'text-red-500 placeholder:text-red-400' : ''}`}
                              placeholder={isEmpty ? 'missing' : ''}
                            />
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Footer Stats */}
        <div className="bg-white border-t border-blue-100 px-4 py-2 text-xs text-blue-700 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4">
            <span className="font-medium">
              {filteredRows.length} / {tableData.rows.length} rows
            </span>
            <span>•</span>
            <span>{tableData.headers.length} columns</span>
            {totalMissing > 0 && (
              <>
                <span>•</span>
                <span className="text-red-600 font-medium">{totalMissing} missing values</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            {selectedRows.size > 0 && (
              <Badge variant="outline" className="border-blue-300 text-blue-700">
                {selectedRows.size} rows selected
              </Badge>
            )}
            {selectedCols.size > 0 && (
              <Badge variant="outline" className="border-blue-300 text-blue-700">
                {selectedCols.size} columns selected
              </Badge>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}