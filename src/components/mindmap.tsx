
'use client';
import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const treeData = {
    name: "Statistical Analysis Techniques",
    children: [
      {
        name: "Descriptive",
        children: [
          { name: "Descriptive Statistics" },
          { name: "Frequency Analysis" }
        ]
      },
      {
        name: "Assumptions",
        children: [
          { name: "Normality Test" },
          { name: "Homogeneity of Variance" }
        ]
      },
      {
        name: "Comparison",
        children: [
          {
            name: "T-Tests",
            children: [
              { name: "One-Sample T-Test" },
              { name: "Independent Samples T-Test" },
              { name: "Paired Samples T-Test" }
            ]
          },
          {
            name: "ANOVA",
            children: [
              { name: "One-Way ANOVA" },
              { name: "Two-Way ANOVA" },
              { name: "ANCOVA" },
              { name: "MANOVA" },
              { name: "Repeated Measures ANOVA" }
            ]
          },
          {
            name: "Non-Parametric Tests",
            children: [
              { name: "Mann–Whitney U Test" },
              { name: "Wilcoxon Signed-Rank Test" },
              { name: "Kruskal–Wallis H Test" },
              { name: "Friedman Test" },
              { name: "McNemar’s Test" }
            ]
          }
        ]
      },
      {
        name: "Relationship",
        children: [
          { name: "Correlation" },
          { name: "Simple Linear Regression" },
          { name: "Multiple Linear Regression" },
          { name: "Polynomial Regression" },
          { name: "Logistic Regression" },
          { name: "Crosstab & Chi-Squared Test" }
        ]
      },
      {
        name: "Predictive",
        children: [
          { name: "Generalized Linear Model (GLM)" },
          { name: "Discriminant Analysis" },
          { name: "Survival Analysis" }
        ]
      },
      {
        name: "Structural",
        children: [
          { name: "Factor Analysis" },
          { name: "Reliability (Cronbach’s α)" },
          { name: "Exploratory Factor Analysis (EFA)" },
          { name: "Path Analysis" },
          { name: "Mediation Analysis" },
          { name: "Moderation Analysis" }
        ]
      },
      {
        name: "Clustering",
        children: [
          { name: "K-Means" },
          { name: "K-Medoids" },
          { name: "Hierarchical Cluster Analysis (HCA)" },
          { name: "DBSCAN" },
          { name: "HDBSCAN" }
        ]
      },
      {
        name: "Time Series",
        children: [
          { name: "Trend Analysis" },
          { name: "Seasonal Decomposition" },
          { name: "ACF / PACF Plots" },
          { name: "Stationarity Test (ADF)" },
          { name: "Ljung–Box Test" },
          { name: "ARCH–LM Test" },
          { name: "Exponential Smoothing" },
          { name: "ARIMA / SARIMAX" },
          { name: "Forecast Model Evaluation" }
        ]
      },
      {
        name: "Text Analysis",
        children: [
          { name: "Sentiment Analysis" },
          { name: "Topic Modeling (LDA)" },
          { name: "Word Cloud" }
        ]
      },
      {
        name: "Marketing",
        children: [
          { name: "Importance–Performance Analysis (IPA)" },
          { name: "TURF Analysis" }
        ]
      },
      {
        name: "Panel & Econometrics",
        children: [
          { name: "Panel Data Regression" },
          { name: "Instrumental Variable (IV)" },
          { name: "Two-Stage Least Squares (2SLS)" },
          { name: "Difference-in-Differences (DID)" },
          { name: "Regression Discontinuity (RD)" },
          { name: "Spatial Autoregressive (SAR)" },
          { name: "Spatial Error Model (SEM)" },
          { name: "Time-Series Cross-Sectional Analysis" },
          { name: "Propensity Score Matching (PSM)" }
        ]
      }
    ]
  };
  
const Mindmap: React.FC = () => {
    const svgRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        if (!svgRef.current) return;
        
        d3.select(svgRef.current).selectAll("*").remove();

        const margin = {top: 20, right: 120, bottom: 20, left: 240};
        const width = 1200 - margin.left - margin.right;
        const height = 800 - margin.top - margin.bottom;
        
        const svg = d3.select(svgRef.current)
            .attr("width", width + margin.right + margin.left)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        let i = 0;
        const duration = 750;
        let root: d3.HierarchyNode<any>;

        const treemap = d3.tree().size([height, width]);

        root = d3.hierarchy(treeData, d => d.children);
        root.x0 = height / 2;
        root.y0 = 0;
        
        function collapse(d: any) {
            if(d.children) {
                d._children = d.children;
                d._children.forEach(collapse);
                d.children = null;
            }
        }
        
        root.children?.forEach(collapse);
        update(root);

        function update(source: any) {
            const treeData = treemap(root);
            const nodes = treeData.descendants();
            const links = treeData.descendants().slice(1);

            nodes.forEach(d => { d.y = d.depth * 180; });

            const node = svg.selectAll<SVGGElement, any>("g.node")
                .data(nodes, d => d.id || (d.id = ++i));

            const nodeEnter = node.enter().append("g")
                .attr("class", "node")
                .attr("transform", d => "translate(" + source.y0 + "," + source.x0 + ")")
                .on("click", click);

            nodeEnter.append("circle")
                .attr("class", d => "node " + (d.children ? "node--internal" : "node--leaf"))
                .attr("r", 1e-6)
                .style("fill", d => d.children ? "#e8f4fd" : "#fff");

            nodeEnter.append("text")
                .attr("dy", ".35em")
                .attr("x", d => d.children || d._children ? -13 : 13)
                .attr("text-anchor", d => d.children || d._children ? "end" : "start")
                .text(d => d.data.name);

            const nodeUpdate = nodeEnter.merge(node);

            nodeUpdate.transition()
                .duration(duration)
                .attr("transform", d => "translate(" + d.y + "," + d.x + ")");

            nodeUpdate.select("circle.node")
                .attr("r", 10)
                .style("fill", d => d._children ? "#e8f4fd" : "#fff")
                .attr("cursor", "pointer");

            nodeUpdate.select("text")
                .style("fill-opacity", 1);
                
            const nodeExit = node.exit().transition()
                .duration(duration)
                .attr("transform", d => "translate(" + source.y + "," + source.x + ")")
                .remove();

            nodeExit.select("circle").attr("r", 1e-6);
            nodeExit.select("text").style("fill-opacity", 1e-6);

            const link = svg.selectAll<SVGPathElement, any>("path.link")
                .data(links, d => d.id);

            const linkEnter = link.enter().insert("path", "g")
                .attr("class", "link")
                .attr("d", d => {
                    const o = {x: source.x0, y: source.y0};
                    return diagonal(o, o);
                });

            const linkUpdate = linkEnter.merge(link);

            linkUpdate.transition()
                .duration(duration)
                .attr("d", d => diagonal(d, d.parent));

            link.exit().transition()
                .duration(duration)
                .attr("d", d => {
                    const o = {x: source.x, y: source.y};
                    return diagonal(o, o);
                })
                .remove();

            nodes.forEach((d: any) => {
                d.x0 = d.x;
                d.y0 = d.y;
            });

            function diagonal(s: any, d: any) {
                 return `M ${s.y} ${s.x}
                        C ${(s.y + d.y) / 2} ${s.x},
                          ${(s.y + d.y) / 2} ${d.x},
                          ${d.y} ${d.x}`;
            }

            function click(event: any, d: any) {
                if (d.children) {
                    d._children = d.children;
                    d.children = null;
                } else {
                    d.children = d._children;
                    d._children = null;
                }
                update(d);
            }
        }

    }, []);

    return (
        <div>
            <style jsx global>{`
                .node circle { 
                  fill: #fff; 
                  stroke: #3498db; 
                  stroke-width: 2px;
                  cursor: pointer;
                  transition: all 0.3s;
                }
                
                .node circle:hover {
                  stroke-width: 3px;
                  stroke: #e74c3c;
                }
                
                .node text { 
                  font-size: 13px;
                  font-weight: 500;
                  pointer-events: none;
                  fill: #2c3e50;
                }
                
                .link { 
                  fill: none; 
                  stroke: #bdc3c7; 
                  stroke-width: 2px;
                  transition: stroke 0.3s;
                }
                
                .node--internal circle {
                  fill: #e8f4fd;
                }
                
                .node--leaf circle {
                  fill: #ffffff;
                }
            `}</style>
            <svg ref={svgRef}></svg>
        </div>
    );
}

export default Mindmap;
