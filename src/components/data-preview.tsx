
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Download, Trash2, ChevronsUpDown, ChevronDown } from 'lucide-react';
import { DataSet } from '@/lib/stats';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';

interface DataPreviewProps {
    fileName: string;
    data: DataSet;
    headers: string[];
    onDownload: () => void;
    onClearData: () => void;
}

export default function DataPreview({ fileName, data, headers, onDownload, onClearData }: DataPreviewProps) {
    const [isOpen, setIsOpen] = useState(false);
    const previewData = data.slice(0, 100);

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between p-4">
                    <div className="space-y-1">
                        <CardTitle className="text-lg font-headline">Loaded Data: {fileName}</CardTitle>
                        <CardDescription>{data.length} rows, {headers.length} columns</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="secondary" size="icon" onClick={onDownload}><Download className="h-4 w-4 text-blue-600"/></Button>
                        <Button variant="secondary" size="icon" onClick={onClearData}><Trash2 className="h-4 w-4 text-red-600"/></Button>
                         <CollapsibleTrigger asChild>
                            <Button variant="secondary" size="icon">
                                <ChevronsUpDown className="h-4 w-4" />
                                <span className="sr-only">Toggle</span>
                            </Button>
                        </CollapsibleTrigger>
                    </div>
                </CardHeader>
                <CollapsibleContent>
                    <CardContent className="p-0">
                        <ScrollArea className="h-64">
                            <Table>
                                <TableHeader className="sticky top-0 bg-card">
                                    <TableRow>
                                        {headers.map(header => <TableHead key={header}>{header}</TableHead>)}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {previewData.map((row, rowIndex) => (
                                        <TableRow key={rowIndex}>
                                            {headers.map(header => (
                                                <TableCell key={`${rowIndex}-${header}`}>{String(row[header])}</TableCell>
                                            ))}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </ScrollArea>
                    </CardContent>
                </CollapsibleContent>
            </Card>
        </Collapsible>
    )
}
