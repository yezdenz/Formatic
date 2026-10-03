import { NextRequest, NextResponse } from 'next/server';

export function corsHeaders(request: NextRequest): HeadersInit {
  const origin = request.headers.get('origin');
  const extensionId = process.env.EXTENSION_ID;
  if (!origin || !extensionId || origin !== `chrome-extension://${extensionId}`) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET,OPTIONS,PATCH,DELETE,POST,PUT',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin'
  };
}

export function apiJson(request: NextRequest, data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: corsHeaders(request) });
}

export function preflight(request: NextRequest) {
  const origin = request.headers.get('origin');
  if (origin && !Object.keys(corsHeaders(request)).length) return new Response(null, { status: 403 });
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}

export function acceptsMutation(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL ? new URL(process.env.NEXT_PUBLIC_APP_URL).origin : null;
  const extensionOrigin = process.env.EXTENSION_ID ? `chrome-extension://${process.env.EXTENSION_ID}` : null;
  return (!origin || origin === request.nextUrl.origin || origin === configuredOrigin || origin === extensionOrigin) &&
    request.headers.get('content-type')?.startsWith('application/json') === true;
}
