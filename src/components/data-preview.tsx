'use client';

import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

interface DataPreviewProps {
    fileName: string;
    data: DataSet;
    headers: string[];
    onDownload: () => void;
}

const PREVIEW_ROW_COUNT = 10;

export default function DataPreview({ fileName, data, headers, onDownload }: DataPreviewProps) {
    
    const previewData = data.slice(0, PREVIEW_ROW_COUNT);

    return (
        <Card>
            <CardHeader className="flex flex-row items-start justify-between">
                <div>
                    <CardTitle className="font-headline text-xl">Active Dataset: {fileName}</CardTitle>
                    <CardDescription>Showing first {Math.min(PREVIEW_ROW_COUNT, data.length)} of {data.length} rows.</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={onDownload}>
                    <Download className="mr-2"/>
                    Download Data
                </Button>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-64 w-full border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                {headers.map(header => <TableHead key={header}>{header}</TableHead>)}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {previewData.map((row, rowIndex) => (
                                <TableRow key={rowIndex}>
                                    {headers.map(header => (
                                        <TableCell key={`${rowIndex}-${header}`} className="font-mono text-xs">
                                            {String(row[header])}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}
