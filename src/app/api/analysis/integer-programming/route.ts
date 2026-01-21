
import { NextRequest } from 'next/server';
import { proxyToPython } from '@/app/api/proxy';

export async function POST(request: NextRequest) {
    // This endpoint will use the linear-programming solver in the backend
    // as it's designed to handle MILP problems as well.
    return proxyToPython(request, 'linear-programming');
}
