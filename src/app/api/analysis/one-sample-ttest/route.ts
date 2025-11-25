import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

/**
 * One-Sample T-Test API Endpoint
 * 
 * Tests if a sample mean differs from a hypothesized population mean.
 * 
 * Request body:
 * {
 *   data: Array<Record<string, any>>,  // Dataset
 *   params: {
 *     variable: string,                 // Numeric variable to test
 *     test_value: number,               // Hypothesized mean (μ₀)
 *     alternative?: 'two-sided' | 'greater' | 'less'  // Default: 'two-sided'
 *   }
 * }
 * 
 * Response:
 * {
 *   results: {
 *     test_type: 'one_sample',
 *     variable: string,
 *     test_value: number,
 *     n: number,
 *     sample_mean: number,
 *     se_diff: number,
 *     t_statistic: number,
 *     degrees_of_freedom: number,
 *     p_value: number,
 *     significant: boolean,
 *     cohens_d: number,
 *     confidence_interval: [number, number],
 *     interpretation: string,
 *     descriptives: {...},
 *     normality_test: {...},
 *     dropped_rows: number[],
 *     n_dropped: number
 *   },
 *   plot: string  // Base64 encoded PNG
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Validate required fields
    if (!body.data || !Array.isArray(body.data)) {
      return NextResponse.json(
        { error: 'Missing or invalid data array' }, 
        { status: 400 }
      );
    }
    
    if (!body.params?.variable) {
      return NextResponse.json(
        { error: 'Missing required parameter: variable' }, 
        { status: 400 }
      );
    }
    
    if (body.params?.test_value === undefined || body.params?.test_value === null) {
      return NextResponse.json(
        { error: 'Missing required parameter: test_value' }, 
        { status: 400 }
      );
    }

    const pythonExecutable = path.resolve(process.cwd(), 'backend', 'venv', 'bin', 'python');
    const scriptPath = path.resolve(process.cwd(), 'backend', 'one_sample_ttest.py');

    const pythonProcess = spawn(pythonExecutable, [scriptPath]);
    
    let result = '';
    let error = '';

    pythonProcess.stdout.on('data', (data) => {
      result += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      error += data.toString();
    });

    pythonProcess.stdin.write(JSON.stringify(body));
    pythonProcess.stdin.end();

    return new Promise<NextResponse>((resolve) => {
      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          console.error(`[one-sample-ttest] Script exited with code ${code}`);
          console.error(error);
          
          try {
            const errorJson = JSON.parse(error);
            resolve(NextResponse.json(
              { error: errorJson.error || 'Unknown error in Python script.' }, 
              { status: 500 }
            ));
          } catch {
            resolve(NextResponse.json(
              { error: `Script failed: ${error || 'Unknown error'}` }, 
              { status: 500 }
            ));
          }
        } else {
          try {
            const jsonResult = JSON.parse(result);
            
            if (jsonResult.error) {
              resolve(NextResponse.json(
                { error: jsonResult.error }, 
                { status: 400 }
              ));
            } else {
              resolve(NextResponse.json(jsonResult));
            }
          } catch (e) {
            console.error('[one-sample-ttest] Failed to parse Python output:', result);
            resolve(NextResponse.json(
              { error: 'Failed to parse analysis results' }, 
              { status: 500 }
            ));
          }
        }
      });

      pythonProcess.on('error', (err) => {
        console.error('[one-sample-ttest] Process error:', err);
        resolve(NextResponse.json(
          { error: `Failed to start analysis: ${err.message}` }, 
          { status: 500 }
        ));
      });
    });

  } catch (e: any) {
    console.error('[one-sample-ttest] Request error:', e);
    return NextResponse.json(
      { error: e.message || 'Internal server error' }, 
      { status: 500 }
    );
  }
}
