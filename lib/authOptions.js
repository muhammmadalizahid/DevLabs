import GoogleProvider from 'next-auth/providers/google';
import { supabaseAdmin } from '@/lib/db/supabase';

export const authOptions = {
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
        const { error } = await supabaseAdmin.from('users').upsert(
          { email, name, avatar_url: image },
          { onConflict: 'email', ignoreDuplicates: false }
        );
        if (error) {
          console.error('[NextAuth] Supabase upsert error:', error);
          console.warn('[NextAuth] Allowing login to continue without provisioning user record');
          return true;
        }
        console.log('[NextAuth] User saved successfully:', email);
        return true;
      } catch (err) {
        console.error('[NextAuth] signIn callback error:', err);
        console.warn('[NextAuth] Allowing login to continue after signIn callback failure');
        return true;
      }
    },

    async jwt({ token, user, trigger, session }) {
      try {
        const email = user?.email || token.email;
        if (email) {
          token.email = email;
        }

        if (trigger === 'update' && session?.role) {
          token.role = session.role;
          return token;
        }

        if (user?.email) {
          console.log('[NextAuth JWT] Fetching user data for:', email);
          const { data, error } = await supabaseAdmin
            .from('users')
            .select('id, role')
            .eq('email', email)
            .single();

          if (error) {
            console.error('[NextAuth JWT] Supabase query error:', error);
            return token;
          }

          if (!data) {
            console.warn('[NextAuth JWT] No user data found for:', email);
            return token;
          }

          token.userId = data.id;
          token.role = data.role;

          console.log('[NextAuth JWT] Token updated successfully:', {
            email,
            userId: token.userId,
            role: token.role,
          });
        } else if (!token.userId && email) {
          console.log('[NextAuth JWT] Skipping user lookup during session read for:', email);
        }
      } catch (err) {
        console.error('[NextAuth JWT] Callback error:', err);
      }
      return token;
    },

    async session({ session, token }) {
      session.user.id = token.userId;
      session.user.role = token.role;
      return session;
    },
  },
  pages: {
    signIn: '/',
    error: '/',
  },
  session: { strategy: 'jwt' },
  secret: process.env.NEXTAUTH_SECRET,
};