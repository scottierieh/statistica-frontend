
'use client';
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  gradient: string;
  trend?: string;
  suffix?: string;
}

export default function StatsCard({ title, value, icon: Icon, gradient, trend, suffix }: StatsCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`bg-gradient-to-br ${gradient} p-6 rounded-2xl shadow-lg text-white transform hover:-translate-y-1 transition-transform duration-300`}
    >
      <div className="flex justify-between items-start">
        <h3 className="font-semibold text-lg">{title}</h3>
        <Icon className="w-8 h-8 opacity-80" />
      </div>
      <p className="text-5xl font-bold mt-4">
        {value}
        {suffix && <span className="text-2xl font-medium ml-1">{suffix}</span>}
      </p>
      {trend && <p className="text-sm opacity-90 mt-2">{trend}</p>}
    </motion.div>
  );
}
