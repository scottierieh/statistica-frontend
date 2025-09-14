import {NextRequest, NextResponse} from 'next/server';
import { anova } from '@/backend/main';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const result = await anova(body);
        return NextResponse.json(result);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
