import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const dataToEncode = searchParams.get('data');

    if (!dataToEncode) {
      return NextResponse.json({ error: 'Data to encode is required' }, { status: 400 });
    }

    const image = await QRCode.toDataURL(dataToEncode, {
      width: 400,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });

    return NextResponse.json({ image });
  } catch (e: any) {
    console.error('QR Code generation error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
