
'use client';
import { motion } from "framer-motion";
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Edit, Users, Clock, Settings, Share2, QrCode, Copy, Download, Calendar as CalendarIcon, AlertCircle, Trash2, MoreHorizontal, ClipboardList, Link as LinkIcon } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { Survey, SurveyResponse } from '@/types/survey';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import { Loader2 } from "lucide-react";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import { format } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { TableCell, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface SurveyCardProps {
    survey: Survey;
    responses: SurveyResponse[];
    onUpdate: (updatedSurvey: Survey) => void;
    onDuplicate: (surveyId: string) => void;
    isSelected: boolean;
    onToggleSelect: () => void;
}

export default function SurveyCard({ survey, responses, onUpdate, onDuplicate, isSelected, onToggleSelect }: SurveyCardProps) {
    const { toast } = useToast();
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [qrCodeUrl, setQrCodeUrl] = useState('');
    const [isLoadingQr, setIsLoadingQr] = useState(false);
    const [date, setDate] = useState<DateRange | undefined>({
      from: survey.startDate ? new Date(survey.startDate) : undefined,
      to: survey.endDate ? new Date(survey.endDate) : undefined,
    });
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [editedTitle, setEditedTitle] = useState(survey.title);

    const surveyUrl = typeof window !== 'undefined' ? `${window.location.origin}/survey/view/general/${survey.id}` : '';

    const effectiveStatus = useMemo(() => {
        const now = new Date();
        const startDate = survey.startDate ? new Date(survey.startDate) : null;
        const endDate = survey.endDate ? new Date(survey.endDate) : null;

        if (survey.status === 'closed') {
            return 'closed';
        }
        if (survey.status === 'active') {
            if (startDate && now < startDate) return 'scheduled';
            if (endDate && now > endDate) return 'closed';
            if (!startDate) return 'draft'; // Active status requires a start date
            return 'active';
        }
        
        return survey.status;

    }, [survey.status, survey.startDate, survey.endDate]);

    const statusConfig: { [key: string]: { color: string; label: string; icon?: React.ElementType } } = {
        active: { color: "bg-green-500", label: "Active" },
        draft: { color: "bg-yellow-500", label: "Draft" },
        closed: { color: "bg-red-500", label: "Closed" },
        scheduled: { color: "bg-blue-500", label: "Scheduled", icon: CalendarIcon },
    };

    const { color, label, icon: StatusIcon } = statusConfig[effectiveStatus] || { color: 'bg-gray-500', label: 'Unknown' };

    const generateQrCode = async () => {
        if (!surveyUrl) return;
        setIsLoadingQr(true);
        try {
            const response = await fetch(`/api/generate-qr-code?data=${encodeURIComponent(surveyUrl)}`);
            if (!response.ok) throw new Error('Failed to generate QR code');
            const result = await response.json();
            setQrCodeUrl(result.image);
        } catch (error) {
            toast({ title: "QR Code Error", description: "Could not generate the QR code.", variant: "destructive" });
        } finally {
            setIsLoadingQr(false);
        }
    };

    const copyUrlToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(surveyUrl);
            toast({ title: 'Copied to Clipboard', description: 'The survey URL has been copied.' });
        } catch (error) {
            console.error("Failed to copy", error);
        }
    };
    
    const downloadQrCode = () => {
        if (qrCodeUrl) {
            const link = document.createElement('a');
            link.href = qrCodeUrl;
            link.download = `${survey.title.replace(/\s+/g, '_')}_qr_code.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };
    
    const handleSettingsSave = () => {
      const updatedSurvey = {
        ...survey,
        startDate: date?.from?.toISOString(),
        endDate: date?.to?.toISOString(),
      };
      onUpdate(updatedSurvey);
      toast({ title: "Settings Saved", description: "Survey activation dates have been updated."});
    };
    
    const handleTitleSave = () => {
        if (editedTitle.trim() === '') {
            toast({ variant: 'destructive', title: 'Invalid Title', description: 'Survey title cannot be empty.'});
            setEditedTitle(survey.title);
            setIsEditingTitle(false);
            return;
        }
        onUpdate({ ...survey, title: editedTitle });
        setIsEditingTitle(false);
        toast({ title: "Title Updated" });
    };

    const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleTitleSave();
        } else if (e.key === 'Escape') {
            setEditedTitle(survey.title);
            setIsEditingTitle(false);
        }
    };

    
    useEffect(() => {
        setDate({
            from: survey.startDate ? new Date(survey.startDate) : undefined,
            to: survey.endDate ? new Date(survey.endDate) : undefined,
        });
        setEditedTitle(survey.title);
    }, [survey.startDate, survey.endDate, survey.title]);
    
    const displayDate = useMemo(() => {
        if (survey.created_date) {
            return format(new Date(survey.created_date), 'LLL dd, yyyy');
        }
        return `No date set`;
    }, [survey.created_date]);

    return (
        <TableRow className={cn("group transition-colors", isSelected ? "bg-primary/5" : "hover:bg-muted/50")}>
            <TableCell className="pl-4 w-12">
                 <Checkbox
                    checked={isSelected}
                    onCheckedChange={onToggleSelect}
                    className="h-5 w-5"
                />
            </TableCell>
            <TableCell className="w-[40%] min-w-[250px]">
                <div className="flex items-center gap-4">
                     <div className="flex-1 group/title" onDoubleClick={() => setIsEditingTitle(true)}>
                        {isEditingTitle ? (
                             <Input
                              value={editedTitle}
                              onChange={(e) => setEditedTitle(e.target.value)}
                              onBlur={handleTitleSave}
                              onKeyDown={handleTitleKeyDown as any}
                              autoFocus
                              className="text-base font-bold p-0 border-none focus-visible:ring-0 resize-none h-auto"
                            />
                        ) : (
                            <h3 className="text-base font-bold leading-tight group-hover/title:text-primary cursor-pointer transition-colors">
                                {survey.title}
                            </h3>
                        )}
                    </div>
                </div>
            </TableCell>
            <TableCell className="w-[100px]">
                 {survey.template && <Badge variant="outline">{survey.template}</Badge>}
            </TableCell>
            <TableCell className="w-[90px]">
                <Badge className={cn("text-xs text-white", color)} variant="secondary">
                    {StatusIcon && <StatusIcon className="w-3 h-3 mr-1" />}
                    {label}
                </Badge>
            </TableCell>
            <TableCell className="text-center w-[90px]">
                <div className="font-mono text-lg">{responses.length}</div>
            </TableCell>
            <TableCell className="w-[150px]">
                 <div className="flex items-center gap-1.5">
                    <Clock className="w-3 h-3" />
                    <span>{displayDate}</span>
                </div>
            </TableCell>
             <TableCell className="text-right w-[150px]">
                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href={`/dashboard/createsurvey?id=${survey.id}`}><Edit className="w-4 h-4"/></Link>
                    </Button>
                    {effectiveStatus === 'active' && (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" onClick={copyUrlToClipboard}>
                                        <LinkIcon className="w-4 h-4"/>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Copy Survey Link</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )}
                    <Button variant="ghost" size="icon" asChild>
                        <Link href={`/dashboard/survey/${survey.id}/analysis`}><BarChart3 className="w-4 h-4"/></Link>
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <Dialog onOpenChange={(open) => { setIsShareModalOpen(open); if(open) generateQrCode(); }}>
                                <DialogTrigger asChild>
                                    <Button variant="ghost" className="w-full justify-start text-sm font-normal px-2 py-1.5 rounded-sm">Share</Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl">
                                    <DialogHeader>
                                        <DialogTitle>Share Survey</DialogTitle>
                                        <DialogDescription>Share your survey using the link or QR code.</DialogDescription>
                                    </DialogHeader>
                                    <div className="grid md:grid-cols-2 gap-6 py-4">
                                        <div className="space-y-4">
                                            <h4 className="font-semibold">Shareable Link</h4>
                                            <div>
                                                <Label htmlFor="survey-link">Anyone with the link can respond</Label>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <Input id="survey-link" value={surveyUrl} readOnly />
                                                    <Button variant="outline" size="icon" onClick={copyUrlToClipboard}><Copy className="w-4 w-4" /></Button>
                                                </div>
                                            </div>
                                            <h4 className="font-semibold pt-4">Activation Period</h4>
                                            <div className="space-y-2">
                                                <Label htmlFor="date">Set start and end dates for your survey.</Label>
                                                <DatePickerWithRange date={date} onDateChange={setDate} />
                                            </div>
                                            <Button onClick={handleSettingsSave}>Save Settings</Button>
                                        </div>
                                        <div className="space-y-4">
                                            <h4 className="font-semibold">QR Code</h4>
                                            <div className="flex flex-col items-center gap-2 p-4 border rounded-lg">
                                                {isLoadingQr ? <Loader2 className="w-8 h-8 animate-spin" /> : qrCodeUrl ? <Image src={qrCodeUrl} alt="Survey QR Code" width={200} height={200} data-ai-hint="QR code"/> : <p>Could not load QR code.</p>}
                                                <Button variant="outline" disabled={!qrCodeUrl || isLoadingQr} onClick={downloadQrCode}><Download className="mr-2" /> Download</Button>
                                            </div>
                                        </div>
                                    </div>
                                </DialogContent>
                            </Dialog>
                             <DropdownMenuItem onClick={() => onDuplicate(survey.id)}>
                                Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-500" onClick={() => onUpdate({ ...survey, status: 'closed' })}>
                                Close Survey
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </TableCell>
        </TableRow>
    );
}
