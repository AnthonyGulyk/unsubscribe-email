'use client'

import { useState } from 'react'
import { Mail, Loader2, ExternalLink } from 'lucide-react'
import { signIn, signOut, useSession } from 'next-auth/react'

interface Subscription {
  name: string
  email: string
  lastReceived: string
  unsubscribeLink: string
  messageId: string
}

export default function Home() {
  const { data: session } = useSession()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [unsubscribing, setUnsubscribing] = useState<string | null>(null)
  const [unsubscribeStatus, setUnsubscribeStatus] = useState<string>('')

  const handleGoogleSignIn = async () => {
    console.log('Attempting to sign in with Google...')
    try {
      const result = await signIn('google', { 
        callbackUrl: '/',
        redirect: false 
      })
      console.log('Sign-in result:', result)
      
      if (result?.error) {
        console.error('Sign-in error:', result.error)
        setError(result.error)
      }
    } catch (error) {
      console.error('Sign-in exception:', error)
      setError('Failed to sign in')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    console.log('Session data:', session)
    console.log('Access token:', session?.accessToken)
    
    try {
      const response = await fetch('/api/check-subscriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.accessToken}`,
        },
        body: JSON.stringify({ email }),
      })

      console.log('Response status:', response.status)
      const data = await response.json()
      console.log('Response data:', data)
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to check subscriptions')
      }

      setSubscriptions(data.subscriptions)
    } catch (error) {
      console.error('Submit error:', error)
      setError(error instanceof Error ? error.message : 'An error occurred')
      setSubscriptions([])
    } finally {
      setLoading(false)
    }
  }

  const handleUnsubscribe = async (subscription: Subscription) => {
    try {
      setUnsubscribing(subscription.email)
      setError('')
      setUnsubscribeStatus('Starting unsubscribe process...')

      const response = await fetch('/api/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.accessToken}`,
        },
        body: JSON.stringify({
          unsubscribeLink: subscription.unsubscribeLink,
          email: subscription.email,
          messageId: subscription.messageId
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to unsubscribe')
      }

      if (data.type === 'url') {
        // Open HTTP/HTTPS unsubscribe links in a new tab
        window.open(data.url, '_blank')
        setUnsubscribeStatus('Unsubscribe link opened in new tab. Please complete the process there.')
      } else {
        setUnsubscribeStatus('Successfully unsubscribed!')
      }

      // Remove the subscription from the list after a short delay
      setTimeout(() => {
        setSubscriptions(current =>
          current.filter(sub => sub.email !== subscription.email)
        )
        setUnsubscribeStatus('')
      }, 2000)
    } catch (error) {
      console.error('Unsubscribe error:', error)
      setError(error instanceof Error ? error.message : 'Failed to unsubscribe')
      setUnsubscribeStatus('')
    } finally {
      setTimeout(() => {
        setUnsubscribing(null)
      }, 2000)
    }
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Email Subscription Manager
            </h1>
            <p className="text-gray-600">
              Find and manage all your newsletter subscriptions in one place
            </p>
          </div>

          {!session ? (
            <div className="max-w-md mx-auto text-center">
              <button
                onClick={handleGoogleSignIn}
                className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-gray-300 
                         rounded-lg text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 
                         focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
              >
                <img src="/google.svg" alt="Google logo" className="w-5 h-5" />
                Sign in with Google
              </button>
              <p className="mt-4 text-sm text-gray-600">
                Connect your Gmail account to automatically find your subscriptions
              </p>
              {error && (
                <p className="mt-4 text-sm text-red-600">{error}</p>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="max-w-md mx-auto">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg 
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                           text-gray-900 placeholder-gray-500"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-4 px-4 py-3 bg-blue-600 text-white rounded-lg
                         hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                         disabled:opacity-50 disabled:cursor-not-allowed
                         transition-colors duration-200"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Checking...
                  </span>
                ) : (
                  'Find My Subscriptions'
                )}
              </button>
              {error && (
                <p className="mt-4 text-sm text-red-600 text-center">{error}</p>
              )}
            </form>
          )}

          {subscriptions.length > 0 && (
            <div className="mt-12 max-w-2xl mx-auto">
              <h2 className="text-xl font-semibold mb-6">Your Subscriptions</h2>
              <div className="space-y-4">
                {subscriptions.map((sub) => (
                  <div
                    key={sub.email}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {sub.name}
                      </h3>
                      <p className="text-sm text-gray-500 truncate">{sub.email}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Last received: {sub.lastReceived}
                      </p>
                      {unsubscribing === sub.email && unsubscribeStatus && (
                        <p className="text-xs text-blue-600 mt-1">
                          {unsubscribeStatus}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleUnsubscribe(sub)}
                      disabled={unsubscribing === sub.email}
                      className="ml-4 flex items-center gap-1 px-3 py-1 text-sm text-red-600 hover:text-red-700
                               hover:bg-red-50 rounded-md transition-colors duration-200 disabled:opacity-50"
                    >
                      {unsubscribing === sub.email ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Unsubscribing...
                        </>
                      ) : (
                        <>
                          <ExternalLink className="h-4 w-4" />
                          Unsubscribe
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
              {error && (
                <p className="mt-4 text-sm text-red-600 text-center">{error}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  )
} 