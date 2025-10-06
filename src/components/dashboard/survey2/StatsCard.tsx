
'use client';
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  gradient: string;
  trend?: string;
  suffix?: string;
}

export default function StatsCard({ title, value, icon: Icon, gradient, trend, suffix }: StatsCardProps) {
  
  const iconColorMap: {[key: string]: string} = {
    'from-blue-400 to-cyan-400': 'bg-blue-100 text-blue-500',
    'from-purple-400 to-pink-400': 'bg-purple-100 text-purple-500',
    'from-emerald-400 to-teal-400': 'bg-emerald-100 text-emerald-500',
    'from-orange-400 to-amber-400': 'bg-orange-100 text-orange-500'
  }
  
  const circleColorMap: {[key: string]: string} = {
    'from-blue-400 to-cyan-400': 'bg-gradient-to-br from-blue-50 to-cyan-50',
    'from-purple-400 to-pink-400': 'bg-gradient-to-br from-purple-50 to-pink-50',
    'from-emerald-400 to-teal-400': 'bg-gradient-to-br from-emerald-50 to-teal-50',
    'from-orange-400 to-amber-400': 'bg-gradient-to-br from-orange-50 to-amber-50'
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between overflow-hidden"
    >
      <div className={cn("absolute -top-8 -right-8 w-32 h-32 rounded-full", circleColorMap[gradient])} />
      <div className="relative flex justify-between items-start">
        <h3 className="font-semibold text-slate-500 text-sm">{title}</h3>
      </div>
       <div className={cn("absolute top-4 right-4 p-3 rounded-xl", iconColorMap[gradient])}>
           <Icon className="w-5 h-5" />
        </div>

      <div className="relative mt-4">
        <p className="text-4xl font-bold text-slate-900">
          {value}
          {suffix && <span className="text-lg font-medium text-slate-500 ml-1">{suffix}</span>}
        </p>
        {trend && <p className="text-sm text-slate-500 mt-1">{trend}</p>}
      </div>
    </motion.div>
  );
}
