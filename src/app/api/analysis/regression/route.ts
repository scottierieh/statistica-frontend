import { NextRequest } from 'next/server';
import { proxyToPython } from '../../proxy';

export async function POST(request: NextRequest) {
    return proxyToPython(request, 'regression');
}
