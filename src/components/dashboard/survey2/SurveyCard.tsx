
'use client';
import { motion } from "framer-motion";
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarChart, Edit, Users, Clock, Settings, Share2, QrCode, Copy, Download, Calendar as CalendarIcon, AlertCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { Survey, SurveyResponse } from '@/types/survey';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import { Loader2 } from "lucide-react";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import { addDays } from "date-fns";

interface SurveyCardProps {
    survey: Survey;
    responses: SurveyResponse[];
    onUpdate: (updatedSurvey: Survey) => void;
}

export default function SurveyCard({ survey, responses, onUpdate }: SurveyCardProps) {
    const { toast } = useToast();
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [qrCodeUrl, setQrCodeUrl] = useState('');
    const [isLoadingQr, setIsLoadingQr] = useState(false);
    const [date, setDate] = useState<DateRange | undefined>({
      from: survey.startDate ? new Date(survey.startDate) : undefined,
      to: survey.endDate ? new Date(survey.endDate) : undefined,
    });

    const cardVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 },
    };

    const surveyUrl = typeof window !== 'undefined' ? `${window.location.origin}/survey/view/general/${survey.id}` : '';

    const effectiveStatus = useMemo(() => {
        if (survey.status === 'draft' || survey.status === 'closed') {
            return survey.status;
        }
        const now = new Date();
        const startDate = survey.startDate ? new Date(survey.startDate) : null;
        const endDate = survey.endDate ? new Date(survey.endDate) : null;
        
        if (startDate && now < startDate) return 'scheduled';
        if (endDate && now > endDate) return 'closed';

        return 'active';
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
    
    useEffect(() => {
        setDate({
            from: survey.startDate ? new Date(survey.startDate) : undefined,
            to: survey.endDate ? new Date(survey.endDate) : undefined,
        });
    }, [survey.startDate, survey.endDate]);

    return (
        <motion.div
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            layout
            className="bg-white rounded-2xl p-6 border border-slate-200 flex flex-col justify-between shadow-sm hover:shadow-xl transition-shadow duration-300"
        >
            <div>
                <div className="flex justify-between items-start mb-4">
                    <h3 className="font-bold text-slate-800 text-lg leading-tight pr-4">{survey.title}</h3>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger>
                                <Badge className={`${color} h-6 px-2 flex items-center gap-1`}>
                                     {StatusIcon && <StatusIcon className="w-3 h-3" />}
                                    <span>{label}</span>
                                </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{label}</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
                <div className="flex items-center space-x-4 text-sm text-slate-500 mb-6">
                    <div className="flex items-center gap-1.5">
                        <Users className="w-4 h-4" />
                        <span>{responses.length} Responses</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4" />
                        <span>{new Date(survey.created_date).toLocaleDateString()}</span>
                    </div>
                </div>
            </div>
            <div className="flex gap-2">
                <Link href={`/dashboard/survey?id=${survey.id}&view=analysis`} className="flex-1">
                    <Button variant="outline" className="w-full gap-2 hover:bg-slate-50">
                        <BarChart className="w-4 h-4" />
                        Analyze
                    </Button>
                </Link>
                <Link href={`/dashboard/createsurvey?id=${survey.id}`} className="flex-1">
                    <Button variant="outline" className="w-full gap-2 hover:bg-slate-50">
                        <Edit className="w-4 h-4" />
                        Edit
                    </Button>
                </Link>
                 <Dialog onOpenChange={(open) => open && generateQrCode()}>
                    <DialogTrigger asChild>
                         <Button variant="outline" size="icon" className="shrink-0"><Settings className="w-4 h-4" /></Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                         <DialogHeader>
                            <DialogTitle>Survey Settings & Share</DialogTitle>
                             <DialogDescription>Manage survey availability and sharing options.</DialogDescription>
                        </DialogHeader>
                        <div className="grid md:grid-cols-2 gap-6 py-4">
                            <div className="space-y-4">
                                <h4 className="font-semibold">Activation Period</h4>
                                <div className="space-y-2">
                                    <Label htmlFor="date">Survey Dates</Label>
                                    <DatePickerWithRange date={date} onDateChange={setDate} />
                                </div>
                                <Button onClick={handleSettingsSave}>Save Settings</Button>
                            </div>
                            <div className="space-y-4">
                                <h4 className="font-semibold">Share</h4>
                                <div>
                                    <Label htmlFor="survey-link">Shareable Link</Label>
                                    <div className="flex items-center gap-2">
                                        <Input id="survey-link" value={surveyUrl} readOnly />
                                        <Button variant="outline" size="icon" onClick={copyUrlToClipboard}><Copy className="w-4 h-4" /></Button>
                                    </div>
                                </div>
                                <div>
                                    <Label>QR Code</Label>
                                    <div className="flex flex-col items-center gap-2 p-4 border rounded-lg">
                                        {isLoadingQr ? <Loader2 className="w-8 h-8 animate-spin" /> : qrCodeUrl ? <Image src={qrCodeUrl} alt="Survey QR Code" width={200} height={200} data-ai-hint="QR code"/> : <p>Could not load QR code.</p>}
                                        <Button variant="outline" disabled={!qrCodeUrl || isLoadingQr} onClick={downloadQrCode}><Download className="mr-2" /> Download</Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </motion.div>
    );
}
