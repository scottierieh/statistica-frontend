
import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const pythonExecutable = path.resolve(process.cwd(), 'backend', 'venv', 'bin', 'python');
    const scriptPath = path.resolve(process.cwd(), 'backend', 'repeated_measures_anova_analysis.py');

    const pythonProcess = spawn(pythonExecutable, [scriptPath]);
    
    let result = '';
    let error = '';

    pythonProcess.stdout.on('data', (data) => {
      result += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      error += data.toString();
    });

    // Pass the correct parameter names to the python script
    const scriptPayload = {
      data: body.data,
      subject_col: body.subjectCol,
      within_cols: body.withinCols,
      dependent_var_template: body.dependentVar,
      between_col: body.betweenCol,
    };

    pythonProcess.stdin.write(JSON.stringify(scriptPayload));
    pythonProcess.stdin.end();

    return new Promise<NextResponse>((resolve) => {
      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          console.error(`Script exited with code ${code}`);
          console.error(error);
          try {
            const errorJson = JSON.parse(error);
             resolve(NextResponse.json({ error: errorJson.error || 'Unknown error occurred in Python script.' }, { status: 500 }));
          } catch(e) {
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
            console.error('Failed to parse python script output');
            console.error(result);
            resolve(NextResponse.json({ error: `Failed to parse script output: ${result}` }, { status: 500 }));
          }
        }
      });
    });

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
