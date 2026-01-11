'use server';
import { NextRequest, NextResponse } from 'next/server';

const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://127.0.0.1:8000';

async function proxyRequest(request: NextRequest) {
    try {
        const url = `${PYTHON_API_URL}/api/teams/invitations`;
        
        let response: Response;

        if (request.method === 'GET') {
            response = await fetch(url, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            });
        } else if (request.method === 'POST') {
             const body = await request.json();
             response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
        } else if (request.method === 'DELETE') {
            const id = request.nextUrl.searchParams.get('id');
            if (!id) {
                return NextResponse.json({ error: 'Invitation ID is required' }, { status: 400 });
            }
            response = await fetch(`${url}?id=${id}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
            });
        } else {
            return NextResponse.json({ error: `Method ${request.method} Not Allowed`}, { status: 405 });
        }

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

export async function POST(request: NextRequest) {
    return proxyRequest(request);
}

export async function GET(request: NextRequest) {
    return proxyRequest(request);
}

export async function DELETE(request: NextRequest) {
    return proxyRequest(request);
}
