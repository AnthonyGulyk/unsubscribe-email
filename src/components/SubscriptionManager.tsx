'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'

interface Subscription {
  name: string
  email: string
  lastReceived: string
  unsubscribeLink: string
  messageId: string
}

export function SubscriptionManager() {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [unsubscribing, setUnsubscribing] = useState<string | null>(null)
  const [unsubscribeStatus, setUnsubscribeStatus] = useState<string>('')

  const handleFindSubscriptions = async () => {
    setLoading(true)
    setError('')
    
    if (!session?.accessToken) {
      setError('No access token available. Please sign in again.')
      setLoading(false)
      return
    }
    
    try {
      const response = await fetch('/api/check-subscriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.accessToken}`,
        },
        body: JSON.stringify({}),
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to check subscriptions')
      }

      if (!data.subscriptions) {
        setError(`No subscriptions found. Debug info: ${JSON.stringify(data.debug)}`)
        setSubscriptions([])
        return
      }

      if (data.subscriptions.length === 0) {
        setError(`No subscriptions found in the last 30 days. Messages checked: ${data.debug?.totalMessages || 0}`)
      }

      setSubscriptions(data.subscriptions || [])
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
        if (data.success) {
          setUnsubscribeStatus('Successfully unsubscribed!')
          setTimeout(() => {
            setSubscriptions(current =>
              current.filter(sub => sub.email !== subscription.email)
            )
            setUnsubscribeStatus('')
            setUnsubscribing(null)
          }, 2000)
        } else {
          window.open(data.url, '_blank')
          setUnsubscribeStatus('Automatic unsubscribe failed. Please complete the process in the new tab.')
          setTimeout(() => {
            setUnsubscribeStatus('')
            setUnsubscribing(null)
          }, 5000)
        }
      } else {
        setUnsubscribeStatus('Successfully unsubscribed!')
        setTimeout(() => {
          setSubscriptions(current =>
            current.filter(sub => sub.email !== subscription.email)
          )
          setUnsubscribeStatus('')
          setUnsubscribing(null)
        }, 2000)
      }
    } catch (error) {
      console.error('Unsubscribe error:', error)
      setError(error instanceof Error ? error.message : 'Failed to unsubscribe')
      setUnsubscribeStatus('')
      setUnsubscribing(null)
    }
  }

  return (
    <div className="space-y-8">
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-neutral-900">Your Subscriptions</h2>
          <button
            onClick={handleFindSubscriptions}
            disabled={loading}
            className="btn-primary"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Scanning...
              </span>
            ) : (
              'Scan Inbox'
            )}
          </button>
        </div>

        {error && (
          <div className="p-4 mb-6 bg-error/10 border border-error/20 rounded-lg text-error">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {subscriptions.map((sub) => (
            <div
              key={sub.email}
              className="card bg-neutral-50 hover:bg-white transition-all duration-200"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-neutral-900 truncate">
                    {sub.name}
                  </h3>
                  <p className="text-sm text-neutral-600 truncate">{sub.email}</p>
                  <p className="text-xs text-neutral-500 mt-1">
                    Last received: {sub.lastReceived}
                  </p>
                  {unsubscribing === sub.email && unsubscribeStatus && (
                    <p className="text-xs text-primary-600 mt-1 animate-pulse">
                      {unsubscribeStatus}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleUnsubscribe(sub)}
                  disabled={unsubscribing === sub.email}
                  className="btn-secondary whitespace-nowrap"
                >
                  {unsubscribing === sub.email ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Unsubscribing...
                    </span>
                  ) : (
                    'Unsubscribe'
                  )}
                </button>
              </div>
            </div>
          ))}

          {subscriptions.length === 0 && !loading && !error && (
            <div className="text-center py-12 text-neutral-500">
              <svg className="w-16 h-16 mx-auto mb-4 text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <p className="text-lg">No subscriptions found</p>
              <p className="text-sm">Click "Scan Inbox" to find your subscriptions</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 