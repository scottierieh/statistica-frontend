
'use client';

import { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { UploadCloud, File, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface DataUploaderProps {
  onFileSelected: (file: File) => void;
  loading: boolean;
}

export default function DataUploader({ onFileSelected, loading }: DataUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (files: FileList | null) => {
    if (files && files[0]) {
        const file = files[0];
        const allowedTypes = ['.csv', '.tsv', '.txt', '.json', '.xls', '.xlsx'];
        const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
        
        if (allowedTypes.includes(fileExtension)) {
            onFileSelected(file);
        } else {
            toast({
                variant: 'destructive',
                title: 'Invalid File Type',
                description: `Please upload a valid data file (${allowedTypes.join(', ')}).`
            });
        }
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(event.target.files);
  };

  const handleDragEnter = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    handleFileSelect(event.dataTransfer.files);
  };
  
  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={cn(
        "relative group flex w-full flex-col items-center justify-center rounded-lg border-2 border-dashed p-2 text-center transition-colors",
        isDragging ? "border-primary bg-primary/10" : "border-border hover:border-primary/50 hover:bg-accent"
      )}
    >
      <UploadCloud className={cn("mb-2 h-8 w-8 text-muted-foreground transition-transform group-hover:scale-110", isDragging && "text-primary scale-110")} />
      <h3 className="mb-1 text-sm font-semibold">Upload Data</h3>
       <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileChange}
        accept=".csv,.tsv,.txt,.json,.xls,.xlsx"
      />
      <Button onClick={handleButtonClick} disabled={loading} size="sm" className="group-hover:bg-primary/90 transition-colors">
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            <span>Processing...</span>
          </>
        ) : (
           <>
            <File className="mr-2 h-4 w-4" />
            <span>Choose File</span>
          </>
        )}
      </Button>
    </div>
  );
}
