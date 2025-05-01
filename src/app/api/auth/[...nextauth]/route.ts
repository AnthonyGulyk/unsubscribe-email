import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'

console.log('OAuth Config:', {
  clientIdExists: !!process.env.GOOGLE_CLIENT_ID,
  clientIdLength: process.env.GOOGLE_CLIENT_ID?.length,
  clientSecretExists: !!process.env.GOOGLE_CLIENT_SECRET,
  clientSecretLength: process.env.GOOGLE_CLIENT_SECRET?.length,
  nextAuthUrl: process.env.NEXTAUTH_URL,
})

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      authorization: {
        params: {
          scope: [
            'openid',
            'email',
            'profile',
            'https://www.googleapis.com/auth/gmail.readonly',
            'https://www.googleapis.com/auth/gmail.send',
            'https://www.googleapis.com/auth/gmail.modify'
          ].join(' '),
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code'
        }
      }
    })
  ],
  debug: true, // Enable debug messages
  logger: {
    error: (code, metadata) => {
      console.error('NextAuth Error:', code, metadata)
    },
    warn: (code) => {
      console.warn('NextAuth Warning:', code)
    },
    debug: (code, metadata) => {
      console.log('NextAuth Debug:', code, metadata)
    },
  },
  callbacks: {
    async jwt({ token, account, user }) {
      // Initial sign in
      if (account && user) {
        console.log('Initial sign in, account:', { 
          access_token: !!account.access_token,
          refresh_token: !!account.refresh_token,
          expires_at: account.expires_at,
          id_token: !!account.id_token
        })
        return {
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          accessTokenExpires: account.expires_at ? account.expires_at * 1000 : 0,
          idToken: account.id_token,
          user
        }
      }

      // Return previous token if the access token has not expired yet
      if (Date.now() < (token.accessTokenExpires as number)) {
        console.log('Existing token still valid')
        return token
      }

      console.log('Token expired, attempting refresh')
      // Access token has expired, try to refresh it
      try {
        const response = await fetch('https://oauth2.googleapis.com/token', {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID as string,
            client_secret: process.env.GOOGLE_CLIENT_SECRET as string,
            grant_type: 'refresh_token',
            refresh_token: token.refreshToken as string,
          }),
          method: 'POST',
        })

        const tokens = await response.json()

        if (!response.ok) {
          console.error('Token refresh failed:', tokens)
          throw tokens
        }

        console.log('Token refresh successful')
        return {
          ...token,
          accessToken: tokens.access_token,
          accessTokenExpires: Date.now() + (tokens.expires_in as number) * 1000,
          idToken: tokens.id_token ?? token.idToken, // Preserve existing id_token if not in refresh response
        }
      } catch (error) {
        console.error('Error refreshing access token', error)
        return { ...token, error: 'RefreshAccessTokenError' }
      }
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken
      session.error = token.error
      return session
    },
  },
})

export { handler as GET, handler as POST } 