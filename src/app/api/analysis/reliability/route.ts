import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { data, items, reverseCodeItems } = body;

    if (!data || !items) {
      return NextResponse.json({ error: 'Missing required fields: data and items' }, { status: 400 });
    }
    
    const scriptPath = path.resolve(process.cwd(), 'backend/reliability_analysis.py');
    const pythonProcess = spawn('python3', [scriptPath]);

    let result = '';
    let error = '';

    pythonProcess.stdin.write(JSON.stringify(body));
    pythonProcess.stdin.end();

    pythonProcess.stdout.on('data', (data) => {
      result += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      error += data.toString();
    });

    return new Promise((resolve) => {
      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          console.error(`Python script exited with code ${code}`);
          console.error('Python script error:', error);
          resolve(NextResponse.json({ error: `Script failed: ${error}` }, { status: 500 }));
        } else {
           try {
            const jsonResult = JSON.parse(result);
            resolve(NextResponse.json(jsonResult));
          } catch(e) {
            console.error('Failed to parse python script output:', e);
            resolve(NextResponse.json({ error: 'Failed to parse script output.', scriptOutput: result }, { status: 500 }));
          }
        }
      });
    });

  } catch (e: any) {
    console.error('Error processing request:', e);
    return NextResponse.json({ error: e.message || 'An unexpected error occurred.' }, { status: 500 });
  }
}
