/**
 * Manufacturing Statistics API Route
 * Location: app/api/analysis/manufacturing-stats/route.ts
 * 
 * Endpoint: POST /api/analysis/manufacturing-stats
 * 
 * This route connects to the Python analytics engine for:
 * - SPC (Statistical Process Control) analysis
 * - Process capability calculations
 * - Regression analysis for defect prediction
 * - Automated insights generation
 */

import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

interface AnalysisPayload {
    data: Record<string, any>[];
    spc_variable: string;
    regression_target?: string;
    regression_features?: string[];
    usl?: number;
    lsl?: number;
    num_samples?: number;
}

export async function POST(request: NextRequest) {
    try {
        const payload: AnalysisPayload = await request.json();

        // Validate required fields
        if (!payload.data || !Array.isArray(payload.data) || payload.data.length === 0) {
            return NextResponse.json(
                { error: 'Data array is required and must not be empty' },
                { status: 400 }
            );
        }

        if (!payload.spc_variable) {
            return NextResponse.json(
                { error: 'spc_variable is required' },
                { status: 400 }
            );
        }

        // Validate that spc_variable exists in data
        const firstRow = payload.data[0];
        if (!(payload.spc_variable in firstRow)) {
            return NextResponse.json(
                { error: `spc_variable "${payload.spc_variable}" not found in data` },
                { status: 400 }
            );
        }

        // Path to Python script - located in backend folder
        const scriptPath = path.join(process.cwd(), 'backend', 'manufacturing_stats_analytics.py');

        // Execute Python analysis
        const result = await runPythonAnalysis(scriptPath, payload);
        
        return NextResponse.json(result);

    } catch (error: any) {
        console.error('Manufacturing analysis error:', error);
        return NextResponse.json(
            { error: error.message || 'Analysis failed' },
            { status: 500 }
        );
    }
}

/**
 * Executes Python analytics script with the given payload
 */
function runPythonAnalysis(scriptPath: string, payload: AnalysisPayload): Promise<any> {
    return new Promise((resolve, reject) => {
        // Use venv Python - path relative to project root
        const venvPython = path.join(process.cwd(), 'backend', 'venv', 'bin', 'python');
        const python = spawn(venvPython, [scriptPath]);
        
        let stdout = '';
        let stderr = '';

        // Collect stdout data
        python.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        // Collect stderr data
        python.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        // Handle process completion
        python.on('close', (code) => {
            if (code !== 0) {
                // Try to parse error from stderr
                try {
                    const errorData = JSON.parse(stderr);
                    reject(new Error(errorData.error || 'Python script execution failed'));
                } catch {
                    reject(new Error(stderr || `Process exited with code ${code}`));
                }
                return;
            }

            // Parse successful result
            try {
                const result = JSON.parse(stdout);
                resolve(result);
            } catch (parseError) {
                reject(new Error('Failed to parse analysis results'));
            }
        });

        // Handle process errors
        python.on('error', (error) => {
            reject(new Error(`Failed to start Python process: ${error.message}`));
        });

        // Send payload to Python script via stdin
        python.stdin.write(JSON.stringify(payload));
        python.stdin.end();
    });
}

/**
 * GET endpoint for health check and API documentation
 */
export async function GET() {
    return NextResponse.json({
        status: 'healthy',
        service: 'manufacturing-analytics',
        version: '1.0.0',
        endpoint: '/api/analysis/manufacturing-stats',
        methods: ['POST', 'GET'],
        capabilities: [
            'spc_xbar_chart',
            'spc_r_chart',
            'process_capability_analysis',
            'regression_analysis',
            'violation_detection',
            'insights_generation'
        ],
        required_parameters: {
            data: 'Array of objects with numeric values',
            spc_variable: 'String - column name for SPC analysis'
        },
        optional_parameters: {
            regression_target: 'String - target variable for prediction',
            regression_features: 'Array of strings - predictor variables',
            usl: 'Number - Upper Specification Limit',
            lsl: 'Number - Lower Specification Limit',
            num_samples: 'Number - number of subgroups (default: 20)'
        },
        example_request: {
            data: [
                { production: 100, defect_rate: 0.02, temperature: 75 },
                { production: 102, defect_rate: 0.03, temperature: 78 }
            ],
            spc_variable: 'production',
            regression_target: 'defect_rate',
            regression_features: ['temperature'],
            usl: 110,
            lsl: 90
        }
    });
}