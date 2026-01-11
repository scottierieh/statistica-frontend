'use server';
import { NextRequest, NextResponse } from 'next/server';

const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://127.0.0.1:8000';

async function proxyRequest(request: NextRequest, path: string = '') {
    try {
        const url = `${PYTHON_API_URL}/api/teams/invitations${path}`;
        
        let response: Response;

        if (request.method === 'GET' || request.method === 'DELETE') {
            response = await fetch(url, {
                method: request.method,
                headers: { 'Content-Type': 'application/json' },
            });
        } else {
             const body = await request.json();
             response = await fetch(url, {
                method: request.method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
        }

        if (!response.ok) {
            const errorText = await response.text();
            let errorJson = { error: errorText };
            try {
                errorJson = JSON.parse(errorText);
            } catch(e) {
                // Not a JSON error
            }
            console.error(`Error from FastAPI backend:`, errorJson);
            return NextResponse.json(errorJson, { status: response.status });
        }

        const data = await response.json();
        return NextResponse.json(data);

    } catch (error: any) {
        console.error(`Error proxying to invitations endpoint:`, error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
    const id = params.id;
    return proxyRequest(request, `/${id}`);
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
    const id = params.id;
    return proxyRequest(request, `/${id}`);
}
