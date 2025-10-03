
'use client';
import { motion } from "framer-motion";
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarChart, Edit, Users, Clock } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { Survey, SurveyResponse } from '@/types/survey';

interface SurveyCardProps {
    survey: Survey;
    responses: SurveyResponse[];
    onUpdate: () => void;
}


export default function SurveyCard({ survey, responses, onUpdate }: SurveyCardProps) {
    const cardVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 },
    };

    const statusConfig = {
        active: { color: "bg-green-500", label: "Active" },
        draft: { color: "bg-yellow-500", label: "Draft" },
        closed: { color: "bg-red-500", label: "Closed" },
    };

    const { color, label } = statusConfig[survey.status as keyof typeof statusConfig] || { color: 'bg-gray-500', label: 'Unknown' };

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
                    <h3 className="font-bold text-slate-800 text-lg leading-tight pr-4">{survey.name}</h3>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger>
                                <Badge className={`${color} h-2.5 w-2.5 p-0`}></Badge>
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
                <Link href={`/dashboard/survey?id=${survey.id}`} className="flex-1">
                    <Button variant="outline" className="w-full gap-2 hover:bg-slate-50">
                        <Edit className="w-4 h-4" />
                        Edit
                    </Button>
                </Link>
            </div>
        </motion.div>
    );
}
