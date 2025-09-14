import {NextRequest, NextResponse} from 'next/server';
import { reliability } from '@/backend/main';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const result = await reliability(body);
        return NextResponse.json(result);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
