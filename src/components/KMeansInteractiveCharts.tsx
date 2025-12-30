'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip,
    ResponsiveContainer, Cell, CartesianGrid,
    LineChart, Line, AreaChart, Area,
    BarChart, Bar, ComposedChart, ReferenceLine
} from 'recharts';
import { Badge } from '@/components/ui/badge';
import { TrendingDown, Target, Layers, BarChart3 } from 'lucide-react';

// ============================================
// Types
// ============================================
interface OptimalKData {
    k_range: number[];
    inertias: number[];
    silhouette_scores: number[];
    recommended_k?: number;
}

interface ClusterProfile {
    size: number;
    percentage: number;
    centroid: { [key: string]: number };
}

interface ClusteringSummary {
    n_clusters: number;
    inertia: number;
    centroids: number[][];
    labels: number[];
}

interface KMeansInteractiveChartsProps {
    optimalK?: OptimalKData;
    clusteringSummary: ClusteringSummary;
    profiles: { [key: string]: ClusterProfile };
    selectedVariables: string[];
    data: any[];
}

// ============================================
// Color Palette
// ============================================
const CLUSTER_COLORS = [
    '#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6',
    '#06b6d4', '#f97316', '#84cc16', '#ec4899', '#14b8a6',
];

// ============================================
// Custom Tooltips
// ============================================
const ElbowTooltip = ({ active, payload, label, recommendedK }: any) => {
    if (!active || !payload?.length) return null;
    const isRecommended = Number(label) === recommendedK;
    
    return (
        <div className={`bg-white/95 backdrop-blur-sm rounded-lg shadow-xl border p-3 text-sm
            ${isRecommended ? 'border-indigo-300 ring-2 ring-indigo-100' : 'border-slate-200'}`}>
            <div className="flex items-center gap-2 mb-2">
                <span className="font-semibold text-slate-800">k = {label}</span>
                {isRecommended && (
                    <Badge variant="secondary" className="text-xs bg-indigo-100 text-indigo-700">Recommended</Badge>
                )}
            </div>
            <div className="text-slate-600">
                Inertia: <span className="font-mono font-medium text-slate-800">
                    {payload[0]?.value?.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
            </div>
        </div>
    );
};

const SilhouetteTooltip = ({ active, payload, label, recommendedK }: any) => {
    if (!active || !payload?.length) return null;
    const score = payload[0]?.value;
    const quality = score >= 0.7 ? 'Excellent' : score >= 0.5 ? 'Good' : score >= 0.25 ? 'Fair' : 'Poor';
    const qualityColor = score >= 0.7 ? 'text-emerald-600' : score >= 0.5 ? 'text-blue-600' : score >= 0.25 ? 'text-amber-600' : 'text-red-600';
    
    return (
        <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-xl border border-slate-200 p-3 text-sm">
            <div className="flex items-center gap-2 mb-2">
                <span className="font-semibold text-slate-800">k = {label}</span>
                {Number(label) === recommendedK && (
                    <Badge variant="secondary" className="text-xs bg-indigo-100 text-indigo-700">Recommended</Badge>
                )}
            </div>
            <div className="text-slate-600">
                Silhouette: <span className="font-mono font-medium text-slate-800">{score?.toFixed(3)}</span>
            </div>
            <div className={`text-xs font-medium ${qualityColor}`}>{quality} separation</div>
        </div>
    );
};

const ClusterTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const data = payload[0]?.payload;
    
    return (
        <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-xl border border-slate-200 p-3 text-sm">
            <div className="flex items-center gap-2 mb-1">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CLUSTER_COLORS[data.cluster % CLUSTER_COLORS.length] }} />
                <span className="font-semibold text-slate-800">Cluster {data.cluster + 1}</span>
            </div>
            <div className="text-xs text-slate-500">PC1: {data.x?.toFixed(2)} · PC2: {data.y?.toFixed(2)}</div>
        </div>
    );
};

const DistributionTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const data = payload[0]?.payload;
    
    return (
        <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-xl border border-slate-200 p-3 text-sm">
            <div className="flex items-center gap-2 mb-1">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: data.color }} />
                <span className="font-semibold text-slate-800">{data.name}</span>
            </div>
            <div className="text-slate-600">Size: <span className="font-medium text-slate-800">{data.size}</span></div>
            <div className="text-slate-600">Percentage: <span className="font-medium text-slate-800">{data.percentage.toFixed(1)}%</span></div>
        </div>
    );
};

// ============================================
// Sub Components
// ============================================
const ElbowChart = ({ data, recommendedK }: { data: any[], recommendedK?: number }) => (
    <div className="h-full flex flex-col">
        <div className="flex items-center justify-between mb-3">
            <div>
                <h4 className="font-semibold text-slate-800 text-sm">Elbow Method</h4>
                <p className="text-xs text-slate-500">Find optimal k where inertia decreases slow</p>
            </div>
            {recommendedK && <Badge variant="outline" className="text-xs">Suggested: k={recommendedK}</Badge>}
        </div>
        <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data} margin={{ top: 10, right: 20, bottom: 30, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="k" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false}
                        label={{ value: 'Number of Clusters (k)', position: 'bottom', offset: 15, fontSize: 11, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false}
                        tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}
                        label={{ value: 'Inertia (WCSS)', angle: -90, position: 'insideLeft', offset: 10, fontSize: 11, fill: '#64748b' }} />
                    <Tooltip content={<ElbowTooltip recommendedK={recommendedK} />} />
                    {recommendedK && <ReferenceLine x={recommendedK} stroke="#6366f1" strokeDasharray="5 5" strokeWidth={2} />}
                    <Area type="monotone" dataKey="inertia" fill="#6366f1" fillOpacity={0.1} stroke="none" />
                    <Line type="monotone" dataKey="inertia" stroke="#6366f1" strokeWidth={2.5}
                        dot={(props: any) => {
                            const isRecommended = props.payload.k === recommendedK;
                            return (
                                <circle cx={props.cx} cy={props.cy} r={isRecommended ? 6 : 4}
                                    fill={isRecommended ? '#6366f1' : '#fff'} stroke="#6366f1" strokeWidth={2} />
                            );
                        }}
                        activeDot={{ r: 6, fill: '#6366f1' }} />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    </div>
);

const SilhouetteChart = ({ data, recommendedK, currentK }: { data: any[], recommendedK?: number, currentK: number }) => (
    <div className="h-full flex flex-col">
        <div className="flex items-center justify-between mb-3">
            <div>
                <h4 className="font-semibold text-slate-800 text-sm">Silhouette Scores</h4>
                <p className="text-xs text-slate-500">Higher = better cluster separation</p>
            </div>
            <Badge variant="outline" className="text-xs">Current: k={currentK}</Badge>
        </div>
        <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 10, right: 20, bottom: 30, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="k" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false}
                        label={{ value: 'Number of Clusters (k)', position: 'bottom', offset: 15, fontSize: 11, fill: '#64748b' }} />
                    <YAxis domain={[0, 1]} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false}
                        label={{ value: 'Silhouette Score', angle: -90, position: 'insideLeft', offset: 10, fontSize: 11, fill: '#64748b' }} />
                    <Tooltip content={<SilhouetteTooltip recommendedK={recommendedK} />} />
                    <ReferenceLine y={0.5} stroke="#10b981" strokeDasharray="5 5" strokeWidth={1.5} />
                    <Bar dataKey="silhouette" radius={[4, 4, 0, 0]}>
                        {data.map((entry, index) => {
                            const isCurrentK = entry.k === currentK;
                            const score = entry.silhouette;
                            const baseColor = score >= 0.5 ? '#10b981' : score >= 0.25 ? '#f59e0b' : '#ef4444';
                            return (
                                <Cell key={`cell-${index}`} fill={baseColor}
                                    fillOpacity={isCurrentK ? 1 : 0.5}
                                    stroke={isCurrentK ? baseColor : 'none'}
                                    strokeWidth={isCurrentK ? 2 : 0} />
                            );
                        })}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    </div>
);

const ClusterScatter = ({ labels, nClusters, data, selectedVariables }: { 
    labels: number[], nClusters: number, data: any[], selectedVariables: string[]
}) => {
    const [selectedCluster, setSelectedCluster] = useState<number | null>(null);
    
    const scatterData = useMemo(() => {
        if (!data.length || !selectedVariables.length) return [];
        const var1 = selectedVariables[0];
        const var2 = selectedVariables[1] || selectedVariables[0];
        const values1 = data.map(d => Number(d[var1]) || 0);
        const values2 = data.map(d => Number(d[var2]) || 0);
        const min1 = Math.min(...values1), max1 = Math.max(...values1);
        const min2 = Math.min(...values2), max2 = Math.max(...values2);
        const range1 = max1 - min1 || 1, range2 = max2 - min2 || 1;
        
        return data.map((row, idx) => ({
            x: ((Number(row[var1]) || 0) - min1) / range1 * 100,
            y: ((Number(row[var2]) || 0) - min2) / range2 * 100,
            cluster: labels[idx] || 0,
            id: idx,
        }));
    }, [data, labels, selectedVariables]);

    return (
        <div className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-3">
                <div>
                    <h4 className="font-semibold text-slate-800 text-sm">Cluster Visualization</h4>
                    <p className="text-xs text-slate-500">{selectedVariables[0]} vs {selectedVariables[1] || selectedVariables[0]}</p>
                </div>
                <div className="flex gap-1">
                    {Array.from({ length: nClusters }).map((_, i) => (
                        <button key={i} onClick={() => setSelectedCluster(selectedCluster === i ? null : i)}
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium text-white
                                transition-all ${selectedCluster === i ? 'ring-2 ring-offset-1 scale-110' : 'opacity-70 hover:opacity-100'}`}
                            style={{ backgroundColor: CLUSTER_COLORS[i % CLUSTER_COLORS.length],
                                ['--tw-ring-color' as any]: CLUSTER_COLORS[i % CLUSTER_COLORS.length] }}>
                            {i + 1}
                        </button>
                    ))}
                </div>
            </div>
            <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 10, right: 20, bottom: 30, left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis type="number" dataKey="x" domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }}
                            axisLine={{ stroke: '#e2e8f0' }} tickLine={false}
                            label={{ value: selectedVariables[0], position: 'bottom', offset: 15, fontSize: 11, fill: '#64748b' }} />
                        <YAxis type="number" dataKey="y" domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }}
                            axisLine={{ stroke: '#e2e8f0' }} tickLine={false}
                            label={{ value: selectedVariables[1] || selectedVariables[0], angle: -90, position: 'insideLeft', offset: 10, fontSize: 11, fill: '#64748b' }} />
                        <ZAxis range={[30, 50]} />
                        <Tooltip content={<ClusterTooltip />} />
                        <Scatter data={scatterData} animationDuration={500}>
                            {scatterData.map((entry, index) => (
                                <Cell key={`cell-${index}`}
                                    fill={CLUSTER_COLORS[entry.cluster % CLUSTER_COLORS.length]}
                                    fillOpacity={selectedCluster === null ? 0.7 : entry.cluster === selectedCluster ? 0.9 : 0.15}
                                    stroke={CLUSTER_COLORS[entry.cluster % CLUSTER_COLORS.length]}
                                    strokeWidth={1}
                                    style={{ transition: 'fill-opacity 0.3s' }} />
                            ))}
                        </Scatter>
                    </ScatterChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

const ClusterDistribution = ({ profiles }: { profiles: { [key: string]: ClusterProfile } }) => {
    const [hoveredCluster, setHoveredCluster] = useState<string | null>(null);
    
    const barData = useMemo(() => Object.entries(profiles).map(([name, profile], idx) => ({
        name: name.replace('Cluster ', 'C'),
        fullName: name,
        size: profile.size,
        percentage: profile.percentage,
        color: CLUSTER_COLORS[idx % CLUSTER_COLORS.length],
    })), [profiles]);

    return (
        <div className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-3">
                <div>
                    <h4 className="font-semibold text-slate-800 text-sm">Cluster Distribution</h4>
                    <p className="text-xs text-slate-500">Size of each cluster</p>
                </div>
            </div>
            <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData} margin={{ top: 10, right: 20, bottom: 30, left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false}
                            label={{ value: 'Count', angle: -90, position: 'insideLeft', offset: 10, fontSize: 11, fill: '#64748b' }} />
                        <Tooltip content={<DistributionTooltip />} />
                        <Bar dataKey="size" radius={[4, 4, 0, 0]}
                            onMouseEnter={(data) => setHoveredCluster(data.name)}
                            onMouseLeave={() => setHoveredCluster(null)}>
                            {barData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color}
                                    fillOpacity={hoveredCluster === null ? 0.85 : hoveredCluster === entry.name ? 1 : 0.4}
                                    style={{ transition: 'fill-opacity 0.2s', cursor: 'pointer' }} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-2 mt-2 justify-center">
                {barData.map((item) => (
                    <div key={item.name} className="flex items-center gap-1.5 text-xs text-slate-600">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        <span>{item.fullName}: {item.percentage.toFixed(1)}%</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

// ============================================
// Main Component
// ============================================
export default function KMeansInteractiveCharts({
    optimalK, clusteringSummary, profiles, selectedVariables, data
}: KMeansInteractiveChartsProps) {
    const [activeTab, setActiveTab] = useState<'elbow' | 'silhouette' | 'scatter' | 'distribution'>('scatter');
    
    const elbowData = useMemo(() => {
        if (!optimalK) return [];
        return optimalK.k_range.map((k, idx) => ({
            k, inertia: optimalK.inertias[idx], silhouette: optimalK.silhouette_scores[idx],
        }));
    }, [optimalK]);

    const tabs = [
        { id: 'scatter', label: 'Clusters', icon: Layers },
        { id: 'distribution', label: 'Distribution', icon: BarChart3 },
        { id: 'elbow', label: 'Elbow', icon: TrendingDown },
        { id: 'silhouette', label: 'Silhouette', icon: Target },
    ] as const;

    return (
        <div className="w-full bg-gradient-to-br from-slate-50 to-white rounded-2xl border border-slate-200 overflow-hidden">
            {/* Tab Navigation */}
            <div className="px-4 py-3 border-b border-slate-100 bg-white/80">
                <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1 w-fit">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        return (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all
                                    ${activeTab === tab.id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                                <Icon className="w-3.5 h-3.5" />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Chart Content */}
            <div className="p-4 h-[400px]">
                <AnimatePresence mode="wait">
                    <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="h-full">
                        {activeTab === 'elbow' && optimalK && (
                            <ElbowChart data={elbowData} recommendedK={optimalK.recommended_k} />
                        )}
                        {activeTab === 'silhouette' && optimalK && (
                            <SilhouetteChart data={elbowData} recommendedK={optimalK.recommended_k} currentK={clusteringSummary.n_clusters} />
                        )}
                        {activeTab === 'scatter' && (
                            <ClusterScatter labels={clusteringSummary.labels} nClusters={clusteringSummary.n_clusters}
                                data={data} selectedVariables={selectedVariables} />
                        )}
                        {activeTab === 'distribution' && (
                            <ClusterDistribution profiles={profiles} />
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50">
                <div className="flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-4">
                        <span>Clusters: <span className="font-semibold text-slate-700">{clusteringSummary.n_clusters}</span></span>
                        <span>Samples: <span className="font-semibold text-slate-700">{clusteringSummary.labels.length}</span></span>
                        <span>Variables: <span className="font-semibold text-slate-700">{selectedVariables.length}</span></span>
                    </div>
                    <span className="text-slate-400">Click tabs to explore</span>
                </div>
            </div>
        </div>
    );
}