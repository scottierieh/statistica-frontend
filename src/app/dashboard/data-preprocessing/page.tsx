'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Trash2, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Save, Search, Download, FilePlus, AlertTriangle, Undo } from 'lucide-react';
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

type TableRowData = (string | number | null)[];
type TableData = {
    headers: string[];
    rows: TableRowData[];
};

export default function DataPreprocessingPage() {
  const { toast } = useToast();
  const [tableData, setTableData] = useState<TableData>({ headers: [], rows: [] });
  const [selectedCols, setSelectedCols] = useState<Set<number>>(new Set());
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [fileName, setFileName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [transformHistory, setTransformHistory] = useState<TableData[]>([]);
  const [missingCount, setMissingCount] = useState(0);
  const [missingInfo, setMissingInfo] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [fillMethod, setFillMethod] = useState('mean');
  const [transformType, setTransformType] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        toast({ title: 'File Loaded', description: `${rows.length} rows loaded successfully.` });
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
    ];
    setTableData({ headers, rows: rows as TableRowData[] });
    setFileName('Sample Data');
    toast({ title: 'Sample Data Loaded', description: '8 rows loaded successfully.' });
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
    toast({ title: 'Row Added', description: 'New row added above selection.' });
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
    toast({ title: 'Row Added', description: 'New row added below selection.' });
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
    toast({ title: 'Rows Deleted', description: `${indices.length} row(s) deleted.` });
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
    toast({ title: 'Column Added', description: 'New column added to the left.' });
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
    toast({ title: 'Column Added', description: 'New column added to the right.' });
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
    toast({ title: 'Columns Deleted', description: `${indices.length} column(s) deleted.` });
  };

  const checkMissingValues = () => {
    let count = 0;
    const missingByCols: { [key: string]: number } = {};
    
    tableData.headers.forEach((header, colIdx) => {
      missingByCols[header] = 0;
      tableData.rows.forEach(row => {
        const value = row[colIdx];
        if (value === null || value === undefined || String(value).trim() === '') {
          count++;
          missingByCols[header]++;
        }
      });
    });
    
    setMissingCount(count);
    
    if (count === 0) {
      setMissingInfo('✓ No missing values found');
      toast({ title: 'No Missing Values', description: 'All cells have values.' });
    } else {
      let info = `${count} missing values found:\n`;
      Object.entries(missingByCols).forEach(([col, cnt]) => {
        if (cnt > 0) {
          const percent = ((cnt / tableData.rows.length) * 100).toFixed(1);
          info += `${col}: ${cnt} (${percent}%)\n`;
        }
      });
      setMissingInfo(info);
      toast({ title: 'Missing Values Found', description: `${count} missing value(s) detected.`, variant: 'destructive' });
    }
  };

  const fillMissingValues = () => {
    if (selectedCols.size === 0) {
      toast({ title: 'No Selection', description: 'Please select columns to fill.', variant: 'destructive' });
      return;
    }

    // Save current state for undo
    setTransformHistory([...transformHistory, { headers: [...tableData.headers], rows: tableData.rows.map(row => [...row]) }]);

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
    toast({ title: 'Missing Values Filled', description: `Filled using ${fillMethod} method.` });
    checkMissingValues();
  };

  const applyTransformation = () => {
    if (!transformType || selectedCols.size === 0) {
      toast({ title: 'Invalid Selection', description: 'Select columns and transformation type.', variant: 'destructive' });
      return;
    }

    // Save current state for undo
    setTransformHistory([...transformHistory, { headers: [...tableData.headers], rows: tableData.rows.map(row => [...row]) }]);

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
    toast({ title: 'Transformation Applied', description: `${transformType} applied to ${selectedCols.size} column(s).` });
  };

  const undoTransformation = () => {
    if (transformHistory.length === 0) {
      toast({ title: 'Nothing to Undo', description: 'No transformation history available.' });
      return;
    }
    const lastState = transformHistory[transformHistory.length - 1];
    setTableData(lastState);
    setTransformHistory(transformHistory.slice(0, -1));
    toast({ title: 'Undo Successful', description: 'Reverted to previous state.' });
  };
  
  const downloadCSV = () => {
    const csv = Papa.unparse({
        fields: tableData.headers,
        data: tableData.rows
    });
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName || 'edited_data.csv';
    link.click();
    toast({ title: 'CSV Exported', description: 'File downloaded successfully.' });
  };

  const filteredRows = tableData.rows.map((row, idx) => ({ row, idx })).filter(({ row }) => {
    if (!searchTerm) return true;
    return row.some(cell => String(cell).toLowerCase().includes(searchTerm.toLowerCase()));
  });

  return (
    <div className="flex h-screen overflow-hidden bg-muted/30">
      {/* Sidebar */}
      <aside className="w-80 border-r bg-background p-4 flex flex-col gap-4 overflow-y-auto">
        <Card>
          <CardHeader><CardTitle>File Operations</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={() => fileInputRef.current?.click()} className="w-full"><FilePlus className="mr-2" />Upload File</Button>
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".csv,.txt,.tsv" />
            <Button variant="outline" onClick={createSampleData} className="w-full">Load Sample Data</Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader><CardTitle>Row Operations</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" onClick={addRowAbove} disabled={selectedRows.size === 0}><ArrowUp className="mr-2"/>Add Above</Button>
            <Button variant="outline" size="sm" onClick={addRowBelow} disabled={selectedRows.size === 0}><ArrowDown className="mr-2"/>Add Below</Button>
            <Button variant="destructive" size="sm" className="col-span-2" onClick={deleteSelectedRows} disabled={selectedRows.size === 0}><Trash2 className="mr-2"/></Button>
          </CardContent>
        </Card>
        
        <Card>
            <CardHeader><CardTitle>Column Operations</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
                 <Button variant="outline" size="sm" onClick={addColumnLeft} disabled={selectedCols.size === 0}><ArrowLeft className="mr-2"/>Add Left</Button>
                 <Button variant="outline" size="sm" onClick={addColumnRight} disabled={selectedCols.size === 0}><ArrowRight className="mr-2"/>Add Right</Button>
                <Button variant="destructive" size="sm" className="col-span-2" onClick={deleteSelectedColumns} disabled={selectedCols.size === 0}><Trash2 className="mr-2"/></Button>
            </CardContent>
        </Card>
        
        <Card>
            <CardHeader><CardTitle>Data Quality</CardTitle></CardHeader>
            <CardContent className="space-y-2">
                <Button onClick={checkMissingValues} className="w-full" variant="outline">Check Missing Values</Button>
                <div className="space-y-1">
                    <Label>Fill Method:</Label>
                    <Select value={fillMethod} onValueChange={setFillMethod}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
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
                <Button onClick={fillMissingValues} className="w-full" variant="secondary" disabled={selectedCols.size === 0}>Fill Missing Values</Button>
                {missingInfo && <div className="text-xs text-muted-foreground whitespace-pre-line mt-2">{missingInfo}</div>}
            </CardContent>
        </Card>
        
        <Card>
            <CardHeader><CardTitle>Data Transformation</CardTitle></CardHeader>
            <CardContent className="space-y-2">
                <Select value={transformType} onValueChange={setTransformType}>
                    <SelectTrigger><SelectValue placeholder="Select transformation..."/></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="log">Log</SelectItem>
                        <SelectItem value="log10">Log10</SelectItem>
                        <SelectItem value="sqrt">Square Root</SelectItem>
                        <SelectItem value="square">Square</SelectItem>
                        <SelectItem value="zscore">Z-Score</SelectItem>
                        <SelectItem value="minmax">Min-Max Normalize</SelectItem>
                        <SelectItem value="abs">Absolute Value</SelectItem>
                        <SelectItem value="round">Round</SelectItem>
                    </SelectContent>
                </Select>
                <div className="grid grid-cols-2 gap-2">
                    <Button onClick={applyTransformation} disabled={!transformType || selectedCols.size === 0}>Apply</Button>
                    <Button onClick={undoTransformation} variant="outline" disabled={transformHistory.length === 0}><Undo className="mr-2"/>Undo</Button>
                </div>
            </CardContent>
        </Card>
        <div className="flex-grow" />
        <Button onClick={downloadCSV} disabled={tableData.rows.length === 0}><Download className="mr-2"/> Export as CSV</Button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col p-4 overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold">{fileName || "Data Editor"}</h1>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search table..." className="pl-9" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </div>
        <div className="flex-1 border rounded-lg overflow-auto bg-card">
          <Table>
            <TableHeader className="sticky top-0 bg-muted/50">
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox 
                    checked={selectedRows.size === tableData.rows.length && tableData.rows.length > 0}
                    onCheckedChange={toggleAllRows}
                  />
                </TableHead>
                {tableData.headers.map((header, i) => (
                  <TableHead key={i} className={`${selectedCols.has(i) ? 'bg-blue-100' : ''} border-l-2 border-gray-300`}>
                    <div className="flex items-center gap-2">
                      <Checkbox 
                        checked={selectedCols.has(i)}
                        onCheckedChange={() => toggleColumn(i)}
                      />
                      <Input
                        type="text"
                        value={header}
                        onChange={(e) => handleHeaderChange(i, e.target.value)}
                        className="h-8 border-none focus-visible:ring-1 p-1 font-semibold flex-1"
                      />
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={tableData.headers.length + 1} className="text-center text-muted-foreground py-8">
                    {tableData.rows.length === 0 ? 'No data loaded. Upload a file or load sample data.' : 'No matching results.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredRows.map(({ row, idx: rowIndex }) => (
                  <TableRow key={rowIndex} className={selectedRows.has(rowIndex) ? 'bg-yellow-50' : ''}>
                    <TableCell>
                      <Checkbox 
                        checked={selectedRows.has(rowIndex)}
                        onCheckedChange={() => toggleRow(rowIndex)}
                      />
                    </TableCell>
                    {row.map((cell, colIndex) => (
                      <TableCell key={colIndex} className={`${selectedCols.has(colIndex) ? 'bg-blue-50' : ''} ${(cell === null || cell === undefined || String(cell).trim() === '') ? 'bg-red-100' : ''} border-l-2 border-gray-300`}>
                         <Input
                           type="text"
                           value={cell === null || cell === undefined ? '' : String(cell)}
                           onChange={(e) => handleCellChange(rowIndex, colIndex, e.target.value)}
                           className="h-8 border-none focus-visible:ring-1 p-1"
                         />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <div className="text-xs text-muted-foreground pt-2">
            {tableData.rows.length} rows, {tableData.headers.length} columns. {missingCount > 0 && `${missingCount} missing values.`}
        </div>
      </main>
    </div>
  );
}
