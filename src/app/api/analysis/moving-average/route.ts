
import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

// This API route is deprecated and its functionality is moved to exponential-smoothing
export async function POST(req: NextRequest) {
    return NextResponse.json({ error: "This endpoint is deprecated. Please use /api/analysis/exponential-smoothing." }, { status: 410 });
}
