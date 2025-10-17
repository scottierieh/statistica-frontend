
'use client';
import React, { useState } from 'react';
import ImageUploader from '@/components/ImageUploader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { deleteImage } from '@/firebase/storage';

export default function StoragePage() {
  const [imageUrls, setImageUrls] = useState<string[]>([]);

  const handleUploadComplete = (url: string) => {
    setImageUrls(prev => [...prev, url]);
  };

  const handleDeleteImage = async (urlToDelete: string) => {
    try {
      await deleteImage(urlToDelete);
      setImageUrls(prev => prev.filter(url => url !== urlToDelete));
    } catch (error) {
      console.error("Failed to delete image:", error);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-muted/20">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Firebase Image Uploader</CardTitle>
          <CardDescription>Upload images to Firebase Storage and see them displayed below.</CardDescription>
        </CardHeader>
        <CardContent>
          <ImageUploader onUploadComplete={handleUploadComplete} path="images" />
          <div className="mt-6">
            <h3 className="font-semibold mb-4">Uploaded Images:</h3>
            {imageUrls.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {imageUrls.map((url, index) => (
                  <div key={index} className="relative group">
                    <Image
                      src={url}
                      alt={`Uploaded image ${index + 1}`}
                      width={200}
                      height={200}
                      className="rounded-lg object-cover aspect-square"
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleDeleteImage(url)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No images uploaded yet.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
