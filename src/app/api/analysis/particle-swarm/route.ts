import { NextRequest } from 'next/server';
import { proxyToPython } from '@/app/api/proxy';

export async function POST(request: NextRequest) {
    return proxyToPython(request, 'particle-swarm');
}
