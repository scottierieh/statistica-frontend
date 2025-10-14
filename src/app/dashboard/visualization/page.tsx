
'use client';

export default function VisualizationPage() {
    const css = `
        .container { max-width: 1400px; margin: 0 auto; }
        .header-card { background: white; border-radius: 12px; padding: 30px; margin-bottom: 24px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header-card h1 { font-size: 2em; color: #1a202c; margin-bottom: 8px; }
        .header-card p { color: #718096; font-size: 1em; }
        .info-alert { background: linear-gradient(to br, #dbeafe, white); border: 2px solid #bfdbfe; border-radius: 12px; padding: 20px; margin-bottom: 24px; display: flex; gap: 12px; }
        .info-icon { width: 20px; height: 20px; color: #2563eb; flex-shrink: 0; }
        .info-content h3 { color: #1e3a8a; font-size: 1.1em; margin-bottom: 8px; }
        .info-content p { color: #1e40af; font-size: 0.9em; line-height: 1.6; }
        .category-section { margin-bottom: 24px; }
        .category-header { background: white; border-radius: 12px 12px 0 0; padding: 20px 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
        .category-title { font-size: 1.5em; font-weight: 700; color: #1a202c; display: flex; align-items: center; gap: 12px; }
        .category-badge { background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 4px 12px; border-radius: 20px; font-size: 0.75em; font-weight: 600; }
        .chart-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px; padding: 20px; background: rgba(255, 255, 255, 0.95); border-radius: 0 0 12px 12px; }
        .chart-card { background: white; border: 2px solid #e2e8f0; border-radius: 12px; padding: 20px; transition: all 0.3s ease; cursor: pointer; position: relative; }
        .chart-card:hover { transform: translateY(-4px); box-shadow: 0 12px 24px rgba(0,0,0,0.12); border-color: #667eea; }
        .chart-header { display: flex; justify-content: space-between; align-items: start; margin-bottom: 16px; }
        .chart-info { flex: 1; }
        .chart-name { font-size: 1.15em; font-weight: 600; color: #667eea; margin-bottom: 6px; }
        .chart-description { font-size: 0.85em; color: #64748b; line-height: 1.5; }
        .chart-visual { width: 70px; height: 70px; background: linear-gradient(135deg, #f5f7fa, #eef2f7); border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .icon-svg { width: 60px; height: 60px; }
        .chart-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 12px; }
        .tag { background: #f1f5f9; color: #475569; padding: 4px 10px; border-radius: 6px; font-size: 0.75em; font-weight: 500; }
        .tag.primary { background: linear-gradient(to br, #fef3c7, #fde68a); color: #92400e; border: 1px solid #fbbf24; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px; }
        .stat-card { background: white; border-radius: 12px; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
        .stat-card.red { border: 2px solid #fecaca; background: linear-gradient(to br, #fee2e2, white); }
        .stat-card.green { border: 2px solid #bbf7d0; background: linear-gradient(to br, #dcfce7, white); }
        .stat-card.blue { border: 2px solid #bfdbfe; background: linear-gradient(to br, #dbeafe, white); }
        .stat-card.purple { border: 2px solid #e9d5ff; background: linear-gradient(to br, #f3e8ff, white); }
        .stat-label { font-size: 0.85em; color: #64748b; margin-bottom: 8px; }
        .stat-value { font-size: 2em; font-weight: 700; color: #1a202c; }
        @media (max-width: 768px) {
            .chart-grid { grid-template-columns: 1fr; }
            .header-card h1 { font-size: 1.5em; }
            .stats-grid { grid-template-columns: 1fr; }
        }
    `;

    return (
        <div className="bg-slate-50 p-5 md:p-10 min-h-screen">
            <style>{css}</style>
            <div className="container">
                <div className="header-card">
                    <h1>📊 Chart Types Reference Guide</h1>
                    <p>Comprehensive visualization guide for survey analysis and data representation</p>
                </div>
                
                <div className="info-alert">
                    <svg className="info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <div className="info-content">
                        <h3>Quick Guide</h3>
                        <p>This reference guide contains <strong>70+ chart types</strong> organized into 10 categories. Each chart includes visual examples, descriptions, and recommended use cases for survey analysis and data visualization.</p>
                    </div>
                </div>
                
                <div className="stats-grid">
                    <div className="stat-card red">
                        <div className="stat-label">Basic Charts</div>
                        <div className="stat-value">13</div>
                    </div>
                    <div className="stat-card green">
                        <div className="stat-label">Statistical Charts</div>
                        <div className="stat-value">7</div>
                    </div>
                    <div className="stat-card blue">
                        <div className="stat-label">Survey Specific</div>
                        <div className="stat-value">8</div>
                    </div>
                    <div className="stat-card purple">
                        <div className="stat-label">Total Categories</div>
                        <div className="stat-value">10</div>
                    </div>
                </div>
                
                <div className="category-section">
                    <div className="category-header">
                        <div className="category-title">
                            <span>1️⃣ Basic Charts</span>
                            <span className="category-badge">13 Charts</span>
                        </div>
                    </div>
                    <div className="chart-grid">
                        <div className="chart-card">
                            <div className="chart-header">
                                <div className="chart-info">
                                    <div className="chart-name">Bar Chart</div>
                                    <div className="chart-description">Compare categorical values horizontally</div>
                                </div>
                                <div className="chart-visual">
                                    <svg className="icon-svg" viewBox="0 0 100 100">
                                        <rect x="15" y="20" width="70" height="15" fill="#667eea" rx="2"></rect>
                                        <rect x="15" y="45" width="50" height="15" fill="#764ba2" rx="2"></rect>
                                        <rect x="15" y="70" width="60" height="15" fill="#9f7aea" rx="2"></rect>
                                    </svg>
                                </div>
                            </div>
                            <div className="chart-tags">
                                <span className="tag primary">Ranking</span>
                                <span className="tag">Categorical</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="category-section">
                    <div className="category-header">
                        <div className="category-title">
                            <span>6️⃣ Time Series Charts</span>
                            <span className="category-badge">5 Charts</span>
                        </div>
                    </div>
                    <div className="chart-grid">
                        <div className="chart-card">
                            <div className="chart-header">
                                <div className="chart-info">
                                    <div className="chart-name">Time Series Line</div>
                                    <div className="chart-description">Track changes over time periods</div>
                                </div>
                                <div className="chart-visual">
                                    <svg className="icon-svg" viewBox="0 0 100 100">
                                        <polyline points="10,70 20,55 30,60 40,40 50,45 60,30 70,35 80,25 90,20" fill="none" stroke="#667eea" strokeWidth="2.5"/>
                                        <circle cx="40" cy="40" r="3" fill="#764ba2"/>
                                        <circle cx="60" cy="30" r="3" fill="#764ba2"/>
                                    </svg>
                                </div>
                            </div>
                            <div className="chart-tags">
                                <span className="tag primary">Trends</span>
                                <span className="tag">Monthly Response</span>
                            </div>
                        </div>
                        <div className="chart-card">
                            <div className="chart-header">
                                <div className="chart-info">
                                    <div className="chart-name">Streamgraph</div>
                                    <div className="chart-description">Stacked area chart flowing over time</div>
                                </div>
                                <div className="chart-visual">
                                    <svg className="icon-svg" viewBox="0 0 100 100">
                                        <path d="M 10 50 Q 30 40 50 45 T 90 50" fill="#667eea" opacity="0.6"/>
                                        <path d="M 10 50 Q 30 60 50 55 T 90 50" fill="#764ba2" opacity="0.6"/>
                                        <path d="M 10 60 Q 30 70 50 65 T 90 60" fill="#9f7aea" opacity="0.5"/>
                                    </svg>
                                </div>
                            </div>
                            <div className="chart-tags">
                                <span className="tag primary">Sentiment</span>
                                <span className="tag">Evolution</span>
                            </div>
                        </div>
                        <div className="chart-card">
                            <div className="chart-header">
                                <div className="chart-info">
                                    <div className="chart-name">Calendar Heatmap</div>
                                    <div className="chart-description">Activity patterns by date</div>
                                </div>
                                <div className="chart-visual">
                                    <svg className="icon-svg" viewBox="0 0 100 100">
                                        <rect x="15" y="20" width="8" height="8" fill="#667eea" opacity="0.3" rx="1"/>
                                        <rect x="25" y="20" width="8" height="8" fill="#764ba2" opacity="0.5" rx="1"/>
                                        <rect x="35" y="20" width="8" height="8" fill="#9f7aea" opacity="0.8" rx="1"/>
                                        <rect x="45" y="20" width="8" height="8" fill="#667eea" opacity="0.6" rx="1"/>
                                        <rect x="55" y="20" width="8" height="8" fill="#764ba2" opacity="0.9" rx="1"/>
                                        <rect x="15" y="30" width="8" height="8" fill="#764ba2" opacity="0.5" rx="1"/>
                                        <rect x="25" y="30" width="8" height="8" fill="#9f7aea" opacity="0.7" rx="1"/>
                                    </svg>
                                </div>
                            </div>
                            <div className="chart-tags">
                                <span className="tag primary">Activity</span>
                                <span className="tag">Patterns</span>
                            </div>
                        </div>
                        <div className="chart-card">
                            <div className="chart-header">
                                <div className="chart-info">
                                    <div className="chart-name">Gantt Chart</div>
                                    <div className="chart-description">Project timeline and scheduling</div>
                                </div>
                                <div className="chart-visual">
                                    <svg className="icon-svg" viewBox="0 0 100 100">
                                        <rect x="15" y="20" width="40" height="8" fill="#667eea" rx="2"/>
                                        <rect x="25" y="35" width="50" height="8" fill="#764ba2" rx="2"/>
                                        <rect x="30" y="50" width="35" height="8" fill="#9f7aea" rx="2"/>
                                        <rect x="20" y="65" width="45" height="8" fill="#667eea" rx="2"/>
                                        <rect x="40" y="80" width="30" height="8" fill="#764ba2" rx="2"/>
                                    </svg>
                                </div>
                            </div>
                            <div className="chart-tags">
                                <span className="tag primary">Project</span>
                                <span className="tag">Schedule</span>
                            </div>
                        </div>
                        <div className="chart-card">
                            <div className="chart-header">
                                <div className="chart-info">
                                    <div className="chart-name">Candlestick Chart</div>
                                    <div className="chart-description">Financial-style OHLC visualization</div>
                                </div>
                                <div className="chart-visual">
                                    <svg className="icon-svg" viewBox="0 0 100 100">
                                        <line x1="20" y1="25" x2="20" y2="70" stroke="#667eea" strokeWidth="1.5"/>
                                        <rect x="15" y="35" width="10" height="25" fill="#667eea" rx="1"/>
                                        <line x1="40" y1="30" x2="40" y2="65" stroke="#764ba2" strokeWidth="1.5"/>
                                        <rect x="35" y="40" width="10" height="15" fill="none" stroke="#764ba2" strokeWidth="2" rx="1"/>
                                        <line x1="60" y1="20" x2="60" y2="60" stroke="#667eea" strokeWidth="1.5"/>
                                        <rect x="55" y="30" width="10" height="20" fill="#667eea" rx="1"/>
                                    </svg>
                                </div>
                            </div>
                            <div className="chart-tags">
                                <span className="tag primary">Financial</span>
                                <span className="tag">OHLC</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className="category-section">
                    <div className="category-header">
                        <div className="category-title">
                            <span>7️⃣ Distribution & Density</span>
                            <span className="category-badge">5 Charts</span>
                        </div>
                    </div>
                    <div className="chart-grid">
                        <div className="chart-card">
                            <div className="chart-header">
                                <div className="chart-info">
                                    <div className="chart-name">Density Plot</div>
                                    <div className="chart-description">Smooth probability distribution curve</div>
                                </div>
                                <div className="chart-visual">
                                    <svg className="icon-svg" viewBox="0 0 100 100">
                                        <path d="M 10 80 Q 30 60 50 30 T 90 80" fill="#667eea" opacity="0.4" stroke="#667eea" strokeWidth="2"/>
                                    </svg>
                                </div>
                            </div>
                            <div className="chart-tags">
                                <span className="tag primary">Distribution</span>
                                <span className="tag">Probability</span>
                            </div>
                        </div>
                        
                        <div className="chart-card">
                            <div className="chart-header">
                                <div className="chart-info">
                                    <div className="chart-name">Ridgeline Plot</div>
                                    <div className="chart-description">Multiple overlapping distributions</div>
                                </div>
                                <div className="chart-visual">
                                    <svg className="icon-svg" viewBox="0 0 100 100">
                                        <path d="M 15 30 Q 35 20 50 25 T 85 30" fill="#667eea" opacity="0.4" stroke="#667eea" strokeWidth="2"/>
                                        <path d="M 15 45 Q 35 35 50 40 T 85 45" fill="#764ba2" opacity="0.4" stroke="#764ba2" strokeWidth="2"/>
                                        <path d="M 15 60 Q 35 50 50 55 T 85 60" fill="#9f7aea" opacity="0.4" stroke="#9f7aea" strokeWidth="2"/>
                                        <path d="M 15 75 Q 35 65 50 70 T 85 75" fill="#667eea" opacity="0.4" stroke="#667eea" strokeWidth="2"/>
                                    </svg>
                                </div>
                            </div>
                            <div className="chart-tags">
                                <span className="tag primary">Multiple Groups</span>
                                <span className="tag">Comparison</span>
                            </div>
                        </div>
                        
                        <div className="chart-card">
                            <div className="chart-header">
                                <div className="chart-info">
                                    <div className="chart-name">ECDF Plot</div>
                                    <div className="chart-description">Empirical cumulative distribution</div>
                                </div>
                                <div className="chart-visual">
                                    <svg className="icon-svg" viewBox="0 0 100 100">
                                        <polyline points="10,80 20,75 30,65 45,50 60,35 75,25 90,20" fill="none" stroke="#667eea" strokeWidth="2.5"/>
                                    </svg>
                                </div>
                            </div>
                            <div className="chart-tags">
                                <span className="tag primary">Cumulative</span>
                                <span className="tag">Percentiles</span>
                            </div>
                        </div>
                        
                        <div className="chart-card">
                            <div className="chart-header">
                                <div className="chart-info">
                                    <div className="chart-name">Hexbin Plot</div>
                                    <div className="chart-description">Point density with hexagons</div>
                                </div>
                                <div className="chart-visual">
                                    <svg className="icon-svg" viewBox="0 0 100 100">
                                        <polygon points="30,20 40,15 50,20 50,30 40,35 30,30" fill="#667eea" opacity="0.3"/>
                                        <polygon points="50,20 60,15 70,20 70,30 60,35 50,30" fill="#764ba2" opacity="0.5"/>
                                        <polygon points="30,40 40,35 50,40 50,50 40,55 30,50" fill="#9f7aea" opacity="0.7"/>
                                        <polygon points="50,40 60,35 70,40 70,50 60,55 50,50" fill="#667eea" opacity="0.6"/>
                                    </svg>
                                </div>
                            </div>
                            <div className="chart-tags">
                                <span className="tag primary">Large Dataset</span>
                                <span className="tag">Density</span>
                            </div>
                        </div>
                        
                        <div className="chart-card">
                            <div className="chart-header">
                                <div className="chart-info">
                                    <div className="chart-name">Contour Plot</div>
                                    <div className="chart-description">2D density with contour lines</div>
                                </div>
                                <div className="chart-visual">
                                    <svg className="icon-svg" viewBox="0 0 100 100">
                                        <ellipse cx="50" cy="50" rx="30" ry="25" fill="none" stroke="#667eea" strokeWidth="2" opacity="0.8"/>
                                        <ellipse cx="50" cy="50" rx="20" ry="17" fill="none" stroke="#764ba2" strokeWidth="2" opacity="0.8"/>
                                        <ellipse cx="50" cy="50" rx="10" ry="9" fill="none" stroke="#9f7aea" strokeWidth="2" opacity="0.8"/>
                                        <circle cx="50" cy="50" r="3" fill="#667eea"/>
                                    </svg>
                                </div>
                            </div>
                            <div className="chart-tags">
                                <span className="tag primary">2D Density</span>
                                <span className="tag">Bivariate</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className="category-section">
                    <div className="category-header">
                        <div className="category-title">
                            <span>8️⃣ Relationship & Network</span>
                            <span className="category-badge">4 Charts</span>
                        </div>
                    </div>
                    <div className="chart-grid">
                        <div className="chart-card">
                            <div className="chart-header">
                                <div className="chart-info">
                                    <div className="chart-name">Network Graph</div>
                                    <div className="chart-description">Node and edge relationships</div>
                                </div>
                                <div className="chart-visual">
                                    <svg className="icon-svg" viewBox="0 0 100 100">
                                        <line x1="50" y1="25" x2="30" y2="60" stroke="#667eea" strokeWidth="2"/>
                                        <line x1="50" y1="25" x2="70" y2="60" stroke="#667eea" strokeWidth="2"/>
                                        <line x1="30" y1="60" x2="70" y2="60" stroke="#667eea" strokeWidth="2"/>
                                        <circle cx="50" cy="25" r="6" fill="#764ba2"/>
                                        <circle cx="30" cy="60" r="6" fill="#667eea"/>
                                        <circle cx="70" cy="60" r="6" fill="#667eea"/>
                                    </svg>
                                </div>
                            </div>
                            <div className="chart-tags">
                                <span className="tag primary">Connections</span>
                                <span className="tag">Social Network</span>
                            </div>
                        </div>
                        
                        <div className="chart-card">
                            <div className="chart-header">
                                <div className="chart-info">
                                    <div className="chart-name">Sankey Diagram</div>
                                    <div className="chart-description">Flow between multiple stages</div>
                                </div>
                                <div className="chart-visual">
                                    <svg className="icon-svg" viewBox="0 0 100 100">
                                        <path d="M 20 30 C 50 30, 50 40, 80 40" fill="none" stroke="#667eea" strokeWidth="8" opacity="0.6"/>
                                        <path d="M 20 50 C 50 50, 50 50, 80 50" fill="none" stroke="#764ba2" strokeWidth="12" opacity="0.6"/>
                                        <path d="M 20 70 C 50 70, 50 60, 80 60" fill="none" stroke="#9f7aea" strokeWidth="6" opacity="0.6"/>
                                    </svg>
                                </div>
                            </div>
                            <div className="chart-tags">
                                <span className="tag primary">Flow</span>
                                <span className="tag">Path Analysis</span>
                            </div>
                        </div>
                        
                        <div className="chart-card">
                            <div className="chart-header">
                                <div className="chart-info">
                                    <div className="chart-name">Chord Diagram</div>
                                    <div className="chart-description">Inter-group flow relationships</div>
                                </div>
                                <div className="chart-visual">
                                    <svg className="icon-svg" viewBox="0 0 100 100">
                                        <circle cx="50" cy="50" r="35" fill="none" stroke="#ddd" strokeWidth="1"/>
                                        <path d="M 50 15 A 35 35 0 0 1 85 50" fill="none" stroke="#667eea" strokeWidth="6"/>
                                        <path d="M 85 50 A 35 35 0 0 1 50 85" fill="none" stroke="#764ba2" strokeWidth="6"/>
                                        <path d="M 50 85 A 35 35 0 0 1 15 50" fill="none" stroke="#9f7aea" strokeWidth="6"/>
                                        <path d="M 50 15 Q 50 50 85 50" fill="none" stroke="#667eea" strokeWidth="2" opacity="0.5"/>
                                    </svg>
                                </div>
                            </div>
                            <div className="chart-tags">
                                <span className="tag primary">Inter-relationship</span>
                                <span className="tag">Matrix Flow</span>
                            </div>
                        </div>
                        
                        <div className="chart-card">
                            <div className="chart-header">
                                <div className="chart-info">
                                    <div className="chart-name">Alluvial Diagram</div>
                                    <div className="chart-description">Changes in categorical flows</div>
                                </div>
                                <div className="chart-visual">
                                    <svg className="icon-svg" viewBox="0 0 100 100">
                                        <path d="M 20 25 C 50 25, 50 30, 80 30" fill="#667eea" opacity="0.5" stroke="#667eea" strokeWidth="1"/>
                                        <path d="M 20 35 C 50 35, 50 45, 80 45" fill="#764ba2" opacity="0.5" stroke="#764ba2" strokeWidth="1"/>
                                        <path d="M 20 50 C 50 50, 50 40, 80 40" fill="#9f7aea" opacity="0.5" stroke="#9f7aea" strokeWidth="1"/>
                                        <rect x="15" y="20" width="5" height="50" fill="#667eea" opacity="0.3"/>
                                        <rect x="80" y="28" width="5" height="35" fill="#764ba2" opacity="0.3"/>
                                    </svg>
                                </div>
                            </div>
                            <div className="chart-tags">
                                <span className="tag primary">Migration</span>
                                <span className="tag">Temporal Change</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className="category-section">
                    <div className="category-header">
                        <div className="category-title">
                            <span>9️⃣ Comparison Charts</span>
                            <span className="category-badge">4 Charts</span>
                        </div>
                    </div>
                    <div className="chart-grid">
                        <div className="chart-card">
                            <div className="chart-header">
                                <div className="chart-info">
                                    <div className="chart-name">Lollipop Chart</div>
                                    <div className="chart-description">Minimal bar chart alternative</div>
                                </div>
                                <div className="chart-visual">
                                    <svg className="icon-svg" viewBox="0 0 100 100">
                                        <line x1="20" y1="90" x2="20" y2="40" stroke="#667eea" strokeWidth="2"/>
                                        <circle cx="20" cy="40" r="5" fill="#667eea"/>
                                        <line x1="40" y1="90" x2="40" y2="30" stroke="#764ba2" strokeWidth="2"/>
                                        <circle cx="40" cy="30" r="5" fill="#764ba2"/>
                                        <line x1="60" y1="90" x2="60" y2="55" stroke="#9f7aea" strokeWidth="2"/>
                                        <circle cx="60" cy="55" r="5" fill="#9f7aea"/>
                                        <line x1="80" y1="90" x2="80" y2="20" stroke="#667eea" strokeWidth="2"/>
                                        <circle cx="80" cy="20" r="5" fill="#667eea"/>
                                    </svg>
                                </div>
                            </div>
                            <div className="chart-tags">
                                <span className="tag primary">Ranking</span>
                                <span className="tag">Clean Design</span>
                            </div>
                        </div>
                        
                        <div className="chart-card">
                            <div className="chart-header">
                                <div className="chart-info">
                                    <div className="chart-name">Pareto Chart</div>
                                    <div className="chart-description">80/20 rule visualization</div>
                                </div>
                                <div className="chart-visual">
                                    <svg className="icon-svg" viewBox="0 0 100 100">
                                        <rect x="15" y="30" width="12" height="60" fill="#667eea"/>
                                        <rect x="32" y="50" width="12" height="40" fill="#764ba2"/>
                                        <rect x="49" y="65" width="12" height="25" fill="#9f7aea"/>
                                        <rect x="66" y="75" width="12" height="15" fill="#667eea" opacity="0.5"/>
                                        <polyline points="20,30 38,40 55,50 72,55 85,58" fill="none" stroke="#764ba2" strokeWidth="2.5"/>
                                    </svg>
                                </div>
                            </div>
                            <div className="chart-tags">
                                <span className="tag primary">Quality Control</span>
                                <span className="tag">ABC Analysis</span>
                            </div>
                        </div>
                        
                        <div className="chart-card">
                            <div className="chart-header">
                                <div className="chart-info">
                                    <div className="chart-name">Sunburst Chart</div>
                                    <div className="chart-description">Hierarchical pie chart</div>
                                </div>
                                <div className="chart-visual">
                                    <svg className="icon-svg" viewBox="0 0 100 100">
                                        <circle cx="50" cy="50" r="15" fill="#667eea"/>
                                        <path d="M 50 35 A 15 15 0 0 1 65 50 L 75 50 A 25 25 0 0 0 50 25 Z" fill="#764ba2" opacity="0.8"/>
                                        <path d="M 65 50 A 15 15 0 0 1 50 65 L 50 75 A 25 25 0 0 0 75 50 Z" fill="#9f7aea" opacity="0.8"/>
                                        <path d="M 50 65 A 15 15 0 0 1 35 50 L 25 50 A 25 25 0 0 0 50 75 Z" fill="#667eea" opacity="0.6"/>
                                    </svg>
                                </div>
                            </div>
                            <div className="chart-tags">
                                <span className="tag primary">Hierarchy</span>
                                <span className="tag">Multi-level</span>
                            </div>
                        </div>
                        
                        <div className="chart-card">
                            <div className="chart-header">
                                <div className="chart-info">
                                    <div className="chart-name">Marimekko Chart</div>
                                    <div className="chart-description">2D market share visualization</div>
                                </div>
                                <div className="chart-visual">
                                    <svg className="icon-svg" viewBox="0 0 100 100">
                                        <rect x="15" y="20" width="25" height="35" fill="#667eea" opacity="0.8" stroke="white" strokeWidth="2"/>
                                        <rect x="15" y="55" width="25" height="25" fill="#764ba2" opacity="0.7" stroke="white" strokeWidth="2"/>
                                        <rect x="42" y="20" width="18" height="40" fill="#9f7aea" opacity="0.8" stroke="white" strokeWidth="2"/>
                                        <rect x="42" y="60" width="18" height="20" fill="#667eea" opacity="0.6" stroke="white" strokeWidth="2"/>
                                    </svg>
                                </div>
                            </div>
                            <div className="chart-tags">
                                <span className="tag primary">Market Share</span>
                                <span className="tag">2D Composition</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className="category-section">
                    <div className="category-header">
                        <div className="category-title">
                            <span>🔟 Special & Advanced</span>
                            <span className="category-badge">3 Charts</span>
                        </div>
                    </div>
                    <div className="chart-grid">
                        <div className="chart-card">
                            <div className="chart-header">
                                <div className="chart-info">
                                    <div className="chart-name">Scatter Matrix</div>
                                    <div className="chart-description">Pairwise scatter plots</div>
                                </div>
                                <div className="chart-visual">
                                    <svg className="icon-svg" viewBox="0 0 100 100">
                                        <rect x="10" y="10" width="35" height="35" fill="none" stroke="#ddd" strokeWidth="1"/>
                                        <rect x="55" y="10" width="35" height="35" fill="none" stroke="#ddd" strokeWidth="1"/>
                                        <rect x="10" y="55" width="35" height="35" fill="none" stroke="#ddd" strokeWidth="1"/>
                                        <rect x="55" y="55" width="35" height="35" fill="none" stroke="#ddd" strokeWidth="1"/>
                                        <circle cx="20" cy="30" r="2" fill="#667eea"/>
                                        <circle cx="30" cy="20" r="2" fill="#667eea"/>
                                        <circle cx="65" cy="35" r="2" fill="#764ba2"/>
                                    </svg>
                                </div>
                            </div>
                            <div className="chart-tags">
                                <span className="tag primary">Multivariate</span>
                                <span className="tag">Correlation</span>
                            </div>
                        </div>
                        
                        <div className="chart-card">
                            <div className="chart-header">
                                <div className="chart-info">
                                    <div className="chart-name">Mosaic Plot</div>
                                    <div className="chart-description">Categorical variable relationships</div>
                                </div>
                                <div className="chart-visual">
                                    <svg className="icon-svg" viewBox="0 0 100 100">
                                        <rect x="15" y="20" width="30" height="25" fill="#667eea" opacity="0.7" stroke="white" strokeWidth="2"/>
                                        <rect x="15" y="45" width="30" height="35" fill="#764ba2" opacity="0.7" stroke="white" strokeWidth="2"/>
                                        <rect x="47" y="20" width="18" height="30" fill="#9f7aea" opacity="0.7" stroke="white" strokeWidth="2"/>
                                        <rect x="47" y="50" width="18" height="30" fill="#667eea" opacity="0.5" stroke="white" strokeWidth="2"/>
                                    </svg>
                                </div>
                            </div>
                            <div className="chart-tags">
                                <span className="tag primary">Categorical</span>
                                <span className="tag">Proportions</span>
                            </div>
                        </div>
                        
                        <div className="chart-card">
                            <div className="chart-header">
                                <div className="chart-info">
                                    <div className="chart-name">Spiral Chart</div>
                                    <div className="chart-description">Cyclical time patterns</div>
                                </div>
                                <div className="chart-visual">
                                    <svg className="icon-svg" viewBox="0 0 100 100">
                                        <path d="M 50 50 Q 50 40 55 40 T 60 45 T 60 55 T 55 65 T 45 65 T 35 60 T 30 45 T 40 30 T 60 25" 
                                              fill="none" stroke="#667eea" strokeWidth="2.5"/>
                                        <circle cx="50" cy="50" r="3" fill="#764ba2"/>
                                        <circle cx="60" cy="25" r="3" fill="#9f7aea"/>
                                    </svg>
                                </div>
                            </div>
                            <div className="chart-tags">
                                <span className="tag primary">Seasonal</span>
                                <span className="tag">Cyclical</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className="info-alert">
                    <svg className="info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <div className="info-content">
                        <h3>Selection Tips</h3>
                        <p><strong>For Survey Analysis:</strong> Use Likert Scale Charts, Diverging Bars, and Radar Charts to visualize satisfaction and preference. <strong>For Time-Based Data:</strong> Time Series Line and Calendar Heatmaps are excellent for tracking trends and patterns.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
