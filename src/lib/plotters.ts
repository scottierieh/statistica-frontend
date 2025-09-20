'use client';

import { type Plotly } from "plotly.js-dist";

export function plotVanWestendorp(data: {
    prices: number[];
    tooCheap: number[];
    cheap: number[];
    expensive: number[];
    tooExpensive: number[];
    intersections: any;
}) {
    const plotData = [
        {
            x: data.prices,
            y: data.tooCheap.map(v => 100 - v),
            mode: 'lines',
            name: 'Not Too Cheap',
            line: { color: 'skyblue', dash: 'dash' }
        },
        {
            x: data.prices,
            y: data.cheap.map(v => 100 - v),
            mode: 'lines',
            name: 'Not Cheap',
            line: { color: 'blue' }
        },
        {
            x: data.prices,
            y: data.expensive,
            mode: 'lines',
            name: 'Expensive',
            line: { color: 'orange' }
        },
        {
            x: data.prices,
            y: data.tooExpensive,
            mode: 'lines',
            name: 'Too Expensive',
            line: { color: 'red', dash: 'dash' }
        }
    ];

    const shapes: Partial<Plotly.Shape>[] = [];
    if (data.intersections.optimal) {
        shapes.push({
            type: 'line',
            x0: data.intersections.optimal, x1: data.intersections.optimal,
            y0: 0, y1: 100,
            line: { color: 'green', width: 2, dash: 'dot' },
            name: 'OPP'
        });
    }
    if (data.intersections.too_cheap) {
         shapes.push({
            type: 'line',
            x0: data.intersections.too_cheap, x1: data.intersections.too_cheap,
            y0: 0, y1: 100,
            line: { color: 'purple', width: 2, dash: 'dot' }
        });
    }
    if (data.intersections.cheap && data.intersections.expensive) {
        shapes.push({
            type: 'rect',
            x0: data.intersections.cheap, x1: data.intersections.expensive,
            y0: 0, y1: 100,
            fillcolor: 'grey', opacity: 0.1,
            line: { width: 0 }
        });
    }

    const layout: Partial<Plotly.Layout> = {
        title: 'Van Westendorp Price Sensitivity Meter',
        xaxis: { title: 'Price' },
        yaxis: { title: 'Percentage of Respondents (%)', range: [0, 100] },
        shapes: shapes,
        legend: { x: 1, y: 1, xanchor: 'right' }
    };

    return JSON.stringify({ data: plotData, layout });
}
