
'use client';
import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Layers, Plus, Trash2, Sigma, Loader2 } from 'lucide-react';
import DataUploader from '../data-uploader'; // Assuming you have this component from Statistica

interface Layer {
    id: number;
    neurons: number;
    activation: 'relu' | 'sigmoid' | 'tanh' | 'softmax';
}

export default function DnnClassificationPage() {
    const [layers, setLayers] = useState<Layer[]>([
        { id: 1, neurons: 128, activation: 'relu' },
        { id: 2, neurons: 64, activation: 'relu' },
    ]);
    const [isLoading, setIsLoading] = useState(false);

    const addLayer = () => {
        const newId = (layers.at(-1)?.id || 0) + 1;
        setLayers([...layers, { id: newId, neurons: 32, activation: 'relu' }]);
    };
    
    const removeLayer = (id: number) => {
        if (layers.length > 1) {
            setLayers(layers.filter(layer => layer.id !== id));
        }
    };

    const updateLayer = (id: number, field: keyof Omit<Layer, 'id'>, value: any) => {
        setLayers(layers.map(layer => layer.id === id ? { ...layer, [field]: value } : layer));
    };
    
    const handleTrainModel = () => {
        // Placeholder for training logic
        setIsLoading(true);
        console.log("Training model with layers:", layers);
        setTimeout(() => setIsLoading(false), 2000);
    };

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">1. Data Input</CardTitle>
                    <CardDescription>Upload your dataset. The target variable should be categorical.</CardDescription>
                </CardHeader>
                <CardContent>
                    <DataUploader onFileSelected={(file) => console.log(file)} loading={false} />
                    {/* Data preview and variable selection will go here */}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="font-headline flex items-center gap-2"><Layers /> 2. Model Architecture</CardTitle>
                    <CardDescription>Define the layers of your Deep Neural Network.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {layers.map((layer, index) => (
                        <div key={layer.id} className="flex items-center gap-4 p-3 border rounded-lg">
                            <Label className="font-semibold">Layer {index + 1}</Label>
                            <div className="flex-1 grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor={`neurons-${layer.id}`}>Neurons</Label>
                                    <Input
                                        id={`neurons-${layer.id}`}
                                        type="number"
                                        value={layer.neurons}
                                        onChange={(e) => updateLayer(layer.id, 'neurons', parseInt(e.target.value) || 0)}
                                        min="1"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor={`activation-${layer.id}`}>Activation</Label>
                                    <Select
                                        value={layer.activation}
                                        onValueChange={(value) => updateLayer(layer.id, 'activation', value)}
                                    >
                                        <SelectTrigger id={`activation-${layer.id}`}><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="relu">ReLU</SelectItem>
                                            <SelectItem value="sigmoid">Sigmoid</SelectItem>
                                            <SelectItem value="tanh">Tanh</SelectItem>
                                            <SelectItem value="softmax">Softmax</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => removeLayer(layer.id)} disabled={layers.length <= 1}>
                                <Trash2 className="h-4 w-4 text-muted-foreground" />
                            </Button>
                        </div>
                    ))}
                     <Button variant="outline" onClick={addLayer}><Plus className="mr-2" /> Add Layer</Button>
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button onClick={handleTrainModel} disabled={isLoading}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin" /> Training...</> : <><Sigma className="mr-2" />Train Model</>}
                    </Button>
                </CardFooter>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">3. Training Results</CardTitle>
                    <CardDescription>Performance metrics and visualizations will appear here after training.</CardDescription>
                </CardHeader>
                 <CardContent className="flex items-center justify-center h-64 bg-muted rounded-md">
                    <p className="text-muted-foreground">Awaiting training completion...</p>
                </CardContent>
            </Card>
        </div>
    );
}
