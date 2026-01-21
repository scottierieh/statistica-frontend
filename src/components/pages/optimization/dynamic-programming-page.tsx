'use client';
import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Play, Plus, Trash2, Repeat, Package } from 'lucide-react';
import { produce } from 'immer';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface KnapsackItem {
    id: string;
    name: string;
    weight: string;
    value: string;
}

interface KnapsackResult {
    total_value: number;
    total_weight: number;
    selected_items: string[];
}

export default function DynamicProgrammingPage() {
    const { toast } = useToast();
    
    const [capacity, setCapacity] = useState('50');
    const [items, setItems] = useState<KnapsackItem[]>([
        { id: 'item-1', name: 'Item 1', weight: '10', value: '60' },
        { id: 'item-2', name: 'Item 2', weight: '20', value: '100' },
        { id: 'item-3', name: 'Item 3', weight: '30', value: '120' },
    ]);

    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<KnapsackResult | null>(null);

    const addItem = () => setItems(prev => [...prev, { id: `item-${Date.now()}`, name: `Item ${prev.length + 1}`, weight: '', value: '' }]);
    const removeItem = (id: string) => setItems(prev => prev.filter(item => item.id !== id));

    const handleItemChange = (index: number, field: keyof KnapsackItem, value: string) => {
        setItems(produce(draft => {
            draft[index][field] = value;
        }));
    };

    const handleSolve = async () => {
        setIsLoading(true);
        setResult(null);
        try {
            const parsedItems = items.map(item => ({
                name: item.name,
                weight: parseInt(item.weight),
                value: parseFloat(item.value)
            })).filter(item => !isNaN(item.weight) && !isNaN(item.value) && item.weight > 0);

            const payload = {
                items: parsedItems,
                capacity: parseInt(capacity),
            };

            if (payload.items.length === 0) throw new Error("Please provide at least one valid item.");
            if (isNaN(payload.capacity) || payload.capacity <= 0) throw new Error("Capacity must be a positive integer.");
            
            const response = await fetch('/api/analysis/dynamic-programming', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const res = await response.json();
            if (res.error) throw new Error(res.error);

            setResult(res.results);
            toast({ title: "Success", description: "Knapsack problem solved optimally." });
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Repeat />Dynamic Programming: Knapsack Problem</CardTitle>
                    <CardDescription>Find the optimal combination of items to maximize total value within a weight capacity.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="p-4 border rounded-lg bg-muted/50">
                        <Label>Knapsack Capacity</Label>
                        <Input type="number" value={capacity} onChange={e => setCapacity(e.target.value)} placeholder="e.g., 50" className="mt-1 max-w-xs"/>
                    </div>

                    <div className="space-y-2">
                        <Label className="font-semibold">Items</Label>
                        <div className="border rounded-lg">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-1/3">Name</TableHead>
                                        <TableHead>Weight (integer)</TableHead>
                                        <TableHead>Value</TableHead>
                                        <TableHead className="w-12"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {items.map((item, index) => (
                                        <TableRow key={item.id}>
                                            <TableCell><Input value={item.name} onChange={e => handleItemChange(index, 'name', e.target.value)} /></TableCell>
                                            <TableCell><Input type="number" value={item.weight} onChange={e => handleItemChange(index, 'weight', e.target.value)} min="1" step="1" /></TableCell>
                                            <TableCell><Input type="number" value={item.value} onChange={e => handleItemChange(index, 'value', e.target.value)} min="0" /></TableCell>
                                            <TableCell><Button variant="ghost" size="icon" onClick={() => removeItem(item.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button></TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                        <Button variant="outline" size="sm" onClick={addItem}><Plus className="mr-2"/> Add Item</Button>
                    </div>

                    <Button onClick={handleSolve} disabled={isLoading}>
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Play className="mr-2 h-4 w-4"/>}
                        Solve
                    </Button>
                </CardContent>
            </Card>

            {result && (
                <Card>
                    <CardHeader>
                        <CardTitle>Optimal Solution</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 border rounded-lg bg-primary/10 text-center">
                                <p className="text-sm text-primary font-semibold">Max Value</p>
                                <p className="text-3xl font-bold">{result.total_value.toFixed(2)}</p>
                            </div>
                             <div className="p-4 border rounded-lg bg-muted/50 text-center">
                                <p className="text-sm text-muted-foreground">Total Weight</p>
                                <p className="text-3xl font-bold">{result.total_weight}</p>
                            </div>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-2">Selected Items:</h4>
                            <div className="flex flex-wrap gap-2">
                                {result.selected_items.length > 0 ? (
                                    result.selected_items.map(item => <Badge key={item}>{item}</Badge>)
                                ) : (
                                    <p className="text-sm text-muted-foreground">No items were selected.</p>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
