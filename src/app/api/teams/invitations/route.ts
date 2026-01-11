import { NextRequest, NextResponse } from 'next/server';

const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://127.0.0.1:8000';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Directly proxy to the FastAPI backend
        const response = await fetch(`${PYTHON_API_URL}/api/teams/invitations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorText = await response.text();
            let errorJson = { error: errorText };
            try {
                errorJson = JSON.parse(errorText);
            } catch(e) {
                // Not a JSON error, use the raw text
            }
            console.error(`Error from FastAPI backend for invitations:`, errorJson);
            return NextResponse.json(errorJson, { status: response.status });
        }

        const data = await response.json();
        return NextResponse.json(data);

    } catch (error: any) {
        console.error(`Error proxying to invitations endpoint:`, error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
