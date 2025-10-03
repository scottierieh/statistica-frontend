import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { data, variable, test_mean } = body;

    if (!data || !variable || test_mean === undefined) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const pythonProcess = spawn('python3', [
        path.resolve(process.cwd(), 'src/backend/one_sample_ttest_analysis.py'),
    ]);

    let pythonOutput = '';
    let pythonError = '';

    pythonProcess.stdin.write(JSON.stringify(body));
    pythonProcess.stdin.end();

    for await (const chunk of pythonProcess.stdout) {
        pythonOutput += chunk;
    }

    for await (const chunk of pythonProcess.stderr) {
        pythonError += chunk;
    }

    if (pythonError) {
      console.error('Python script error:', pythonError);
      return NextResponse.json({ error: 'Error executing Python script', details: pythonError }, { status: 500 });
    }

    try {
      const result = JSON.parse(pythonOutput);
      if(result.error) throw new Error(result.error);
      return NextResponse.json(result, { status: 200 });
    } catch (e: any) {
      console.error('Error parsing Python output:', pythonOutput);
      return NextResponse.json({ error: 'Failed to parse analysis results', details: pythonOutput }, { status: 500 });
    }

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
