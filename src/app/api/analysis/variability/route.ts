
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // The Python backend is running as a separate FastAPI server
    const response = await fetch('http://127.0.0.1:8000/api/variability', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `FastAPI server error: ${response.statusText}`);
    }

    const result = await response.json();
    return NextResponse.json(result);

  } catch (e: any) {
    console.error('Variability API route error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
