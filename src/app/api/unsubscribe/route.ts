import { NextResponse } from 'next/server'
import { google } from 'googleapis'

export async function POST(request: Request) {
  try {
    const { unsubscribeLink, email } = await request.json()
    const authHeader = request.headers.get('Authorization')
    
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'No access token provided' },
        { status: 401 }
      )
    }

    const accessToken = authHeader.split(' ')[1]

    // Handle mailto: links
    if (unsubscribeLink.startsWith('mailto:')) {
      const oauth2Client = new google.auth.OAuth2()
      oauth2Client.setCredentials({ access_token: accessToken })
      const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

      // Parse mailto link
      const mailtoUrl = new URL(unsubscribeLink)
      const to = mailtoUrl.pathname
      const subject = mailtoUrl.searchParams.get('subject') || 'Unsubscribe'
      const body = mailtoUrl.searchParams.get('body') || 'Please unsubscribe me'

      // Create the email message
      const message = [
        'From: me',
        `To: ${to}`,
        `Subject: ${subject}`,
        '',
        body
      ].join('\n')

      // Convert the message to base64url format
      const encodedMessage = Buffer.from(message).toString('base64url')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '')

      // Send the email
      await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedMessage
        }
      })

      return NextResponse.json({ 
        success: true, 
        message: 'Unsubscribe email sent successfully' 
      })
    } 
    // Handle HTTP/HTTPS links
    else if (unsubscribeLink.startsWith('http')) {
      // For HTTP links, we'll return the URL for the frontend to open in a new tab
      return NextResponse.json({ 
        success: true,
        type: 'url',
        url: unsubscribeLink
      })
    } 
    else {
      return NextResponse.json(
        { error: 'Unsupported unsubscribe link format' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Unsubscribe Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process unsubscribe request' },
      { status: 500 }
    )
  }
} 