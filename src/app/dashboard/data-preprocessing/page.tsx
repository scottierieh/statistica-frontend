
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Trash2, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Save, Search, Download, FilePlus, AlertTriangle } from 'lucide-react';
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
  };

  const handleCellChange = (rowIndex: number, colIndex: number, value: string) => {
    const newRows = [...tableData.rows];
    newRows[rowIndex][colIndex] = value;
    setTableData({ ...tableData, rows: newRows });
  };
  
  const downloadCSV = () => {
    const csv = Papa.unparse({
        fields: tableData.headers,
        data: tableData.rows
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName || 'edited_data.csv';
    link.click();
  };

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
            <Button variant="outline" size="sm"><ArrowUp className="mr-2"/>Add Above</Button>
            <Button variant="outline" size="sm"><ArrowDown className="mr-2"/>Add Below</Button>
            <Button variant="destructive" size="sm" className="col-span-2"><Trash2 className="mr-2"/>Delete Selected</Button>
          </CardContent>
        </Card>
        
        <Card>
            <CardHeader><CardTitle>Column Operations</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
                 <Button variant="outline" size="sm"><ArrowLeft className="mr-2"/>Add Left</Button>
                 <Button variant="outline" size="sm"><ArrowRight className="mr-2"/>Add Right</Button>
                <Button variant="destructive" size="sm" className="col-span-2"><Trash2 className="mr-2"/>Delete Selected</Button>
            </CardContent>
        </Card>
        
        <Card>
            <CardHeader><CardTitle>Data Transformation</CardTitle></CardHeader>
            <CardContent className="space-y-2">
                <Select><SelectTrigger><SelectValue placeholder="Select transformation..."/></SelectTrigger><SelectContent><SelectItem value="log">Log</SelectItem><SelectItem value="zscore">Z-Score</SelectItem></SelectContent></Select>
                <Button className="w-full">Apply</Button>
            </CardContent>
        </Card>
        <div className="flex-grow" />
        <Button onClick={downloadCSV}><Download className="mr-2"/> Export as CSV</Button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col p-4 overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold">{fileName || "Data Editor"}</h1>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search table..." className="pl-9" />
          </div>
        </div>
        <div className="flex-1 border rounded-lg overflow-auto bg-card">
          <Table>
            <TableHeader className="sticky top-0 bg-muted/50">
              <TableRow>
                <TableHead className="w-12"><Checkbox/></TableHead>
                {tableData.headers.map((header, i) => (
                  <TableHead key={i}>{header} <Checkbox className="ml-2" /></TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableData.rows.map((row, rowIndex) => (
                <TableRow key={rowIndex}>
                  <TableCell><Checkbox /></TableCell>
                  {row.map((cell, colIndex) => (
                    <TableCell key={colIndex}>
                       <Input
                         type="text"
                         value={cell === null || cell === undefined ? '' : String(cell)}
                         onChange={(e) => handleCellChange(rowIndex, colIndex, e.target.value)}
                         className="h-8 border-none focus-visible:ring-1 p-1"
                       />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="text-xs text-muted-foreground pt-2">
            {tableData.rows.length} rows, {tableData.headers.length} columns.
        </div>
      </main>
    </div>
  );
}
