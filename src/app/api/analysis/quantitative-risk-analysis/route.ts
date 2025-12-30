import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Validate required fields
    if (!body.data || !body.date_col || !body.asset_col) {
      return NextResponse.json(
        { error: 'Missing required fields: data, date_col, asset_col' },
        { status: 400 }
      );
    }

    const pythonExecutable = path.resolve(process.cwd(), 'backend', 'venv', 'bin', 'python');
    const scriptPath = path.resolve(process.cwd(), 'backend', 'quantitative_risk_analysis.py');

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
          console.error(`Quantitative Risk Analysis script exited with code ${code}`);
          console.error('stderr:', error);
          try {
            const errorJson = JSON.parse(error);
            resolve(NextResponse.json({ error: errorJson.error || 'Unknown error in Python script.' }, { status: 500 }));
          } catch {
            resolve(NextResponse.json({ error: `Script failed: ${error || 'Unknown error'}` }, { status: 500 }));
          }
        } else {
          try {
            const jsonResult = JSON.parse(result);
            if (jsonResult.error) {
              resolve(NextResponse.json({ error: jsonResult.error }, { status: 400 }));
            } else {
              resolve(NextResponse.json(jsonResult));
            }
          } catch (e) {
            console.error('Failed to parse script output:', result);
            resolve(NextResponse.json({ error: `Failed to parse script output: ${result.substring(0, 200)}` }, { status: 500 }));
          }
        }
      });

      pythonProcess.on('error', (err) => {
        console.error('Failed to start Python process:', err);
        resolve(NextResponse.json({ error: `Failed to start analysis: ${err.message}` }, { status: 500 }));
      });
    });

  } catch (e: any) {
    console.error('API route error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

