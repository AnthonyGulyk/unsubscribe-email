import { NextResponse } from 'next/server'
import { google } from 'googleapis'

export async function POST(request: Request) {
  try {
    const { unsubscribeLink, email, messageId } = await request.json()
    const authHeader = request.headers.get('Authorization')
    
    console.log('Unsubscribe API: Starting unsubscribe process')
    console.log('Unsubscribe API: Message ID:', messageId)
    console.log('Unsubscribe API: Email:', email)
    console.log('Unsubscribe API: Link:', unsubscribeLink)
    
    if (!authHeader?.startsWith('Bearer ')) {
      console.log('Unsubscribe API: No valid auth header')
      return NextResponse.json(
        { error: 'No access token provided' },
        { status: 401 }
      )
    }

    if (!messageId) {
      console.log('Unsubscribe API: No message ID provided')
      return NextResponse.json(
        { error: 'No message ID provided' },
        { status: 400 }
      )
    }

    const accessToken = authHeader.split(' ')[1]
    const oauth2Client = new google.auth.OAuth2()
    oauth2Client.setCredentials({ access_token: accessToken })
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

    // Create "Unsubscribed" label if it doesn't exist
    let labelId: string | null = null
    try {
      console.log('Unsubscribe API: Checking for Unsubscribed label')
      const labels = await gmail.users.labels.list({ userId: 'me' })
      let label = labels.data.labels?.find(l => l.name === 'Unsubscribed')
      
      if (!label) {
        console.log('Unsubscribe API: Creating Unsubscribed label')
        const created = await gmail.users.labels.create({
          userId: 'me',
          requestBody: {
            name: 'Unsubscribed',
            labelListVisibility: 'labelShow',
            messageListVisibility: 'show'
          }
        })
        label = created.data
        console.log('Unsubscribe API: Created label with ID:', label.id)
      } else {
        console.log('Unsubscribe API: Found existing label with ID:', label.id)
      }
      labelId = label.id || null
    } catch (error) {
      console.error('Unsubscribe API: Error managing labels:', error)
    }

    // Clean the unsubscribe link - remove any angle brackets and whitespace
    const cleanLink = unsubscribeLink.replace(/[<>]/g, '').trim()
    console.log('Unsubscribe API: Cleaned link:', cleanLink)

    let unsubscribeSuccess = false

    // Handle mailto: links
    if (cleanLink.startsWith('mailto:')) {
      console.log('Unsubscribe API: Processing mailto link')
      try {
        // Parse mailto link
        const mailtoUrl = new URL(cleanLink)
        const to = mailtoUrl.pathname
        const subject = mailtoUrl.searchParams.get('subject') || 'Unsubscribe'
        const body = mailtoUrl.searchParams.get('body') || 'Please unsubscribe me'

        console.log('Unsubscribe API: Sending email to:', to)
        console.log('Unsubscribe API: Subject:', subject)

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
        const result = await gmail.users.messages.send({
          userId: 'me',
          requestBody: {
            raw: encodedMessage
          }
        })
        console.log('Unsubscribe API: Email sent successfully, ID:', result.data.id)
        unsubscribeSuccess = true
      } catch (emailError) {
        console.error('Unsubscribe API: Error sending unsubscribe email:', emailError)
        throw emailError
      }
    } 
    // Handle HTTP/HTTPS links
    else if (cleanLink.startsWith('http')) {
      console.log('Unsubscribe API: Processing HTTP link')
      unsubscribeSuccess = true
      return NextResponse.json({ 
        success: true,
        type: 'url',
        url: cleanLink
      })
    } 
    else {
      console.log('Unsubscribe API: Unsupported link format')
      return NextResponse.json(
        { error: `Unsupported unsubscribe link format: ${cleanLink}` },
        { status: 400 }
      )
    }

    // Add the "Unsubscribed" label to the message
    if (unsubscribeSuccess && labelId) {
      try {
        console.log('Unsubscribe API: Adding label to message:', messageId)
        await gmail.users.messages.modify({
          userId: 'me',
          id: messageId,
          requestBody: {
            addLabelIds: [labelId]
          }
        })
        console.log('Unsubscribe API: Label added successfully')
      } catch (labelError) {
        console.error('Unsubscribe API: Error adding label:', labelError)
        // Don't throw here, as the unsubscribe itself was successful
      }
    } else if (unsubscribeSuccess) {
      console.log('Unsubscribe API: No label ID available, skipping label application')
    }

    console.log('Unsubscribe API: Process completed successfully')
    return NextResponse.json({ 
      success: true, 
      message: 'Unsubscribe processed successfully',
      labelApplied: unsubscribeSuccess && !!labelId
    })
  } catch (error) {
    console.error('Unsubscribe API: Fatal error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process unsubscribe request' },
      { status: 500 }
    )
  }
} 