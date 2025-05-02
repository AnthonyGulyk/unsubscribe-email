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

// Helper function to get display name from email
const getDisplayName = (email: string) => {
  const [localPart, domain] = email.split('@')
  return domain || email // If can't split, return full email
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

      setUnsubscribeStatus('Successfully unsubscribed!')
      setTimeout(() => {
        setSubscriptions(current =>
          current.filter(sub => sub.email !== subscription.email)
        )
        setUnsubscribeStatus('')
        setUnsubscribing(null)
      }, 2000)
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
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-accent-600 text-transparent bg-clip-text">
              Your Subscriptions
            </h2>
            {subscriptions.length > 0 && (
              <p className="text-sm text-neutral-600 mt-1">
                Found {subscriptions.length} subscription{subscriptions.length === 1 ? '' : 's'}
              </p>
            )}
          </div>
          <button
            onClick={handleFindSubscriptions}
            disabled={loading}
            className="btn-primary text-[10px] leading-none px-1.5 py-0.5 flex items-center gap-0.5 min-h-[16px] rounded"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-2.5 w-2.5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Scanning...</span>
              </>
            ) : (
              <span>Scan Inbox</span>
            )}
          </button>
        </div>

        {error && (
          <div className="p-4 mb-6 bg-error/10 border border-error/20 rounded-lg text-error">
            {error}
          </div>
        )}

        {subscriptions.length > 0 && (
          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-neutral-200">
              <thead>
                <tr className="text-xs text-neutral-500">
                  <th className="text-left font-medium py-2 w-20"></th>
                  <th className="text-left font-medium py-2">Sender</th>
                  <th className="text-left font-medium py-2">Last Received</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {subscriptions.map((sub) => (
                  <tr 
                    key={sub.email}
                    className="group hover:bg-gradient-to-r hover:from-primary-50 hover:to-accent-50 
                             transition-colors duration-200"
                  >
                    <td className="py-2">
                      <button
                        onClick={() => handleUnsubscribe(sub)}
                        disabled={unsubscribing === sub.email}
                        className="btn-secondary text-[9px] leading-none px-1 py-px 
                                 opacity-80 group-hover:opacity-100 transition-opacity min-h-[14px] rounded"
                      >
                        {unsubscribing === sub.email ? (
                          <>
                            <svg className="inline-block animate-spin h-1.5 w-1.5 mr-0.5" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Unsubscribing...
                          </>
                        ) : (
                          'Unsubscribe'
                        )}
                      </button>
                      {unsubscribing === sub.email && unsubscribeStatus && (
                        <div className="text-[9px] text-primary-600 animate-pulse mt-0.5">
                          {unsubscribeStatus}
                        </div>
                      )}
                    </td>
                    <td className="py-2">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-primary-900">
                            {sub.name}
                          </span>
                          <span className="text-neutral-400">
                            {' - '}
                          </span>
                          <span className="text-sm text-neutral-400 truncate">
                            {sub.email}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-2">
                      <span className="text-xs text-neutral-500">
                        {sub.lastReceived}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

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
  )
} 