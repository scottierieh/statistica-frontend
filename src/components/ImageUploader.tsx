'use client';

import { useState, ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { uploadImage } from '@/firebase/storage';
import { useToast } from '@/hooks/use-toast';
import { UploadCloud, Loader2 } from 'lucide-react';

interface ImageUploaderProps {
  onUploadComplete: (url: string) => void;
  path: string;
}

export default function ImageUploader({ onUploadComplete, path }: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setProgress(0);

    try {
      const downloadURL = await uploadImage(file, path, setProgress);
      onUploadComplete(downloadURL);
      toast({ title: 'Upload Successful', description: 'Your image has been uploaded.' });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Upload Failed',
        description: 'There was an error uploading your image.',
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="w-full">
      <div className="flex items-center gap-4">
        <Input
          type="file"
          id="imageUpload"
          accept="image/*"
          onChange={handleFileChange}
          disabled={uploading}
          className="hidden"
        />
        <label htmlFor="imageUpload" className="w-full">
          <Button asChild disabled={uploading} className="w-full cursor-pointer">
            <div>
              {uploading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <UploadCloud className="mr-2 h-4 w-4" />
              )}
              {uploading ? `Uploading... ${progress.toFixed(0)}%` : 'Select Image'}
            </div>
          </Button>
        </label>
      </div>
      {uploading && <Progress value={progress} className="w-full mt-2 h-2" />}
    </div>
  );
}
