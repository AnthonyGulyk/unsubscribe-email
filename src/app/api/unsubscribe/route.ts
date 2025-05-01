import { NextResponse } from 'next/server'
import { google } from 'googleapis'

async function tryUnsubscribeRequest(url: string, method: 'GET' | 'POST', email?: string) {
  console.log(`Unsubscribe API: Attempting ${method} request to ${url}`)
  
  const retryCount = 3
  for (let attempt = 1; attempt <= retryCount; attempt++) {
    try {
      console.log(`Unsubscribe API: Attempt ${attempt}/${retryCount}`)
      
      // First make a GET request to check for forms
      if (method === 'POST') {
        console.log('Unsubscribe API: Making initial GET request to check for forms')
        const getResponse = await fetch(url, {
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          },
          redirect: 'follow',
          signal: AbortSignal.timeout(30000)
        })

        let formData = new URLSearchParams()
        let formAction = url

        try {
          const html = await getResponse.text()
          console.log('Unsubscribe API: Checking HTML for forms and inputs')
          
          // Look for form action URL
          const formActionMatch = html.match(/<form[^>]+action=["']([^"']+)["']/)
          if (formActionMatch) {
            formAction = new URL(formActionMatch[1], url).toString()
            console.log('Unsubscribe API: Found form action URL:', formAction)
          }

          // Extract hidden inputs
          const hiddenInputs = html.match(/<input[^>]+type=["']hidden["'][^>]+>/g)
          if (hiddenInputs) {
            console.log('Unsubscribe API: Found hidden inputs:', hiddenInputs.length)
            hiddenInputs.forEach(input => {
              const nameMatch = input.match(/name=["']([^"']+)["']/)
              const valueMatch = input.match(/value=["']([^"']+)["']/)
              if (nameMatch && valueMatch) {
                formData.append(nameMatch[1], valueMatch[1])
                console.log(`Unsubscribe API: Added hidden input ${nameMatch[1]}=${valueMatch[1]}`)
              }
            })
          }

          // Look for form fields in the HTML
          const formFields = html.match(/<input[^>]+>|<select[^>]+>|<textarea[^>]+>/g) || []
          const foundFields = new Set()
          
          formFields.forEach(field => {
            const nameMatch = field.match(/name=["']([^"']+)["']/)
            if (nameMatch) {
              foundFields.add(nameMatch[1].toLowerCase())
            }
          })

          // Add email if there's an email field
          if (email) {
            const emailFieldNames = ['email', 'address', 'subscriber_email', 'user_email', 'contact']
            const foundEmailField = emailFieldNames.find(name => foundFields.has(name.toLowerCase()))
            if (foundEmailField) {
              formData.append(foundEmailField, email)
              console.log(`Unsubscribe API: Added email to field ${foundEmailField}:`, email)
            }
          }

          // Only add necessary action fields that exist in the form
          const actionFields = ['unsubscribe', 'confirm', 'submit', 'op', 'action', 'unsub', 'remove']
          actionFields.forEach(field => {
            if (foundFields.has(field.toLowerCase())) {
              // Look for a submit button with this name to get its value
              const buttonMatch = html.match(new RegExp(`<input[^>]+name=["']${field}["'][^>]+value=["']([^"']+)["']`))
              if (buttonMatch) {
                formData.append(field, buttonMatch[1])
                console.log(`Unsubscribe API: Added form field ${field}=${buttonMatch[1]}`)
              } else {
                // Use common values
                const commonValues = {
                  unsubscribe: 'unsubscribe',
                  confirm: 'true',
                  submit: 'Submit',
                  op: 'unsubscribe',
                  action: 'unsubscribe',
                  unsub: 'true',
                  remove: 'true'
                }
                formData.append(field, commonValues[field])
                console.log(`Unsubscribe API: Added default value for ${field}:`, commonValues[field])
              }
            }
          })

          // Look for submit button value if no action fields were found
          if (!actionFields.some(field => foundFields.has(field.toLowerCase()))) {
            const submitButton = html.match(/<input[^>]+type=["']submit["'][^>]+value=["']([^"']+)["']/)
            if (submitButton) {
              formData.append('submit', submitButton[1])
              console.log('Unsubscribe API: Added submit button value:', submitButton[1])
            }
          }

        } catch (parseError) {
          console.log('Unsubscribe API: Error parsing HTML:', parseError)
        }

        // If no fields were found, try a simple POST with minimal data
        if (formData.toString().length === 0) {
          console.log('Unsubscribe API: No form fields found, using minimal data')
          if (email) {
            formData.append('email', email)
          }
          formData.append('unsubscribe', 'true')
        }

        // Make the actual POST request
        console.log(`Unsubscribe API: Making POST request to ${formAction} with data:`, Object.fromEntries(formData))
        const response = await fetch(formAction, {
          method: 'POST',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Content-Type': 'application/x-www-form-urlencoded',
            'Origin': new URL(url).origin,
            'Referer': url,
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          },
          body: formData.toString(),
          redirect: 'follow',
          signal: AbortSignal.timeout(30000)
        })

        // Try to get response body for debugging
        let responseBody = ''
        try {
          const contentType = response.headers.get('content-type')
          if (contentType && (contentType.includes('text') || contentType.includes('json'))) {
            responseBody = await response.text()
          }
        } catch (bodyError) {
          console.log('Unsubscribe API: Could not read response body:', bodyError)
        }

        console.log('Unsubscribe API: Response status:', response.status)
        console.log('Unsubscribe API: Response headers:', Object.fromEntries(response.headers))
        if (responseBody) {
          console.log('Unsubscribe API: Response body preview:', responseBody.slice(0, 500))
        }

        // Check for success indicators in the response
        const successIndicators = [
          'success',
          'unsubscribed',
          'removed',
          'opted out',
          'preferences updated',
          'subscription updated',
          'thank you',
          'confirmed'
        ]
        
        const isSuccess = response.ok || 
                         response.status === 302 || 
                         response.status === 301 || 
                         successIndicators.some(indicator => 
                           responseBody.toLowerCase().includes(indicator)
                         )

        return {
          success: isSuccess,
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers),
          body: responseBody || undefined,
          finalUrl: response.url,
          formData: Object.fromEntries(formData)
        }
      } else {
        // Simple GET request
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Referer': new URL(url).origin,
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          },
          redirect: 'follow',
          signal: AbortSignal.timeout(30000)
        })

        let responseBody = ''
        try {
          const contentType = response.headers.get('content-type')
          if (contentType && (contentType.includes('text') || contentType.includes('json'))) {
            responseBody = await response.text()
          }
        } catch (bodyError) {
          console.log('Unsubscribe API: Could not read response body:', bodyError)
        }

        console.log('Unsubscribe API: Response status:', response.status)
        console.log('Unsubscribe API: Response headers:', Object.fromEntries(response.headers))
        if (responseBody) {
          console.log('Unsubscribe API: Response body preview:', responseBody.slice(0, 500))
        }

        // Check for success indicators in the response
        const successIndicators = [
          'success',
          'unsubscribed',
          'removed',
          'opted out',
          'preferences updated',
          'subscription updated',
          'thank you',
          'confirmed'
        ]
        
        const isSuccess = response.ok || 
                         response.status === 302 || 
                         response.status === 301 || 
                         successIndicators.some(indicator => 
                           responseBody.toLowerCase().includes(indicator)
                         )

        return {
          success: isSuccess,
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers),
          body: responseBody || undefined,
          finalUrl: response.url
        }
      }
    } catch (error) {
      console.error(`Unsubscribe API: Request attempt ${attempt} failed:`, error)
      
      if (attempt === retryCount) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Request failed',
          attempt
        }
      }
      
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000)
      console.log(`Unsubscribe API: Waiting ${delay}ms before retry`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  return {
    success: false,
    error: 'All retry attempts failed',
    attempt: retryCount
  }
}

export async function POST(request: Request) {
  const startTime = Date.now()
  console.log('Unsubscribe API: ====== Starting new unsubscribe request ======')
  
  try {
    const { unsubscribeLink, email, messageId } = await request.json()
    const authHeader = request.headers.get('Authorization')
    
    console.log('Unsubscribe API: Request details:')
    console.log('- Message ID:', messageId)
    console.log('- Email:', email)
    console.log('- Link:', unsubscribeLink)
    console.log('- Auth present:', !!authHeader)
    
    // Input validation
    if (!unsubscribeLink) {
      console.log('Unsubscribe API: Missing unsubscribe link')
      return NextResponse.json(
        { error: 'No unsubscribe link provided' },
        { status: 400 }
      )
    }
    
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
    console.log('Unsubscribe API: Setting up Gmail API client')
    
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
      // Don't fail the whole request if label management fails
    }

    // Clean the unsubscribe link - remove any angle brackets and whitespace
    const cleanLink = unsubscribeLink.replace(/[<>]/g, '').trim()
    console.log('Unsubscribe API: Cleaned link:', cleanLink)

    // Add label first if we have one
    let labelApplied = false
    if (labelId) {
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
        labelApplied = true
      } catch (labelError) {
        console.error('Unsubscribe API: Error adding label:', labelError)
        // Continue with unsubscribe even if labeling fails
      }
    }

    // Handle mailto: links
    if (cleanLink.startsWith('mailto:')) {
      console.log('Unsubscribe API: Processing mailto link')
      try {
        // Parse mailto link
        const mailtoUrl = new URL(cleanLink)
        const to = mailtoUrl.pathname
        const subject = mailtoUrl.searchParams.get('subject') || 'Unsubscribe'
        const body = mailtoUrl.searchParams.get('body') || 'Please unsubscribe me'

        console.log('Unsubscribe API: Mailto details:')
        console.log('- To:', to)
        console.log('- Subject:', subject)
        console.log('- Body length:', body.length)

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

        console.log('Unsubscribe API: Sending unsubscribe email')
        // Send the email
        const result = await gmail.users.messages.send({
          userId: 'me',
          requestBody: {
            raw: encodedMessage
          }
        })
        console.log('Unsubscribe API: Email sent successfully, ID:', result.data.id)
        
        const endTime = Date.now()
        console.log(`Unsubscribe API: Request completed in ${endTime - startTime}ms`)
        
        return NextResponse.json({ 
          success: true,
          type: 'mailto',
          message: 'Unsubscribe email sent successfully',
          labelApplied,
          emailId: result.data.id
        })
      } catch (emailError) {
        console.error('Unsubscribe API: Error sending unsubscribe email:', emailError)
        throw emailError
      }
    } 
    // Handle HTTP/HTTPS links
    else if (cleanLink.startsWith('http')) {
      console.log('Unsubscribe API: Processing HTTP link')
      
      // Try POST first with email in form data
      let result = await tryUnsubscribeRequest(cleanLink, 'POST', email)
      console.log('Unsubscribe API: POST attempt result:', result)
      
      if (!result.success) {
        // If POST failed and URL has email parameter placeholder, try replacing it
        let modifiedUrl = cleanLink
        if (email) {
          modifiedUrl = cleanLink
            .replace('{email}', encodeURIComponent(email))
            .replace('%7Bemail%7D', encodeURIComponent(email))
        }
        
        console.log('Unsubscribe API: POST failed, trying GET with URL:', modifiedUrl)
        result = await tryUnsubscribeRequest(modifiedUrl, 'GET', email)
        console.log('Unsubscribe API: GET attempt result:', result)
      }
      
      const endTime = Date.now()
      console.log(`Unsubscribe API: Request completed in ${endTime - startTime}ms`)
      
      return NextResponse.json({ 
        success: result.success,
        type: 'url',
        url: cleanLink,
        labelApplied,
        requestResult: result
      })
    } 
    else {
      console.log('Unsubscribe API: Unsupported link format')
      return NextResponse.json(
        { error: `Unsupported unsubscribe link format: ${cleanLink}` },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Unsubscribe API: Fatal error:', error)
    
    // Enhanced error response
    const errorResponse = {
      error: error instanceof Error ? error.message : 'Failed to process unsubscribe request',
      timestamp: new Date().toISOString(),
      requestDuration: Date.now() - startTime,
      details: error instanceof Error ? {
        name: error.name,
        stack: error.stack
      } : undefined
    }
    
    return NextResponse.json(errorResponse, { status: 500 })
  }
} 