import { NextRequest, NextResponse } from 'next/server';
import { API_BASE } from '@/services/apiBase';

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.toString();
  const authorization = request.headers.get('authorization');

  try {
    const response = await fetch(`${API_BASE}/api/manager/salary?${query}`, {
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        ...(authorization ? { Authorization: authorization } : {}),
      },
    });

    if (!response.ok) {
      return NextResponse.json([]);
    }

    const text = await response.text();
    return new NextResponse(text || '[]', {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch {
    return NextResponse.json([]);
  }
}
