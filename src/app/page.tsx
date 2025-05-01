import { getServerSession } from 'next-auth'
import { SignIn } from '@/components/SignIn'
import { SubscriptionManager } from '@/components/SubscriptionManager'

export default async function Home() {
  const session = await getServerSession()

  return (
    <main className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="text-center mb-12 fade-in">
        <h1 className="text-5xl font-bold bg-gradient-to-r from-primary-600 to-accent-600 text-transparent bg-clip-text">
          Clean Your Inbox
        </h1>
        <p className="text-xl text-neutral-600 mt-4">
          Unsubscribe from unwanted emails in one click. Take back control of your inbox!
        </p>
      </div>

      {!session ? (
        <div className="max-w-md mx-auto">
          <div className="card slide-up">
            <h2 className="text-center mb-6">Get Started</h2>
            <SignIn />
            
            <div className="mt-8 space-y-4 text-neutral-600">
              <div className="flex items-center space-x-3">
                <svg className="w-5 h-5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <p>One-click unsubscribe from multiple emails</p>
              </div>
              <div className="flex items-center space-x-3">
                <svg className="w-5 h-5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <p>Safe and secure with Google OAuth</p>
              </div>
              <div className="flex items-center space-x-3">
                <svg className="w-5 h-5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <p>Track your unsubscribe history</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="slide-up">
          <SubscriptionManager />
        </div>
      )}
    </main>
  )
} 