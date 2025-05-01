import { NextResponse } from 'next/server'
import { google } from 'googleapis'
import { GaxiosPromise } from 'googleapis-common'
import { gmail_v1 } from 'googleapis'

interface MessageHeader {
  name: string
  value: string
}

export async function POST(request: Request) {
  try {
    console.log('API: Received request')
    const { email } = await request.json()
    const authHeader = request.headers.get('Authorization')
    
    console.log('API: Email:', email)
    console.log('API: Auth header exists:', !!authHeader)
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('API: No valid auth header')
      return NextResponse.json(
        { error: 'No access token provided' },
        { status: 401 }
      )
    }

    const accessToken = authHeader.split(' ')[1]
    console.log('API: Got access token:', accessToken.substring(0, 10) + '...')

    // Create Gmail API client
    const oauth2Client = new google.auth.OAuth2()
    oauth2Client.setCredentials({ access_token: accessToken })
    
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

    // First get or create the Unsubscribed label
    let unsubscribedLabelId: string | null = null
    try {
      console.log('API: Checking for Unsubscribed label')
      const labels = await gmail.users.labels.list({ userId: 'me' })
      let label = labels.data.labels?.find(l => l.name === 'Unsubscribed')
      
      if (!label) {
        console.log('API: Creating Unsubscribed label')
        const created = await gmail.users.labels.create({
          userId: 'me',
          requestBody: {
            name: 'Unsubscribed',
            labelListVisibility: 'labelShow',
            messageListVisibility: 'show'
          }
        })
        label = created.data
      }
      unsubscribedLabelId = label.id || null
      console.log('API: Unsubscribed label ID:', unsubscribedLabelId)
    } catch (labelError) {
      console.error('API: Error managing labels:', labelError)
      // Continue without the label if there's an error
    }

    console.log('API: Searching for messages...')
    try {
      // Build the search query - exclude messages with Unsubscribed label
      let searchQuery = 'newer_than:30d'
      if (unsubscribedLabelId) {
        searchQuery += ` -label:Unsubscribed`
      }
      console.log('API: Search query:', searchQuery)

      // First, let's try to list any messages to verify API access
      const testResponse = await gmail.users.messages.list({
        userId: 'me',
        maxResults: 100,
        q: searchQuery
      })

      console.log('API: Test query response:', {
        messagesFound: testResponse.data.messages?.length || 0,
        resultSizeEstimate: testResponse.data.resultSizeEstimate,
        status: testResponse.status,
        query: searchQuery
      })

      if (!testResponse.data.messages?.length) {
        return NextResponse.json({ 
          error: 'No messages found in the last 30 days.',
          debug: {
            response: testResponse.data,
            status: testResponse.status,
            query: searchQuery
          }
        }, { status: 200 })
      }

      // If we get here, we can access the Gmail API
      const messages = testResponse.data.messages || []
      console.log('API: Found', messages.length, 'total messages')
      const subscriptions = new Map()
      let processedCount = 0
      let unsubscribeHeaderCount = 0

      // Fetch details for each message
      for (const message of messages) {
        processedCount++
        console.log(`API: Processing message ${processedCount}/${messages.length} (ID: ${message.id})`)
        try {
          const details = await gmail.users.messages.get({
            userId: 'me',
            id: message.id || '',
            format: 'metadata',
            metadataHeaders: ['From', 'Subject', 'List-Unsubscribe', 'Date']
          })

          const headers = details.data.payload?.headers as MessageHeader[] | undefined
          if (!headers) {
            console.log('API: No headers found for message:', message.id)
            continue
          }

          const from = headers.find(h => h.name === 'From')?.value || ''
          const listUnsubscribe = headers.find(h => h.name === 'List-Unsubscribe')?.value
          
          if (listUnsubscribe) {
            unsubscribeHeaderCount++
            console.log('API: Found List-Unsubscribe header:', listUnsubscribe)
            console.log('API: From:', from)
          }
          
          // Only include if it has an unsubscribe header
          if (listUnsubscribe) {
            const match = from.match(/<(.+?)>/) || from.match(/(.+)/)
            const emailAddress = match ? match[1].trim() : from.trim()
            
            // Parse the List-Unsubscribe header
            // It might be in the format: <mailto:...>, <http...> or just a single URL
            const unsubscribeUrls = listUnsubscribe.match(/<([^>]+)>/g) || [listUnsubscribe]
            // Clean the URLs and prefer HTTP links over mailto
            const cleanUrls = unsubscribeUrls.map((url: string) => url.replace(/[<>]/g, '').trim())
            const unsubscribeLink = cleanUrls.find(url => url.startsWith('http')) || cleanUrls[0]
            
            console.log('API: All unsubscribe links:', cleanUrls)
            console.log('API: Selected unsubscribe link:', unsubscribeLink)
            
            if (!subscriptions.has(emailAddress)) {
              console.log('API: Adding subscription for:', emailAddress)
              subscriptions.set(emailAddress, {
                name: from.replace(/<.*>/, '').trim() || emailAddress,
                email: emailAddress,
                lastReceived: new Date(headers.find(h => h.name === 'Date')?.value || '').toISOString().split('T')[0],
                unsubscribeLink,
                messageId: message.id
              })
            }
          }
        } catch (messageError) {
          console.error('API: Error fetching message details:', messageError)
          continue
        }
      }

      const result = Array.from(subscriptions.values())
      console.log('API: Summary:')
      console.log('- Total messages processed:', processedCount)
      console.log('- Messages with List-Unsubscribe header:', unsubscribeHeaderCount)
      console.log('- Unique subscriptions found:', result.length)
      return NextResponse.json({ 
        subscriptions: result,
        debug: {
          totalMessages: processedCount,
          messagesWithUnsubscribe: unsubscribeHeaderCount,
          uniqueSubscriptions: result.length
        }
      })
    } catch (gmailError) {
      console.error('API: Gmail API Error:', gmailError)
      return NextResponse.json({ 
        error: 'Failed to access Gmail API',
        debug: gmailError instanceof Error ? gmailError.message : String(gmailError)
      }, { status: 500 })
    }
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to check subscriptions' },
      { status: 500 }
    )
  }
} 