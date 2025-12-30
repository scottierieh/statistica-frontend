import { NextRequest, NextResponse } from 'next/server';

const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://localhost:8000';

export async function proxyToPython(request: NextRequest, endpoint: string) {
    try {
        const body = await request.json();

        const response = await fetch(`${PYTHON_API_URL}/api/finance/${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorText = await response.text();
            return NextResponse.json({ error: errorText }, { status: response.status });
        }

        return NextResponse.json(await response.json());
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
