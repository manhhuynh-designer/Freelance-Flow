import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';

// Build providers dynamically from environment. Keep safe to check in.
const providers = [] as any[];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  );
}

if (process.env.NODE_ENV !== 'production') {
  providers.push(
    CredentialsProvider({
      name: 'Development Credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials || !credentials.username) return null;
        return { id: credentials.username, email: `${credentials.username}@local` };
      },
    })
  );
}

export const authOptions: any = {
  providers,
  secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || undefined,
  session: { strategy: 'jwt' },
  callbacks: {
    async jwt({ token, user }: any) {
      if (user) token.id = user.id || token.id;
      return token;
    },
    async session({ session, token }: any) {
      (session as any).user = { ...(session as any).user, id: (token as any).id };
      return session;
    },
  },
};

export default authOptions;
