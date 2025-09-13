'use client';
import { useState, useRef, useCallback, type DragEvent } from 'react';
import { UploadCloud, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface DataUploaderProps {
    onFileSelected: (file: File) => void;
    loading?: boolean;
}

export default function DataUploader({ onFileSelected, loading }: DataUploaderProps) {
    const { toast } = useToast();
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDrag = useCallback((e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setIsDragging(true);
        } else if (e.type === "dragleave") {
            setIsDragging(false);
        }
    }, []);

    const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            if (e.dataTransfer.files.length > 1) {
                toast({ variant: 'destructive', title: 'Upload Error', description: 'Please upload only one file at a time.' });
                return;
            }
            onFileSelected(e.dataTransfer.files[0]);
        }
    }, [onFileSelected, toast]);

    const handleClick = () => {
        fileInputRef.current?.click();
    };
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            onFileSelected(e.target.files[0]);
             e.target.value = ''; // Reset file input
        }
    };


    return (
        <div 
            className={cn(
                "relative flex flex-col items-center justify-center w-full p-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors duration-200 ease-in-out",
                "border-border bg-background hover:bg-accent hover:border-primary/50",
                isDragging && "border-primary bg-accent",
                loading && "pointer-events-none"
            )}
            onClick={handleClick}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
        >
            <input 
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".csv, .txt, .xls, .xlsx, text/csv, text/plain, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={handleFileChange}
                disabled={loading}
            />
            {loading ? (
                <>
                    <Loader2 className="h-8 w-8 mb-2 text-primary animate-spin" />
                    <p className="text-sm font-medium text-primary">Processing...</p>
                </>
            ) : (
                <>
                    <UploadCloud className={cn("h-8 w-8 mb-2", isDragging ? 'text-primary' : 'text-muted-foreground')} />
                    <p className="text-sm font-medium text-center">
                        <span className="text-primary">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">CSV, TXT, or Excel file</p>
                </>
            )}
        </div>
    )
}
