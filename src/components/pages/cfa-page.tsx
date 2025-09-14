'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, BrainCircuit, Plus, Trash2, Wand2 } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { ScrollArea } from '../ui/scroll-area';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent, DragOverlay, DragStartEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// CFA Results Types
interface CfaResults {
    fit_indices: {
        chi_square: number;
        df: number;
        p_value: number;
        cfi: number;
        tli: number;
        rmsea: number;
        srmr: number;
    };
    standardized_solution?: {
        loadings: number[][];
        factor_correlations: number[][];
        r_squared: number[];
    };
    reliability: {
        [key: string]: {
            composite_reliability: number;
            average_variance_extracted: number;
        }
    };
    model_spec: {
        factors: string[];
        indicators: string[];
    };
    convergence: boolean;
}

const DraggableItem = ({ id, isDragging }: { id: string, isDragging?: boolean }) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
    const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1, };
    return <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="p-2 rounded cursor-grab hover:bg-muted bg-background border my-1">{id}</div>;
};

const FactorCard = ({ factor, items, onFactorNameChange, onRemoveFactor }: { factor: { id: string, name: string }, items: string[], onFactorNameChange: (id: string, name: string) => void, onRemoveFactor: (id: string) => void }) => {
    return (
        <Card className="w-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <Input value={factor.name} onChange={(e) => onFactorNameChange(factor.id, e.target.value)} className="text-lg font-bold border-none shadow-none focus-visible:ring-0" />
                <Button variant="ghost" size="icon" onClick={() => onRemoveFactor(factor.id)}><Trash2 className="h-4 w-4" /></Button>
            </CardHeader>
            <CardContent>
                 <SortableContext id={factor.id} items={items} strategy={verticalListSortingStrategy}>
                    <ScrollArea className="h-40 border rounded-md p-2 bg-muted/20 min-h-[10rem]">
                            {items.length > 0 ? (
                                items.map(item => <DraggableItem key={item} id={item} />)
                            ) : <div className="flex items-center justify-center h-full text-sm text-muted-foreground p-4 text-center">Drop items here</div>}
                    </ScrollArea>
                </SortableContext>
            </CardContent>
        </Card>
    );
};

const getFitInterpretation = (fit: CfaResults['fit_indices']) => {
    const cfiOk = fit.cfi >= 0.95;
    const tliOk = fit.tli >= 0.95;
    const rmseaOk = fit.rmsea <= 0.06;
    const srmrOk = fit.srmr <= 0.08;
    const count = [cfiOk, tliOk, rmseaOk, srmrOk].filter(Boolean).length;
    if (count >= 3) return { level: "Excellent", color: "bg-green-600" };
    if (fit.cfi >= 0.90 && fit.tli >= 0.90 && fit.rmsea <= 0.08 && fit.srmr <= 0.10) return { level: "Good", color: "bg-yellow-500" };
    return { level: "Poor", color: "bg-red-500" };
}

interface CfaPageProps {
    data: DataSet;
    numericHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function CfaPage({ data, numericHeaders, onLoadExample }: CfaPageProps) {
    const { toast } = useToast();
    const [factors, setFactors] = useState<{ id: string, name: string }[]>([]);
    const [items, setItems] = useState<Record<string, string[]>>({ available: numericHeaders });
    const [activeId, setActiveId] = useState<string | null>(null);

    const [analysisResult, setAnalysisResult] = useState<CfaResults | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    
    const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

    useEffect(() => {
        setItems({ available: numericHeaders });
        setFactors([]);
        setAnalysisResult(null);
    }, [numericHeaders, data]);
    
    const canRunAnalysis = useMemo(() => {
        return data.length > 0 && factors.length > 0 && factors.every(f => (items[f.id]?.length || 0) > 0 && f.name.trim() !== '');
    }, [data, factors, items]);

    const handleAddFactor = () => {
        const newFactorId = `factor-${Date.now()}`;
        setFactors(prev => [...prev, { id: newFactorId, name: `Factor ${prev.length + 1}` }]);
        setItems(prev => ({ ...prev, [newFactorId]: [] }));
    };
    
    const handleRemoveFactor = (id: string) => {
        const factorItems = items[id] || [];
        setItems(prev => {
            const newItems = { ...prev };
            delete newItems[id];
            newItems.available = [...(newItems.available || []), ...factorItems].sort();
            return newItems;
        });
        setFactors(prev => prev.filter(f => f.id !== id));
    };
    
    const handleFactorNameChange = (id: string, newName: string) => {
        setFactors(prev => prev.map(f => f.id === id ? { ...f, name: newName } : f));
    };

    const findContainer = (id: string) => {
        if (id in items) {
          return id;
        }
        return Object.keys(items).find((key) => items[key].includes(id));
    };

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id.toString());
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);
    
        if (!over) {
            return;
        }
    
        const activeContainer = findContainer(active.id.toString());
        const overContainer = findContainer(over.id.toString());
    
        if (!activeContainer || !overContainer) {
            return;
        }

        if (activeContainer !== overContainer) {
             setItems((prev) => {
                const activeItems = prev[activeContainer];
                const overItems = prev[overContainer];
                const activeIndex = activeItems.indexOf(active.id.toString());
                const overIndex = overItems.indexOf(over.id.toString());

                let newIndex;
                if (over.id in prev) {
                    newIndex = overItems.length + 1;
                } else {
                    const isBelowLastItem = over && overIndex === overItems.length - 1;
                    const modifier = isBelowLastItem ? 1 : 0;
                    newIndex = overIndex >= 0 ? overIndex + modifier : overItems.length + 1;
                }

                return {
                    ...prev,
                    [activeContainer]: [...prev[activeContainer].filter((item) => item !== active.id)],
                    [overContainer]: [
                        ...prev[overContainer].slice(0, newIndex),
                        items[activeContainer][activeIndex],
                        ...prev[overContainer].slice(newIndex, prev[overContainer].length),
                    ],
                };
             });
        } else {
            const activeIndex = items[activeContainer].indexOf(active.id.toString());
            const overIndex = items[overContainer].indexOf(over.id.toString());
            if (activeIndex !== overIndex) {
                 setItems(items => ({
                    ...items,
                    [overContainer]: arrayMove(items[overContainer], activeIndex, overIndex)
                }));
            }
        }
    };
    
    const handleAutoSpec = () => {
        toast({ title: 'Automatic Specification', description: 'This feature (running EFA to suggest factors) is coming soon!' });
    };

    const handleAnalysis = useCallback(async () => {
        if (!canRunAnalysis) {
            toast({ variant: 'destructive', title: 'Model Specification Error', description: 'Please ensure every factor has a name and at least one item.' });
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);

        const modelSpec = factors.reduce((acc, factor) => {
            acc[factor.name] = items[factor.id] || [];
            return acc;
        }, {} as { [key: string]: string[] });

        try {
            const response = await fetch('/api/analysis/cfa', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, modelSpec, modelName: 'cfa_model' })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            if (result.error) throw new Error(result.error);

            setAnalysisResult(result);
            toast({ title: 'CFA Complete', description: result.convergence ? 'Model converged successfully.' : 'Model did not converge.' });

        } catch (e: any) {
            console.error('CFA Analysis error:', e);
            toast({ variant: 'destructive', title: 'CFA Analysis Error', description: e.message || 'An unexpected error occurred.' });
            setAnalysisResult(null);
        } finally {
            setIsLoading(false);
        }
    }, [data, factors, items, canRunAnalysis, toast]);
    
    const canRunPage = useMemo(() => data.length > 0 && numericHeaders.length >= 3, [data, numericHeaders]);

    if (!canRunPage) {
        const cfaExamples = exampleDatasets.filter(ex => ex.analysisTypes.includes('cfa'));
        return (
             <div className="flex flex-1 items-center justify-center">
                <Card className="w-full max-w-2xl text-center">
                    <CardHeader>
                        <CardTitle className="font-headline">Confirmatory Factor Analysis (CFA)</CardTitle>
                        <CardDescription>
                           To perform CFA, you need data with at least 3 numeric variables. Try one of our example datasets.
                        </CardDescription>
                    </CardHeader>
                     <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {cfaExamples.map((ex) => {
                                const Icon = ex.icon;
                                return (
                                <Card key={ex.id} className="text-left hover:shadow-md transition-shadow">
                                    <CardHeader className="flex flex-row items-start gap-4 space-y-0 pb-4">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                                            <Icon className="h-6 w-6 text-secondary-foreground" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-base font-semibold">{ex.name}</CardTitle>
                                            <CardDescription className="text-xs">{ex.description}</CardDescription>
                                        </div>
                                    </CardHeader>
                                    <CardFooter>
                                        <Button onClick={() => onLoadExample(ex)} className="w-full" size="sm">
                                            Load this data
                                        </Button>
                                    </CardFooter>
                                </Card>
                                )
                            })}
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="flex flex-col gap-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline">CFA Model Specification</CardTitle>
                        <CardDescription>Define your measurement model by creating factors and dragging items into them.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card className="md:col-span-1">
                            <CardHeader><CardTitle className="text-lg">Available Items</CardTitle></CardHeader>
                            <CardContent>
                                <SortableContext id="available" items={items.available || []} strategy={verticalListSortingStrategy}>
                                    <ScrollArea className="h-80 border rounded-md p-2 bg-muted/20 min-h-[10rem]">
                                        {(items.available || []).map(item => <DraggableItem key={item} id={item} />)}
                                        {items.available?.length === 0 && <div className="flex items-center justify-center h-full text-sm text-muted-foreground p-4 text-center">All items assigned</div>}
                                    </ScrollArea>
                                </SortableContext>
                            </CardContent>
                        </Card>
                        <div className="md:col-span-2 grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {factors.map(factor => (
                                <FactorCard key={factor.id} factor={factor} items={items[factor.id] || []} onFactorNameChange={handleFactorNameChange} onRemoveFactor={handleRemoveFactor}/>
                            ))}
                            <Button variant="outline" className="h-full w-full border-dashed" onClick={handleAddFactor}><Plus className="mr-2"/> Add Factor</Button>
                        </div>
                    </CardContent>
                    <CardContent>
                         <div className="flex justify-end gap-2">
                            <Button variant="ghost" onClick={handleAutoSpec}><Wand2 className="mr-2" /> Auto-specify (EFA)</Button>
                            <Button onClick={handleAnalysis} disabled={!canRunAnalysis || isLoading}>
                                {isLoading ? <><Loader2 className="mr-2 animate-spin" /> Running...</> : <><Sigma className="mr-2"/> Run Analysis</>}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
                
                {isLoading && <Card><CardHeader><Skeleton className="h-96 w-full"/></CardHeader></Card>}

                {analysisResult && (
                    <>
                        <div className="grid lg:grid-cols-3 gap-4">
                            <Card className="lg:col-span-3">
                                <CardHeader>
                                    <CardTitle className="font-headline">Model Fit Summary</CardTitle>
                                    <CardDescription>Overall assessment of how well the specified model fits the data. <Badge className={`${getFitInterpretation(analysisResult.fit_indices).color} text-white`}>{getFitInterpretation(analysisResult.fit_indices).level}</Badge></CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                                        <div className="p-4 bg-muted rounded-lg">
                                            <p className="text-sm text-muted-foreground">CFI</p>
                                            <p className="text-2xl font-bold">{analysisResult.fit_indices.cfi.toFixed(3)}</p>
                                        </div>
                                         <div className="p-4 bg-muted rounded-lg">
                                            <p className="text-sm text-muted-foreground">TLI</p>
                                            <p className="text-2xl font-bold">{analysisResult.fit_indices.tli.toFixed(3)}</p>
                                        </div>
                                         <div className="p-4 bg-muted rounded-lg">
                                            <p className="text-sm text-muted-foreground">RMSEA</p>
                                            <p className="text-2xl font-bold">{analysisResult.fit_indices.rmsea.toFixed(3)}</p>
                                        </div>
                                         <div className="p-4 bg-muted rounded-lg">
                                            <p className="text-sm text-muted-foreground">SRMR</p>
                                            <p className="text-2xl font-bold">{analysisResult.fit_indices.srmr.toFixed(3)}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                        <div className="grid lg:grid-cols-2 gap-4">
                             <Card>
                                <CardHeader>
                                    <CardTitle className="font-headline">Standardized Factor Loadings</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader><TableRow><TableHead>Factor</TableHead><TableHead>Indicator</TableHead><TableHead className="text-right">Loading</TableHead><TableHead className="text-right">R²</TableHead></TableRow></TableHeader>
                                        <TableBody>
                                            {analysisResult.model_spec.factors.map((factor, fIndex) => {
                                                const factorItems = factors.find(f=>f.name === factor)?.id ? (items[factors.find(f=>f.name === factor)!.id] || []) : [];
                                                return factorItems.map((item, iIndex) => {
                                                    const itemIndex = analysisResult.model_spec.indicators.indexOf(item);
                                                    if(itemIndex === -1 || !analysisResult.standardized_solution) return null;
                                                    const loading = analysisResult.standardized_solution.loadings[itemIndex]?.[fIndex] ?? 0;
                                                    const rSquared = loading * loading;
                                                    return (
                                                        <TableRow key={`${fIndex}-${iIndex}`}>
                                                            {iIndex === 0 && <TableCell rowSpan={factorItems.length} className="font-semibold align-top">{factor}</TableCell>}
                                                            <TableCell>{item}</TableCell>
                                                            <TableCell className="text-right font-mono">{loading.toFixed(3)}</TableCell>
                                                            <TableCell className="text-right font-mono">{rSquared.toFixed(3)}</TableCell>
                                                        </TableRow>
                                                    )
                                                })
                                            })}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                            <div className="space-y-4">
                                {analysisResult.model_spec.factors.length > 1 && (
                                     <Card>
                                        <CardHeader><CardTitle className="font-headline">Factor Correlations</CardTitle></CardHeader>
                                        <CardContent>
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead></TableHead>
                                                        {analysisResult.model_spec.factors.map(f => <TableHead key={f} className="text-center">{f}</TableHead>)}
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {analysisResult.model_spec.factors.map((f1, i) => (
                                                        <TableRow key={f1}>
                                                            <TableHead>{f1}</TableHead>
                                                            {analysisResult.model_spec.factors.map((f2, j) => (
                                                                <TableCell key={f2} className="text-center font-mono">
                                                                    {i === j ? '1.00' : analysisResult.standardized_solution?.factor_correlations[i][j]?.toFixed(3) ?? '-'}
                                                                </TableCell>
                                                            ))}
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </CardContent>
                                    </Card>
                                )}
                                <Card>
                                    <CardHeader><CardTitle className="font-headline">Factor Reliability</CardTitle></CardHeader>
                                    <CardContent>
                                        <Table>
                                            <TableHeader><TableRow><TableHead>Factor</TableHead><TableHead className="text-right">Composite Reliability (CR)</TableHead><TableHead className="text-right">Avg. Variance Extracted (AVE)</TableHead></TableRow></TableHeader>
                                            <TableBody>
                                                {Object.entries(analysisResult.reliability).map(([factor, rel]) => (
                                                    <TableRow key={factor}>
                                                        <TableCell className="font-semibold">{factor}</TableCell>
                                                        <TableCell className="text-right font-mono">{rel.composite_reliability.toFixed(3)}</TableCell>
                                                        <TableCell className="text-right font-mono">{rel.average_variance_extracted.toFixed(3)}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </>
                )}

                 {!analysisResult && !isLoading && (
                    <div className="text-center text-muted-foreground py-10">
                        <BrainCircuit className="mx-auto h-12 w-12 text-gray-400"/>
                        <p className="mt-2">Define your factors and click 'Run Analysis' to see the results.</p>
                    </div>
                )}
            </div>
            <DragOverlay>
                {activeId ? <div className="p-2 rounded cursor-grabbing bg-background border shadow-lg">{activeId}</div> : null}
            </DragOverlay>
        </DndContext>
    );
}
