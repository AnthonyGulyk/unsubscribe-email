import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    // TODO: We'll need email password or OAuth2 for actual implementation
    // For now, return mock data
    const mockSubscriptions = [
      {
        name: 'Medium Daily Digest',
        email: 'noreply@medium.com',
        lastReceived: '2024-02-15'
      },
      {
        name: 'GitHub Notifications',
        email: 'notifications@github.com',
        lastReceived: '2024-02-14'
      },
      {
        name: 'LinkedIn Newsletter',
        email: 'newsletters@linkedin.com',
        lastReceived: '2024-02-13'
      },
      {
        name: 'Product Hunt Daily',
        email: 'hello@producthunt.com',
        lastReceived: '2024-02-12'
      }
    ]

    return NextResponse.json({ subscriptions: mockSubscriptions })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'Failed to check subscriptions' },
      { status: 500 }
    )
  }
} 