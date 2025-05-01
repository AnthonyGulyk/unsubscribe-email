'use client'

import { signIn } from 'next-auth/react'

export function SignIn() {
  const handleGoogleSignIn = () => {
    signIn('google', { callbackUrl: '/' })
  }

  return (
    <div className="text-center">
      <button
        onClick={handleGoogleSignIn}
        className="inline-flex items-center justify-center w-full gap-3 px-6 py-3 
                 bg-white border-2 border-neutral-200 rounded-xl text-neutral-700 
                 hover:bg-neutral-50 hover:border-primary-200
                 focus:outline-none focus:ring-2 focus:ring-primary-200 
                 transition-all duration-200 group"
      >
        <img src="/google.svg" alt="Google logo" className="w-5 h-5" />
        <span className="font-medium group-hover:text-primary-600">Sign in with Google</span>
      </button>
      
      <p className="mt-6 text-sm text-neutral-500">
        Connect your Gmail account to find and manage your subscriptions
      </p>
    </div>
  )
} 