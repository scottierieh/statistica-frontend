"use client";

import React, { useState, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import {
  ShieldAlert, Upload, ArrowRight, CheckCircle2, XCircle, AlertCircle, Shield, Info, HelpCircle,
  FileText, FileImage, Download, Settings, ChevronRight, Target, Zap, Search, AlertTriangle, Eye,
} from "lucide-react";

const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || "https://statistica-api-995604437166.asia-northeast3.run.app";

interface DataRow { [key: string]: string | number | null; }
interface KeyInsight { title: string; description: string; status: "positive" | "neutral" | "warning"; }

interface FraudDetectionResult {
  success: boolean;
  results: {
    top_suspicious: Array<{ [key: string]: any }>;
    recommendations: Array<{ priority: string; action: string; description: string; transaction_count: number; }>;
    transaction_table: Array<{ [key: string]: any }>;
    model_validation?: { precision: number; recall: number; f1_score: number; };
  };
  visualizations: { [key: string]: string };
  key_insights: KeyInsight[];
  summary: { 
    total_transactions: number; 
    suspicious_count: number;
    suspicious_rate: number;
    high_risk_count: number;
    medium_risk_count: number;
    total_amount: number;
    suspicious_amount: number;
    suspicious_amount_pct: number;
    avg_fraud_score: number;
  };
}

const generateSampleData = (): DataRow[] => {
  const data: DataRow[] = [];
  const categories = ["Online Purchase", "ATM Withdrawal", "Wire Transfer", "POS", "Bill Payment"];
  const locations = ["New York", "Los Angeles", "Chicago", "Miami", "Houston", "Seattle"];
  
  for (let i = 1; i <= 500; i++) {
    const isFraud = Math.random() < 0.05;
    const baseAmount = isFraud 
      ? (Math.random() < 0.5 ? 9500 + Math.random() * 400 : 2000 + Math.random() * 8000)
      : 50 + Math.random() * 500;
    
    const hour = isFraud && Math.random() < 0.6 ? Math.floor(Math.random() * 5) : Math.floor(Math.random() * 24);
    const day = Math.floor(Math.random() * 30) + 1;
    
    data.push({
      transaction_id: `TXN-${i.toString().padStart(6, '0')}`,
      customer_id: `CUST-${(Math.floor(Math.random() * 100) + 1).toString().padStart(4, '0')}`,
      amount: parseFloat(baseAmount.toFixed(2)),
      category: categories[Math.floor(Math.random() * categories.length)],
      location: locations[Math.floor(Math.random() * locations.length)],
      timestamp: `2024-01-${day.toString().padStart(2, '0')} ${hour.toString().padStart(2, '0')}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}:00`,
      is_fraud: isFraud ? 1 : 0
    });
  }
  return data;
};

const ProgressBar: React.FC<{ currentStep: number; hasResults: boolean; onStepClick: (s: number) => void }> = ({ currentStep, hasResults, onStepClick }) => {
  const steps = [{ n: 1, l: "Intro" }, { n: 2, l: "Config" }, { n: 3, l: "Validation" }, { n: 4, l: "Summary" }, { n: 5, l: "Why" }, { n: 6, l: "Report" }];
  return (
    <div className="flex items-center justify-center gap-1 mb-8">
      {steps.map((s, i) => {
        const done = s.n < currentStep, cur = s.n === currentStep, ok = s.n <= 3 || hasResults;
        return (
          <React.Fragment key={s.n}>
            <button onClick={() => ok && onStepClick(s.n)} disabled={!ok}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${cur ? "bg-primary text-primary-foreground" : done ? "bg-primary/20 text-primary" : ok ? "bg-muted" : "opacity-40 cursor-not-allowed bg-muted"}`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${cur ? "bg-primary-foreground text-primary" : done ? "bg-primary text-primary-foreground" : "bg-muted-foreground/20"}`}>{done ? "✓" : s.n}</span>
              <span className="text-sm font-medium hidden sm:inline">{s.l}</span>
            </button>
            {i < steps.length - 1 && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
          </React.Fragment>
        );
      })}
    </div>
  );
};

const getRiskBadgeColor = (level: string) => {
  switch (level) {
    case 'High': return 'bg-red-500';
    case 'Medium': return 'bg-orange-500';
    case 'Low': return 'bg-green-500';
    default: return 'bg-slate-500';
  }
};

export default function FraudDetectionPage() {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<DataRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [results, setResults] = useState<FraudDetectionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [transactionIdCol, setTransactionIdCol] = useState("");
  const [amountCol, setAmountCol] = useState("");
  const [timestampCol, setTimestampCol] = useState("");
  const [customerIdCol, setCustomerIdCol] = useState("");
  const [categoryCol, setCategoryCol] = useState("");
  const [fraudLabelCol, setFraudLabelCol] = useState("");
  const [sensitivity, setSensitivity] = useState("medium");
  const [contamination, setContamination] = useState("5");

  const numCols = columns.filter(c => { const v = data[0]?.[c]; return typeof v === "number" || !isNaN(Number(v)); });

  const loadSample = useCallback(() => {
    const d = generateSampleData();
    setData(d);
    setColumns(Object.keys(d[0]));
    setTransactionIdCol("transaction_id");
    setAmountCol("amount");
    setTimestampCol("timestamp");
    setCustomerIdCol("customer_id");
    setCategoryCol("category");
    setFraudLabelCol("is_fraud");
    setStep(2);
    setResults(null);
    setError(null);
  }, []);

  const uploadFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const fd = new FormData(); fd.append("file", file);
    try {
      setLoading(true);
      const res = await fetch(`${FASTAPI_URL}/api/data/upload`, { method: "POST", body: fd });
      if (!res.ok) throw new Error("Upload failed");
      const r = await res.json();
      setData(r.data); setColumns(r.columns); setStep(2); setResults(null); setError(null);
    } catch (err) { setError(err instanceof Error ? err.message : "Upload failed"); }
    finally { setLoading(false); }
  }, []);

  const runAnalysis = async () => {
    try {
      setLoading(true); setError(null);
      const payload: any = { 
        data, 
        transaction_id_col: transactionIdCol,
        amount_col: amountCol,
        sensitivity,
        contamination: parseFloat(contamination) / 100
      };
      if (timestampCol) payload.timestamp_col = timestampCol;
      if (customerIdCol) payload.customer_id_col = customerIdCol;
      if (categoryCol) payload.category_col = categoryCol;
      if (fraudLabelCol) payload.fraud_label_col = fraudLabelCol;
      payload.feature_cols = [amountCol];
      
      const res = await fetch(`${FASTAPI_URL}/api/analysis/fraud-detection`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail || "Analysis failed"); }
      setResults(await res.json()); setStep(4);
    } catch (err) { setError(err instanceof Error ? err.message : "Analysis failed"); }
    finally { setLoading(false); }
  };

  const downloadPNG = (k: string) => {
    if (!results?.visualizations[k]) return;
    const a = document.createElement("a"); a.href = `data:image/png;base64,${results.visualizations[k]}`; a.download = `fraud_${k}.png`; a.click();
  };

  if (step === 1) return (
    <div className="container mx-auto py-8 px-4 max-w-6xl space-y-8">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4"><ShieldAlert className="w-8 h-8 text-primary" /></div>
        <h1 className="text-3xl font-bold">Fraud Detection</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">Detect anomalies and fraudulent patterns using statistical methods and machine learning.</p>
      </div>
      <div className="grid md:grid-cols-4 gap-4">
        {[
          { icon: Search, title: "Anomaly Detection", desc: "Statistical + ML" },
          { icon: Zap, title: "Real-time Scoring", desc: "Risk score 0-100" },
          { icon: AlertTriangle, title: "Pattern Analysis", desc: "Velocity & structuring" },
          { icon: Eye, title: "Investigation", desc: "Prioritized alerts" },
        ].map(i => (
          <Card key={i.title} className="border-2 hover:border-primary/50">
            <CardHeader className="text-center pb-2"><div className="mx-auto w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center mb-2"><i.icon className="w-5 h-5 text-red-600" /></div><CardTitle className="text-base">{i.title}</CardTitle></CardHeader>
            <CardContent className="text-center text-sm text-muted-foreground">{i.desc}</CardContent>
          </Card>
        ))}
      </div>
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button size="lg" onClick={loadSample} className="gap-2"><ShieldAlert className="w-5 h-5" />Load Sample Data</Button>
        <Button size="lg" variant="outline" onClick={() => fileRef.current?.click()} className="gap-2"><Upload className="w-5 h-5" />Upload Data</Button>
        <input ref={fileRef} type="file" accept=".csv,.xlsx" onChange={uploadFile} className="hidden" />
      </div>
    </div>
  );

  if (step === 2) return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <ProgressBar currentStep={step} hasResults={!!results} onStepClick={setStep} />
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Settings className="w-5 h-5 text-primary" />Configure Analysis</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Transaction ID Column *</Label>
              <Select value={transactionIdCol} onValueChange={setTransactionIdCol}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{columns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="space-y-2"><Label>Amount Column *</Label>
              <Select value={amountCol} onValueChange={setAmountCol}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{numCols.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
            </div>
          </div>
          <Separator />
          <h4 className="font-semibold">Optional Columns</h4>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2"><Label>Timestamp</Label>
              <Select value={timestampCol || "__none__"} onValueChange={v => setTimestampCol(v === "__none__" ? "" : v)}><SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger><SelectContent><SelectItem value="__none__">-- None --</SelectItem>{columns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="space-y-2"><Label>Customer ID</Label>
              <Select value={customerIdCol || "__none__"} onValueChange={v => setCustomerIdCol(v === "__none__" ? "" : v)}><SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger><SelectContent><SelectItem value="__none__">-- None --</SelectItem>{columns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="space-y-2"><Label>Category</Label>
              <Select value={categoryCol || "__none__"} onValueChange={v => setCategoryCol(v === "__none__" ? "" : v)}><SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger><SelectContent><SelectItem value="__none__">-- None --</SelectItem>{columns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
            </div>
          </div>
          <Separator />
          <h4 className="font-semibold">Detection Settings</h4>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2"><Label>Sensitivity</Label>
              <Select value={sensitivity} onValueChange={setSensitivity}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">Low (fewer alerts)</SelectItem><SelectItem value="medium">Medium (balanced)</SelectItem><SelectItem value="high">High (more alerts)</SelectItem></SelectContent></Select>
            </div>
            <div className="space-y-2"><Label>Expected Fraud Rate (%)</Label>
              <Input type="number" min="1" max="20" value={contamination} onChange={e => setContamination(e.target.value)} />
            </div>
            <div className="space-y-2"><Label>Fraud Label (for validation)</Label>
              <Select value={fraudLabelCol || "__none__"} onValueChange={v => setFraudLabelCol(v === "__none__" ? "" : v)}><SelectTrigger><SelectValue placeholder="Optional (0/1)" /></SelectTrigger><SelectContent><SelectItem value="__none__">-- None --</SelectItem>{numCols.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
            </div>
          </div>
          <div className="flex justify-end pt-4"><Button onClick={() => setStep(3)} className="gap-2">Continue<ArrowRight className="w-4 h-4" /></Button></div>
        </CardContent>
      </Card>
    </div>
  );

  if (step === 3) {
    const checks = [
      { name: "Data Loaded", passed: data.length >= 10, msg: `${data.length} transactions` },
      { name: "Transaction ID", passed: !!transactionIdCol, msg: transactionIdCol || "Required" },
      { name: "Amount Column", passed: !!amountCol, msg: amountCol || "Required" },
    ];
    return (
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        <ProgressBar currentStep={step} hasResults={!!results} onStepClick={setStep} />
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5 text-primary" />Validation</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            {checks.map((c, i) => (
              <div key={i} className={`flex items-center justify-between p-4 rounded-lg ${c.passed ? "bg-primary/5" : "bg-rose-50"}`}>
                <div className="flex items-center gap-3">{c.passed ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <XCircle className="w-5 h-5 text-rose-500" />}<div><p className="font-medium">{c.name}</p><p className="text-sm text-muted-foreground">{c.msg}</p></div></div>
                <Badge variant={c.passed ? "default" : "destructive"}>{c.passed ? "Pass" : "Error"}</Badge>
              </div>
            ))}
            {error && <div className="bg-rose-50 rounded-lg p-4 flex items-start gap-2"><AlertCircle className="w-5 h-5 text-rose-600" /><p className="text-sm text-rose-700">{error}</p></div>}
            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
              <Button onClick={runAnalysis} disabled={loading || !checks.every(c => c.passed)} className="gap-2">
                {loading ? <><div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />Analyzing...</> : <>Run Detection<ArrowRight className="w-4 h-4" /></>}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 4 && results) {
    const { summary: s } = results;
    const alertColor = s.suspicious_rate > 10 ? 'from-red-500 to-rose-600' : s.suspicious_rate > 5 ? 'from-amber-500 to-orange-600' : 'from-green-500 to-emerald-600';
    return (
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        <ProgressBar currentStep={step} hasResults={!!results} onStepClick={setStep} />
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><ShieldAlert className="w-5 h-5 text-primary" />Fraud Detection Results</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <div className={`bg-gradient-to-r ${alertColor} rounded-xl p-6 text-white`}>
              <div className="flex items-center justify-between">
                <div><p className="text-white/80 text-sm">Suspicious Transactions</p><p className="text-4xl font-bold">{s.suspicious_count}</p><Badge className="mt-2 bg-white/20">{s.suspicious_rate.toFixed(1)}% of {s.total_transactions.toLocaleString()}</Badge></div>
                <div className="text-right"><p className="text-white/80 text-sm">Amount at Risk</p><p className="text-3xl font-bold">${(s.suspicious_amount / 1000).toFixed(1)}K</p><p className="text-white/80 text-sm">{s.suspicious_amount_pct.toFixed(1)}% of total</p></div>
              </div>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              {[
                { l: "High Risk", v: s.high_risk_count, c: "text-red-600" },
                { l: "Medium Risk", v: s.medium_risk_count, c: "text-orange-600" },
                { l: "Low Risk", v: s.total_transactions - s.suspicious_count, c: "text-green-600" },
              ].map(i => (<div key={i.l} className="bg-slate-50 rounded-xl p-4 text-center"><p className="text-sm text-muted-foreground">{i.l}</p><p className={`text-2xl font-bold ${i.c}`}>{i.v.toLocaleString()}</p></div>))}
            </div>
            <div className="space-y-3"><h4 className="font-semibold">Key Insights</h4>
              {results.key_insights.map((ins, i) => (
                <div key={i} className={`flex items-start gap-3 p-3 rounded-lg ${ins.status === "positive" ? "bg-green-50" : ins.status === "warning" ? "bg-amber-50" : "bg-slate-50"}`}>
                  {ins.status === "positive" ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : ins.status === "warning" ? <AlertTriangle className="w-5 h-5 text-amber-600" /> : <Info className="w-5 h-5 text-blue-600" />}
                  <div><p className="font-medium">{ins.title}</p><p className="text-sm text-muted-foreground">{ins.description}</p></div>
                </div>
              ))}
            </div>
            <div className="flex justify-end pt-4"><Button onClick={() => setStep(5)} className="gap-2">Understand<ArrowRight className="w-4 h-4" /></Button></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 5 && results) {
    const exps = [
      { n: 1, t: "Statistical Analysis", c: "Z-score and IQR methods detect amount outliers compared to normal patterns." },
      { n: 2, t: "Velocity Detection", c: "Flags rapid succession of transactions or unusually high frequency per customer." },
      { n: 3, t: "Pattern Analysis", c: "Detects structuring (amounts just under thresholds) and round amount patterns." },
      { n: 4, t: "Machine Learning", c: "Isolation Forest algorithm identifies complex anomalies across multiple features." },
    ];
    return (
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        <ProgressBar currentStep={step} hasResults={!!results} onStepClick={setStep} />
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><HelpCircle className="w-5 h-5 text-primary" />Understanding</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              {exps.map(e => (
                <div key={e.n} className="bg-muted/30 rounded-xl p-5 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">{e.n}</div>
                  <div><p className="font-semibold">{e.t}</p><p className="text-sm text-muted-foreground mt-1">{e.c}</p></div>
                </div>
              ))}
            </div>
            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(4)}>Back</Button>
              <Button onClick={() => setStep(6)} className="gap-2">Full Report<ArrowRight className="w-4 h-4" /></Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 6 && results) {
    const { results: r, summary: s, visualizations: v } = results;
    return (
      <div className="container mx-auto py-8 px-4 max-w-6xl space-y-6">
        <ProgressBar currentStep={step} hasResults={!!results} onStepClick={setStep} />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: Target, l: "Total", v: s.total_transactions.toLocaleString() },
            { icon: AlertTriangle, l: "Suspicious", v: s.suspicious_count.toLocaleString() },
            { icon: ShieldAlert, l: "High Risk", v: s.high_risk_count.toString() },
            { icon: Search, l: "Alert Rate", v: `${s.suspicious_rate.toFixed(1)}%` },
          ].map(i => (<Card key={i.l}><CardContent className="pt-6 text-center"><i.icon className="w-8 h-8 mx-auto text-primary mb-2" /><p className="text-sm text-muted-foreground">{i.l}</p><p className="text-xl font-bold">{i.v}</p></CardContent></Card>))}
        </div>
        <Card>
          <CardHeader><CardTitle>Visualizations</CardTitle></CardHeader>
          <CardContent>
            <Tabs defaultValue="fraud_distribution">
              <TabsList>{v.fraud_distribution && <TabsTrigger value="fraud_distribution">Distribution</TabsTrigger>}{v.detection_breakdown && <TabsTrigger value="detection_breakdown">Detection Methods</TabsTrigger>}</TabsList>
              {Object.entries(v).map(([k, val]) => val && (
                <TabsContent key={k} value={k} className="mt-4">
                  <div className="relative"><img src={`data:image/png;base64,${val}`} alt={k} className="w-full rounded-lg" /><Button size="sm" variant="outline" className="absolute top-2 right-2" onClick={() => downloadPNG(k)}><Download className="w-4 h-4" /></Button></div>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
        {r.recommendations && r.recommendations.length > 0 && (
          <Card>
            <CardHeader><CardTitle>Investigation Recommendations</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Priority</TableHead><TableHead>Action</TableHead><TableHead>Description</TableHead><TableHead className="text-right">Transactions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {r.recommendations.map((rec, i) => (
                    <TableRow key={i}><TableCell><Badge className={rec.priority === 'critical' ? 'bg-red-500' : rec.priority === 'high' ? 'bg-orange-500' : 'bg-blue-500'}>{rec.priority}</Badge></TableCell><TableCell className="font-medium">{rec.action}</TableCell><TableCell className="text-sm">{rec.description}</TableCell><TableCell className="text-right">{rec.transaction_count}</TableCell></TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardHeader><CardTitle>Top Suspicious Transactions</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Transaction ID</TableHead><TableHead className="text-right">Amount</TableHead><TableHead className="text-right">Fraud Score</TableHead><TableHead>Risk Level</TableHead></TableRow></TableHeader>
              <TableBody>
                {r.top_suspicious.slice(0, 15).map((tx: any, i: number) => (
                  <TableRow key={i}><TableCell className="font-medium">{tx[transactionIdCol]}</TableCell><TableCell className="text-right">${tx[amountCol]?.toLocaleString()}</TableCell><TableCell className="text-right font-bold">{tx.fraud_score?.toFixed(1)}</TableCell><TableCell><Badge className={getRiskBadgeColor(tx.risk_level)}>{tx.risk_level}</Badge></TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Export</CardTitle></CardHeader>
          <CardContent className="flex gap-3">
            <Button variant="outline" className="gap-2" onClick={() => downloadPNG("fraud_distribution")}><FileImage className="w-4 h-4" />PNG</Button>
            <Button variant="outline" disabled className="gap-2"><FileText className="w-4 h-4" />Excel (Soon)</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}