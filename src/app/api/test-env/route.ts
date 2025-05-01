import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    clientIdExists: !!process.env.GOOGLE_CLIENT_ID,
    clientIdLength: process.env.GOOGLE_CLIENT_ID?.length ?? 0,
    clientSecretExists: !!process.env.GOOGLE_CLIENT_SECRET,
    clientSecretLength: process.env.GOOGLE_CLIENT_SECRET?.length ?? 0,
    nextAuthUrl: process.env.NEXTAUTH_URL,
  }, { status: 200 })
} 