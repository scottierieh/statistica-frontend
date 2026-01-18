'use client';

import React, { useState, useCallback, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Network, UploadCloud, FileUp, Wand2, Lightbulb, Copy, Loader2, Image as ImageIcon, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import Image from 'next/image';
import { getSemFromDiagram } from '@/app/actions';

export default function SemPage() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [image, setImage] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ syntax: string; explanation: string } | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 4 * 1024 * 1024) { // 4MB limit
        toast({
          variant: 'destructive',
          title: 'File too large',
          description: 'Please upload an image smaller than 4MB.',
        });
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        setImage(e.target?.result as string);
        setFileName(file.name);
        setResult(null); // Reset result when new image is uploaded
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!image) {
      toast({ variant: 'destructive', title: 'No Image', description: 'Please upload a diagram image first.' });
      return;
    }
    setIsLoading(true);
    setResult(null);
    try {
      const response = await getSemFromDiagram({ diagramDataUri: image });
      if (response.success && response.syntax) {
        setResult({ syntax: response.syntax, explanation: response.explanation! });
        toast({ title: 'Success', description: 'SEM syntax generated from your diagram.' });
      } else {
        throw new Error(response.error || 'Failed to generate syntax.');
      }
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (result?.syntax) {
      navigator.clipboard.writeText(result.syntax);
      setIsCopied(true);
      toast({ title: 'Copied to clipboard!' });
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const clearImage = () => {
    setImage(null);
    setFileName(null);
    setResult(null);
    if(fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/png, image/jpeg, image/webp, image/gif"
      />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-headline text-2xl">
            <Network className="w-6 h-6 text-primary" />
            Diagram-to-Model: AI-Powered SEM
          </CardTitle>
          <CardDescription>
            Upload a diagram of your structural equation model, and our AI will automatically generate the corresponding `lavaan` syntax.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6 items-start">
            <div
              className="relative aspect-video w-full rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center text-center p-4 hover:border-primary transition-all cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <AnimatePresence>
                {image ? (
                  <motion.div
                    key="image"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative w-full h-full"
                  >
                    <Image src={image} alt="Uploaded SEM Diagram" layout="fill" objectFit="contain" className="rounded-md" />
                    <Button variant="destructive" size="icon" className="absolute top-2 right-2 h-7 w-7 z-10" onClick={(e) => { e.stopPropagation(); clearImage(); }}>
                      <X className="w-4 h-4" />
                    </Button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="uploader"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center text-muted-foreground"
                  >
                    <UploadCloud className="w-12 h-12 mb-2" />
                    <span className="font-semibold text-primary">Click to upload</span>
                    <span>or drag and drop your diagram</span>
                    <span className="text-xs mt-2">PNG, JPG, GIF, WEBP up to 4MB</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="space-y-4">
              <Alert>
                <Lightbulb className="h-4 w-4" />
                <AlertTitle>How it Works</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc list-inside space-y-1 mt-2 text-xs">
                    <li>Use ovals/circles for latent variables.</li>
                    <li>Use squares/rectangles for observed variables.</li>
                    <li>Use single-headed arrows for regressions.</li>
                    <li>Use double-headed arrows for covariances.</li>
                  </ul>
                </AlertDescription>
              </Alert>
              {fileName && <p className="text-sm text-center font-medium">File: {fileName}</p>}
              <Button onClick={handleGenerate} disabled={!image || isLoading} className="w-full" size="lg">
                {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Wand2 className="mr-2 h-5 w-5" />}
                Generate Model Syntax
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <AnimatePresence>
        {isLoading && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Card>
              <CardContent className="py-12 text-center">
                <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
                <p className="text-lg font-semibold">Analyzing Diagram...</p>
                <p className="text-sm text-muted-foreground">The AI is interpreting your model structure.</p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
      
      <AnimatePresence>
        {result && (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Generated Model</CardTitle>
                <CardDescription>Based on your diagram, here is the generated model syntax and explanation.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold mb-2">Lavaan Model Syntax</h3>
                  <div className="relative group">
                    <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto font-mono">
                      <code>{result.syntax}</code>
                    </pre>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={copyToClipboard}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                 <div>
                    <h3 className="text-sm font-semibold mb-2">Explanation</h3>
                    <div className="prose prose-sm max-w-none text-muted-foreground">
                        <p>{result.explanation}</p>
                    </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
