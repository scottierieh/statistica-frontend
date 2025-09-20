
import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const dataToEncode = searchParams.get('data');

    if (!dataToEncode) {
      return NextResponse.json({ error: 'Data to encode is required' }, { status: 400 });
    }

    const pythonExecutable = path.resolve(process.cwd(), 'backend', 'venv', 'bin', 'python');
    const scriptPath = path.resolve(process.cwd(), 'backend', 'qr_code_generator.py');

    const pythonProcess = spawn(pythonExecutable, [scriptPath, dataToEncode]);
    
    let result = '';
    let error = '';

    pythonProcess.stdout.on('data', (data) => {
      result += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      error += data.toString();
    });

    return new Promise<NextResponse>((resolve) => {
      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          console.error(`QR Code Script exited with code ${code}`);
          console.error(error);
          try {
            const errorJson = JSON.parse(error);
            resolve(NextResponse.json({ error: errorJson.error || 'Unknown error occurred in Python script.' }, { status: 500 }));
          } catch {
             resolve(NextResponse.json({ error: `Script failed with non-JSON error: ${error}` }, { status: 500 }));
          }
        } else {
          try {
            const jsonResult = JSON.parse(result);
            resolve(NextResponse.json(jsonResult));
          } catch(e) {
            console.error('Failed to parse python script output for QR code');
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
