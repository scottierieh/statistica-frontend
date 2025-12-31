
import { NextRequest } from 'next/server';
import { proxyToPython } from '../../../proxy';

const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://127.0.0.1:8000';

export async function POST(request: NextRequest) {
    // This now proxies to the FastAPI backend
    return proxyToPython(request, 'effectiveness', PYTHON_API_URL);
}
