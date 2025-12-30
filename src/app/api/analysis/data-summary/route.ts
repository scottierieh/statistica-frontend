
import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import { recommendAnalysis, type RecommendAnalysisInput } from '@/ai/flows/recommend_analysis';

async function runPythonScript(body: any): Promise<any> {
    return new Promise((resolve, reject) => {
        const pythonExecutable = path.resolve(process.cwd(), 'backend', 'venv', 'bin', 'python');
        const scriptPath = path.resolve(process.cwd(), 'backend', 'data_summary.py');

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

        pythonProcess.on('close', (code) => {
            if (code !== 0) {
                console.error(`Script exited with code ${code}`);
                console.error('Python Error:', error);
                try {
                    const errorJson = JSON.parse(error);
                    reject(new Error(errorJson.error || 'Unknown error in Python script.'));
                } catch {
                    reject(new Error(`Script failed: ${error}`));
                }
            } else {
                try {
                    const jsonResult = JSON.parse(result);
                    if (jsonResult.error) {
                        reject(new Error(jsonResult.error));
                    } else {
                        resolve(jsonResult);
                    }
                } catch(e) {
                    console.error('Failed to parse script output:', result);
                    reject(new Error(`Failed to parse script output.`));
                }
            }
        });
    });
}


export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { dataDescription, ...pythonBody } = body;
    
    // 1. Get data summary from Python
    const summaryResult = await runPythonScript(pythonBody);
    
    // 2. Pass summary and user description to AI for recommendations
    const aiInput: RecommendAnalysisInput = {
        dataSummary: JSON.stringify(summaryResult.summary, null, 2),
        dataDescription: dataDescription || "No description provided."
    };

    const recommendations = await recommendAnalysis(aiInput);

    // 3. Combine results
    const finalResult = {
        summary: summaryResult.summary,
        recommendations: recommendations.recommendations
    };
    
    return NextResponse.json(finalResult);

  } catch (e: any) {
    console.error("Analysis Recommendation Error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

