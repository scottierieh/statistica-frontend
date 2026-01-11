'use server';
import { NextRequest, NextResponse } from 'next/server';

const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://127.0.0.1:8000';

async function proxyRequest(request: NextRequest, path: string) {
    try {
        const url = `${PYTHON_API_URL}/api/teams/invitations${path}`;
        
        const body = await request.json();
        const response = await fetch(url, {
            method: request.method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        const responseData = await response.json();

        if (!response.ok) {
            console.error(`Error from FastAPI backend:`, responseData);
            return NextResponse.json(responseData, { status: response.status });
        }

        return NextResponse.json(responseData);

    } catch (error: any) {
        console.error(`Error proxying to invitations endpoint:`, error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}


export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
    const id = params.id;
    return proxyRequest(request, `/${id}`);
}
