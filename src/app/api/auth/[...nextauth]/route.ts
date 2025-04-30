import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { GOOGLE_AUTH_CONFIG } from '@/lib/google'

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: GOOGLE_AUTH_CONFIG.clientId!,
      clientSecret: GOOGLE_AUTH_CONFIG.clientSecret!,
      authorization: {
        params: {
          scope: GOOGLE_AUTH_CONFIG.scope,
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      // Persist the access_token to the token right after signin
      if (account) {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
      }
      return token
    },
    async session({ session, token }) {
      // Send properties to the client
      session.accessToken = token.accessToken
      return session
    },
  },
})

export { handler as GET, handler as POST } 