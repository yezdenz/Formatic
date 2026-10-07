import { NextRequest, NextResponse } from 'next/server';

export function isAllowedExtensionOrigin(origin: string | null, configuredIds = process.env.EXTENSION_ID): boolean {
  if (!origin || !configuredIds) return false;
  return configuredIds.split(',').some(value => {
    const id = value.trim();
    return /^[a-p]{32}$/.test(id) && origin === `chrome-extension://${id}`;
  });
}

export function corsHeaders(request: NextRequest): HeadersInit {
  const origin = request.headers.get('origin');
  if (!origin || !isAllowedExtensionOrigin(origin)) return {};
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
  return (!origin || origin === request.nextUrl.origin || origin === configuredOrigin || isAllowedExtensionOrigin(origin)) &&
    request.headers.get('content-type')?.startsWith('application/json') === true;
}
