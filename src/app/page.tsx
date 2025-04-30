'use client'

import { useState } from 'react'
import { Mail, Loader2, ExternalLink } from 'lucide-react'
import { signIn, signOut, useSession } from 'next-auth/react'

interface Subscription {
  name: string
  email: string
  lastReceived: string
}

export default function Home() {
  const { data: session } = useSession()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    try {
      const response = await fetch('/api/check-subscriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to check subscriptions')
      }

      setSubscriptions(data.subscriptions)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred')
      setSubscriptions([])
    } finally {
      setLoading(false)
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
                onClick={() => signIn('google')}
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
                {subscriptions.map((sub, index) => (
                  <div
                    key={index}
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
                    </div>
                    <button
                      onClick={() => {
                        // TODO: Implement unsubscribe functionality
                        alert(`Unsubscribe from ${sub.name} coming soon!`)
                      }}
                      className="ml-4 flex items-center gap-1 px-3 py-1 text-sm text-red-600 hover:text-red-700
                               hover:bg-red-50 rounded-md transition-colors duration-200"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Unsubscribe
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
} 