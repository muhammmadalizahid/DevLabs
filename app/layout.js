import '../styles/globals.css';
import { SessionProvider } from './providers';

export const metadata = {
  title: 'DevLab — SQL Assessment Platform',
  description: 'Classroom-based SQL coding assessment and practice platform for teachers and students.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script dangerouslySetInnerHTML={{
          __html: `
            (function() {
              try {
                var t = localStorage.getItem('devlab-theme') || 'light';
                document.documentElement.setAttribute('data-theme', t);
              } catch(e) {}
            })();
          `
        }} />
      </head>
      <body>
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
