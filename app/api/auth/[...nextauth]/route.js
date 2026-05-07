import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { supabaseAdmin } from '@/lib/db/supabase';

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      try {
        const { email, name, image } = user;
        console.log('[NextAuth] Attempting to save user:', email);
        // Upsert user into our users table
        const { error, data } = await supabaseAdmin.from('users').upsert(
          { email, name, avatar_url: image },
          { onConflict: 'email', ignoreDuplicates: false }
        );
        if (error) {
          console.error('[NextAuth] Supabase upsert error:', error);
          return false;
        }
        console.log('[NextAuth] User saved successfully:', email);
        return true;
      } catch (err) {
        console.error('[NextAuth] signIn callback error:', err);
        return false;
      }
    },

    async jwt({ token, user }) {
      try {
        // Always fetch the latest role from DB, not just on first login
        const email = user?.email || token.email;
        if (email) {
          console.log('[NextAuth JWT] Fetching user data for:', email);
          const { data, error } = await supabaseAdmin
            .from('users')
            .select('id, role')
            .eq('email', email)
            .single();
          
          if (error) {
            console.error('[NextAuth JWT] Supabase query error:', error);
            // Don't overwrite existing token values if there's an error
            return token;
          }
          
          if (!data) {
            console.warn('[NextAuth JWT] No user data found for:', email);
            return token;
          }
          
          token.userId = data.id;
          token.role = data.role;
          token.email = email;
          
          console.log('[NextAuth JWT] Token updated successfully:', {
            email,
            userId: token.userId,
            role: token.role
          });
        }
      } catch (err) {
        console.error('[NextAuth JWT] Callback error:', err);
      }
      return token;
    },

    async session({ session, token }) {
      session.user.id   = token.userId;
      session.user.role = token.role;
      return session;
    },
  },
  pages: {
    signIn: '/',
    error:  '/',
  },
  session: { strategy: 'jwt' },
  secret: process.env.NEXTAUTH_SECRET,
});

export { handler as GET, handler as POST };
