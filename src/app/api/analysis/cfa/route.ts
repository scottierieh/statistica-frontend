
import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

// CFA is a specific type of SEM, so we can use the SEM script.
// The key difference is that the structural model is empty for a pure CFA.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const pythonExecutable = path.resolve(process.cwd(), 'backend', 'venv', 'bin', 'python');
    const scriptPath = path.resolve(process.cwd(), 'backend', 'sem_analysis.py');

    const pythonProcess = spawn(pythonExecutable, [scriptPath]);
    
    let result = '';
    let error = '';

    pythonProcess.stdout.on('data', (data) => {
      result += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      error += data.toString();
    });

    // For CFA, the structural model is empty.
    const semBody = {
      data: body.data,
      modelSpec: {
        measurement_model: body.modelSpec,
        structural_model: []
      }
    };

    pythonProcess.stdin.write(JSON.stringify(semBody));
    pythonProcess.stdin.end();

    return new Promise<NextResponse>((resolve) => {
      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          console.error(`CFA/SEM Script exited with code ${code}`);
          console.error(error);
          try {
            const errorJson = JSON.parse(error);
            resolve(NextResponse.json({ error: errorJson.error || 'Unknown error in Python script.' }, { status: 500 }));
          } catch {
             resolve(NextResponse.json({ error: `Script failed: ${error}` }, { status: 500 }));
          }
        } else {
          try {
            const jsonResult = JSON.parse(result);
            if (jsonResult.error) {
              resolve(NextResponse.json({ error: jsonResult.error }, { status: 400 }));
            } else {
              resolve(NextResponse.json(jsonResult));
            }
          } catch(e) {
            console.error('Failed to parse script output:', result);
            resolve(NextResponse.json({ error: `Failed to parse script output: ${result}` }, { status: 500 }));
          }
        }
      });
    });

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

    