import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

/**
 * Independent Samples T-Test API Endpoint
 * 
 * Compares means between two independent groups.
 * 
 * Request body:
 * {
 *   data: Array<Record<string, any>>,  // Dataset
 *   params: {
 *     variable: string,                 // Numeric dependent variable
 *     group_variable: string,           // Categorical grouping variable (must have exactly 2 groups)
 *     alternative?: 'two-sided' | 'greater' | 'less'  // Default: 'two-sided'
 *   }
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
    
    if (!body.params?.group_variable) {
      return NextResponse.json(
        { error: 'Missing required parameter: group_variable' }, 
        { status: 400 }
      );
    }

    const pythonExecutable = path.resolve(process.cwd(), 'backend', 'venv', 'bin', 'python');
    const scriptPath = path.resolve(process.cwd(), 'backend', 'independent_samples_ttest.py');

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
          console.error(`[independent-samples-ttest] Script exited with code ${code}`);
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
            console.error('[independent-samples-ttest] Failed to parse Python output:', result);
            resolve(NextResponse.json(
              { error: 'Failed to parse analysis results' }, 
              { status: 500 }
            ));
          }
        }
      });

      pythonProcess.on('error', (err) => {
        console.error('[independent-samples-ttest] Process error:', err);
        resolve(NextResponse.json(
          { error: `Failed to start analysis: ${err.message}` }, 
          { status: 500 }
        ));
      });
    });

  } catch (e: any) {
    console.error('[independent-samples-ttest] Request error:', e);
    return NextResponse.json(
      { error: e.message || 'Internal server error' }, 
      { status: 500 }
    );
  }
}


