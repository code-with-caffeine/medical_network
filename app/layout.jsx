import './globals.css';
import { AppProvider } from '../lib/store';
import { Toast } from '../components/ui';
import { RequestModal, ProfileModal } from '../components/Modals';

export const metadata = {
  title: 'MedMatch',
  description: 'Find people who have been where you are.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600&family=Newsreader:opsz,wght@6..72,400;6..72,500&display=swap" rel="stylesheet" />
      </head>
      <body>
        <AppProvider>
          {children}
          <RequestModal />
          <ProfileModal />
          <Toast />
        </AppProvider>
      </body>
    </html>
  );
}
