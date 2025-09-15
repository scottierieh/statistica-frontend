import { NextRequest, NextResponse } from 'next/server';
import { spawn, spawnSync } from 'child_process';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const pythonExecutable = path.resolve(process.cwd(), 'backend', 'venv', 'bin', 'python');
    const pipExecutable = path.resolve(process.cwd(), 'backend', 'venv', 'bin', 'pip');
    const requirementsPath = path.resolve(process.cwd(), 'backend', 'requirements.txt');
    const scriptPath = path.resolve(process.cwd(), 'backend', 'anova_analysis.py');

    // Ensure dependencies are installed
    spawnSync(pipExecutable, ['install', '-r', requirementsPath], { stdio: 'pipe' });

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
          console.error(`Script exited with code ${code}`);
          console.error(error);
          resolve(NextResponse.json({ error: `Script failed: ${error}` }, { status: 500 }));
        } else {
          try {
            const jsonResult = JSON.parse(result);
            resolve(NextResponse.json(jsonResult));
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
