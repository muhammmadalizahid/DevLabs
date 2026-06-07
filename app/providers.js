'use client';
import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react';
import { UIFeedbackProvider } from '@/components/UIFeedback';

export function SessionProvider({ children }) {
  return (
    <NextAuthSessionProvider>
      <UIFeedbackProvider>{children}</UIFeedbackProvider>
    </NextAuthSessionProvider>
  );
}
