'use client';

import React, { useState, useEffect } from 'react';
import { FeaturePageHeader } from '@/components/feature-page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Sparkles, 
  FileUp, 
  CheckCircle2, 
  FileSpreadsheet,
  FileText,
  Eraser,
  Wand2,
  GitMerge,
  Download,
  RefreshCw,
  Keyboard,
  Database,
  Clock,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';

const features = {
  'interface': { 
    icon: FileSpreadsheet, 
    title: 'Spreadsheet Interface', 
    description: 'Familiar Excel-like grid with drag-and-drop, inline editing, and visual cell selection.',
    image: PlaceHolderImages.find(p => p.id === "dashboard-analytics"),
    details: [
      'Click to edit any cell',
      'Add/delete rows and columns',
      'Sort and filter data',
      'Multi-tab support',
      'Search across all cells',
    ]
  },
  'cleaning': { 
    icon: Eraser, 
    title: 'Smart Cleaning', 
    description: 'Handle missing values, remove duplicates, and fix data quality issues automatically.',
    image: PlaceHolderImages.find(p => p.id === "api-integrations"),
    details: [
      '6 methods to fill missing values',
      'Find and remove duplicates',
      'Automatic type detection',
      'Outlier identification',
      'Visual missing data indicators',
    ]
  },
  'transform': { 
    icon: Wand2, 
    title: 'Data Transformation', 
    description: 'Apply mathematical transformations, normalization, and encoding for analysis-ready data.',
    image: PlaceHolderImages.find(p => p.id === "hero-image"),
    details: [
      'Log, sqrt, square transforms',
      'Z-score & min-max scaling',
      'One-hot encoding',
      'Column type conversion',
      'Batch operations on multiple columns',
    ]
  },
  'merge': { 
    icon: GitMerge, 
    title: 'Merge & Join', 
    description: 'Combine datasets using append or SQL-style joins (INNER, LEFT, RIGHT, FULL).',
    image: PlaceHolderImages.find(p => p.id === "market-research-banner"),
    details: [
      'Append mode (stack rows)',
      'Join by key column',
      'Multiple join types',
      'Automatic column matching',
      'Handle mismatched schemas',
    ]
  },
  'export': { 
    icon: Download, 
    title: 'Flexible Export', 
    description: 'Download cleaned data as CSV, Excel, or JSON—ready for analysis or sharing.',
    image: PlaceHolderImages.find(p => p.id === "empty-state-chart"),
    details: [
      'CSV with UTF-8 encoding',
      'Excel (.xlsx) format',
      'JSON for APIs',
      'Preserve column types',
      'Quick export (Ctrl+S)',
    ]
  },
};

const FeatureCard = ({ 
  feature, 
  featureKey,
  isActive, 
  onMouseEnter, 
  onMouseLeave 
}: { 
  feature: typeof features[keyof typeof features];
  featureKey: string;
  isActive: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) => {
  const Icon = feature.icon;
  
  return (
    <div 
      className={cn(
        "p-5 rounded-lg cursor-pointer transition-all duration-200 border",
        isActive 
          ? "bg-primary/5 border-primary" 
          : "bg-white border-border hover:border-primary/50"
      )}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold mb-1">{feature.title}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {feature.description}
          </p>
        </div>
      </div>
    </div>
  );
};

const steps = [
  {
    number: '1',
    title: 'Load Your Data',
    description: 'Upload CSV, Excel, or JSON files with drag-and-drop',
    icon: FileUp,
  },
  {
    number: '2',
    title: 'Clean & Fix Issues',
    description: 'Fill missing values, remove duplicates, fix types',
    icon: Eraser,
  },
  {
    number: '3',
    title: 'Transform Features',
    description: 'Normalize, encode, and prepare for analysis',
    icon: Wand2,
  },
  {
    number: '4',
    title: 'Export Results',
    description: 'Download cleaned data in your preferred format',
    icon: Download,
  },
];

const capabilities = [
  {
    category: 'Missing Value Handling',
    icon: Eraser,
    items: ['Mean', 'Median', 'Mode', 'Zero', 'Forward Fill', 'Backward Fill'],
  },
  {
    category: 'Transformations',
    icon: Wand2,
    items: ['Natural Log', 'Square Root', 'Absolute Value', 'Round', 'Z-Score', 'Min-Max Scaling'],
  },
  {
    category: 'Encoding',
    icon: Database,
    items: ['One-Hot Encoding', 'Drop First Category', 'Custom Prefix', 'Keep Original Column'],
  },
  {
    category: 'Operations',
    icon: RefreshCw,
    items: ['50-Level Undo/Redo', 'Find Duplicates', 'Remove Duplicates', 'Column Type Detection', 'Sort & Filter', 'Merge Datasets'],
  },
];

export default function DataPrepFeaturePage() {
  const featureKeys = Object.keys(features);
  const [activeFeature, setActiveFeature] = useState(featureKeys[0]);
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    if (isHovering) return;

    const interval = setInterval(() => {
      setActiveFeature(current => {
        const currentIndex = featureKeys.indexOf(current);
        const nextIndex = (currentIndex + 1) % featureKeys.length;
        return featureKeys[nextIndex];
      });
    }, 4000);

    return () => clearInterval(interval);
  }, [isHovering, featureKeys]);

  const currentFeature = features[activeFeature as keyof typeof features];

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <FeaturePageHeader title="Data Preparation" />
      
      <main className="flex-1 p-4 md:p-8 lg:p-12">
        <div className="max-w-6xl mx-auto space-y-16">
          
          {/* HERO SECTION */}
          <div className="text-center mb-16">
            <h1 className="text-4xl font-bold mb-4">
              Clean and Transform Your Data,
              <br />
              <span className="text-primary">Visually</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
              Excel-like interface with powerful data science operations. No coding required—clean, transform, and prepare your data for analysis in minutes.
            </p>
            <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <span>Visual Editing</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <span>6 Fill Methods</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <span>50-Level Undo</span>
              </div>
            </div>
          </div>

          {/* KEY FEATURES */}
          <section>
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-3">Everything You Need to Prepare Data</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Combine the familiarity of spreadsheets with advanced data preparation tools
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-8 items-start">
              {/* Feature List */}
              <div className="space-y-3">
                {Object.entries(features).map(([key, feature]) => (
                  <FeatureCard
                    key={key}
                    feature={feature}
                    featureKey={key}
                    isActive={activeFeature === key}
                    onMouseEnter={() => { setActiveFeature(key); setIsHovering(true); }}
                    onMouseLeave={() => setIsHovering(false)}
                  />
                ))}
              </div>

              {/* Feature Showcase - Interactive Demo */}
              <div className="lg:sticky lg:top-8">
                <div className="bg-white rounded-lg border shadow-lg overflow-hidden">
                  {/* Demo Window */}
                  <div className="h-96 relative bg-slate-50">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={activeFeature}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="absolute inset-0 flex flex-col"
                      >
                        {/* Spreadsheet Interface Demo - 실제 UI와 유사 */}
                        {activeFeature === 'interface' && (
                          <div className="h-full flex flex-col p-4">
                            {/* Toolbar */}
                            <div className="flex items-center gap-2 mb-3 pb-2 border-b">
                              <div className="text-sm font-semibold">customers.csv</div>
                              <div className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                                <div className="px-2 py-1 bg-slate-100 rounded">100 rows</div>
                                <div className="px-2 py-1 bg-slate-100 rounded">4 cols</div>
                              </div>
                            </div>
                            
                            {/* Data Grid */}
                            <div className="flex-1 border rounded overflow-hidden bg-white">
                              <div className="grid grid-cols-4 bg-slate-100 border-b sticky top-0">
                                {['Name', 'Age', 'City', 'Purchase'].map((header, i) => (
                                  <div key={header} className="px-3 py-2 text-xs font-semibold border-r last:border-r-0 flex items-center justify-between">
                                    <span>{header}</span>
                                    {i === 1 && <span className="text-blue-600">#</span>}
                                    {i === 3 && <span className="text-blue-600">#</span>}
                                  </div>
                                ))}
                              </div>
                              {[
                                ['Alice Johnson', '25', 'New York', '$1,234'],
                                ['Bob Smith', '30', 'Los Angeles', '$2,567'],
                                ['Charlie Brown', '28', 'San Francisco', '$890'],
                                ['Diana Prince', '35', 'New York', '$3,421'],
                                ['Eve Wilson', '42', 'Chicago', '$1,876'],
                              ].map((row, i) => (
                                <motion.div
                                  key={i}
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: i * 0.08 }}
                                  className="grid grid-cols-4 border-b hover:bg-blue-50 cursor-pointer transition-colors"
                                >
                                  {row.map((cell, j) => (
                                    <div key={j} className={cn(
                                      "px-3 py-2 text-xs border-r last:border-r-0",
                                      j === 1 || j === 3 ? "text-right font-mono" : ""
                                    )}>
                                      {cell}
                                    </div>
                                  ))}
                                </motion.div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Cleaning Demo - 실제 사이드바와 유사 */}
                        {activeFeature === 'cleaning' && (
                          <div className="h-full flex flex-col p-4">
                            {/* Header */}
                            <div className="mb-4">
                              <div className="text-sm font-semibold mb-1">Fill Missing Values</div>
                              <div className="text-xs text-muted-foreground">Select columns and choose fill method</div>
                            </div>

                            {/* Column List with Fill Methods */}
                            <div className="flex-1 space-y-2 overflow-y-auto">
                              {[
                                { col: 'Age', type: 'Number', missing: 3, method: 'Mean', color: 'blue' },
                                { col: 'Income', type: 'Number', missing: 5, method: 'Median', color: 'blue' },
                                { col: 'City', type: 'Text', missing: 2, method: 'Mode', color: 'green' },
                              ].map((item, i) => (
                                <motion.div
                                  key={item.col}
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: i * 0.1 }}
                                  className="border rounded-lg p-3 bg-white"
                                >
                                  <div className="flex items-center gap-2 mb-2">
                                    <input type="checkbox" checked readOnly className="rounded" />
                                    <div className="flex-1">
                                      <div className="text-sm font-medium">{item.col}</div>
                                      <div className="flex items-center gap-2 mt-1">
                                        <span className={cn(
                                          "px-2 py-0.5 rounded text-xs",
                                          item.color === 'blue' ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"
                                        )}>
                                          {item.type}
                                        </span>
                                        <span className="text-xs text-amber-600">{item.missing} missing</span>
                                      </div>
                                    </div>
                                  </div>
                                  <select className="w-full px-2 py-1.5 text-xs border rounded bg-slate-50" value={item.method} disabled>
                                  <option>{item.method}</option>
                                  </select>
                                </motion.div>
                              ))}
                            </div>

                            {/* Action Button */}
                            <div className="mt-4 pt-4 border-t">
                              <button className="w-full py-2 bg-primary text-primary-foreground rounded text-sm font-medium">
                                Fill Missing Values (3 columns)
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Transform Demo - 컴팩트하게 */}
                        {activeFeature === 'transform' && (
                          <div className="h-full flex flex-col p-4">
                            <div className="mb-3">
                              <div className="text-sm font-semibold">Apply Transformation</div>
                              <div className="text-xs text-muted-foreground">Select numeric columns</div>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto space-y-3">
                              <div className="grid grid-cols-2 gap-2">
                                {[
                                  { name: 'Log', formula: 'ln(x)', icon: '㏑' },
                                  { name: 'Square Root', formula: '√x', icon: '√' },
                                  { name: 'Z-Score', formula: '(x-μ)/σ', icon: 'Z' },
                                  { name: 'Min-Max', formula: '[0,1]', icon: '⇅' },
                                ].map((t, i) => (
                                  <motion.button
                                    key={t.name}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: i * 0.08 }}
                                    className={cn(
                                      "p-3 rounded-lg border text-left transition-all",
                                      i === 2 ? "bg-primary/5 border-primary" : "bg-white hover:border-primary/50"
                                    )}
                                  >
                                    <div className="text-xl mb-1">{t.icon}</div>
                                    <div className="text-xs font-medium">{t.name}</div>
                                    <div className="text-xs text-muted-foreground font-mono">{t.formula}</div>
                                  </motion.button>
                                ))}
                              </div>

                              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                                <div className="text-xs font-medium mb-1">Selected Columns</div>
                                <div className="flex gap-1">
                                  <span className="px-2 py-1 bg-white rounded text-xs">Age</span>
                                  <span className="px-2 py-1 bg-white rounded text-xs">Income</span>
                                </div>
                              </div>
                            </div>

                            <button className="mt-3 w-full py-2 bg-primary text-primary-foreground rounded text-sm">
                              Apply Z-Score
                            </button>
                          </div>
                        )}

                        {/* Merge Demo - 컴팩트하게 */}
                        {activeFeature === 'merge' && (
                          <div className="h-full flex flex-col p-4">
                            <div className="mb-3">
                              <div className="text-sm font-semibold">Merge Datasets</div>
                              <div className="text-xs text-muted-foreground">SQL-style join</div>
                            </div>

                            <div className="flex-1 space-y-3 overflow-y-auto">
                              <div className="space-y-2">
                                <div className="text-xs font-medium">Datasets</div>
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 p-2 bg-blue-50 rounded border border-blue-200">
                                    <div className="text-xs font-medium">Tab 1</div>
                                    <div className="text-xs text-muted-foreground">1,234 rows</div>
                                  </div>
                                  <div className="text-primary">→</div>
                                  <div className="flex-1 p-2 bg-purple-50 rounded border border-purple-200">
                                    <div className="text-xs font-medium">Tab 2</div>
                                    <div className="text-xs text-muted-foreground">987 rows</div>
                                  </div>
                                </div>
                              </div>

                              <div className="space-y-2">
                                <div className="text-xs font-medium">Join Type</div>
                                <div className="grid grid-cols-2 gap-2">
                                  {['INNER', 'LEFT', 'RIGHT', 'FULL'].map((type) => (
                                    <button
                                      key={type}
                                      className={cn(
                                        "py-1.5 rounded text-xs font-medium",
                                        type === 'LEFT' 
                                          ? "bg-primary text-primary-foreground" 
                                          : "bg-slate-100"
                                      )}
                                    >
                                      {type}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <div className="space-y-2">
                                <div className="text-xs font-medium">Join Key</div>
                                <select className="w-full px-2 py-1.5 text-xs border rounded">
                                  <option>customer_id</option>
                                </select>
                              </div>
                            </div>

                            <button className="mt-3 w-full py-2 bg-primary text-primary-foreground rounded text-sm">
                              Merge into this tab
                            </button>
                          </div>
                        )}

                        {/* Export Demo - 컴팩트하게 */}
                        {activeFeature === 'export' && (
                          <div className="h-full flex flex-col p-4">
                            <div className="mb-3">
                              <div className="text-sm font-semibold">Export Data</div>
                              <div className="text-xs text-muted-foreground">Choose format</div>
                            </div>

                            <div className="flex-1 space-y-2 overflow-y-auto">
                              {[
                                { format: 'CSV', desc: 'Universal format', icon: FileText, shortcut: 'Ctrl+S' },
                                { format: 'Excel', desc: 'Spreadsheet (.xlsx)', icon: FileSpreadsheet },
                                { format: 'JSON', desc: 'For APIs', icon: Database },
                              ].map((option, i) => (
                                <motion.button
                                  key={option.format}
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: i * 0.1 }}
                                  className="w-full flex items-center gap-3 p-3 bg-white rounded-lg border hover:border-primary transition-all text-left"
                                >
                                  <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                                    <option.icon className="w-5 h-5 text-slate-600" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium">{option.format}</div>
                                    <div className="text-xs text-muted-foreground truncate">{option.desc}</div>
                                  </div>
                                  {option.shortcut && (
                                    <kbd className="px-2 py-1 bg-slate-100 rounded text-xs font-mono flex-shrink-0">
                                      {option.shortcut}
                                    </kbd>
                                  )}
                                  <Download className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                </motion.button>
                              ))}
                            </div>

                            <div className="mt-3 p-2 bg-slate-100 rounded text-xs text-center text-muted-foreground">
                              Filename: customers_cleaned.csv
                            </div>
                          </div>
                        )}
                      </motion.div>
                    </AnimatePresence>
                  </div>

                  {/* Feature Details */}
                  <div className="p-6 border-t bg-slate-50">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={activeFeature}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                          <currentFeature.icon className="w-5 h-5 text-primary" />
                          {currentFeature.title}
                        </h3>
                        <ul className="space-y-2">
                          {currentFeature.details.map((detail, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                              <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                              <span>{detail}</span>
                            </li>
                          ))}
                        </ul>
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* HOW IT WORKS */}
          <section>
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-3">How It Works</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                From messy data to analysis-ready dataset in 4 steps
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {steps.map((step, idx) => (
                <Card key={idx}>
                  <CardContent className="p-6">
                    <div className="flex flex-col items-center text-center">
                      <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4 relative">
                        <step.icon className="w-7 h-7 text-primary" />
                        <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                          {step.number}
                        </div>
                      </div>
                      <h3 className="font-semibold mb-2">{step.title}</h3>
                      <p className="text-sm text-muted-foreground">{step.description}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="mt-8 text-center">
              <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                Most data cleaning tasks: 5-10 minutes
              </div>
            </div>
          </section>

          {/* CAPABILITIES */}
          <section>
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-3">What You Can Do</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Comprehensive toolkit for every data preparation task
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {capabilities.map((capability, idx) => (
                <Card key={idx}>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
                        <capability.icon className="w-5 h-5 text-primary" />
                      </div>
                      <h3 className="font-semibold">{capability.category}</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {capability.items.map((item, itemIdx) => (
                        <span 
                          key={itemIdx}
                          className="px-3 py-1 bg-muted rounded-full text-sm text-muted-foreground"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* KEYBOARD SHORTCUTS */}
          <section>
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-8">
                <div className="flex items-start gap-4 mb-6">
                  <Keyboard className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Work Faster with Keyboard Shortcuts</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Speed up your workflow with essential shortcuts
                    </p>
                  </div>
                </div>
                <div className="grid md:grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center gap-3">
                    <kbd className="px-2 py-1 bg-white rounded border text-xs font-mono">Ctrl+Z</kbd>
                    <span className="text-muted-foreground">Undo</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <kbd className="px-2 py-1 bg-white rounded border text-xs font-mono">Ctrl+S</kbd>
                    <span className="text-muted-foreground">Quick Export CSV</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <kbd className="px-2 py-1 bg-white rounded border text-xs font-mono">Delete</kbd>
                    <span className="text-muted-foreground">Delete Selected Rows</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <kbd className="px-2 py-1 bg-white rounded border text-xs font-mono">Escape</kbd>
                    <span className="text-muted-foreground">Clear Selections</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <kbd className="px-2 py-1 bg-white rounded border text-xs font-mono">Ctrl+F</kbd>
                    <span className="text-muted-foreground">Search Data</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <kbd className="px-2 py-1 bg-white rounded border text-xs font-mono">Ctrl+Shift+Z</kbd>
                    <span className="text-muted-foreground">Redo</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* CTA SECTION */}
          <Card>
            <CardContent className="text-center py-12">
              <h2 className="text-3xl font-bold mb-4">
                Ready to Clean Your Data?
              </h2>
              <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
                Start preparing your data with our visual editor—no installation required.
              </p>
              <div className="flex flex-wrap justify-center gap-4 mb-6">
                <Button size="lg" className="gap-2">
                  <Sparkles className="w-5 h-5" />
                  Start Editing
                </Button>
                <Button size="lg" variant="outline" className="gap-2">
                  <FileUp className="w-5 h-5" />
                  Try Sample Data
                </Button>
              </div>
              <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Browser-based (no install)
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Free sample datasets
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Export to any format
                </div>
              </div>
            </CardContent>
          </Card>

        </div>
      </main>
    </div>
  );
}