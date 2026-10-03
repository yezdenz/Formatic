import type { Metadata } from 'next';
import '@fontsource-variable/pixelify-sans/index.css';
import '@fontsource-variable/dm-sans/index.css';
import './globals.css';

export const metadata: Metadata = { title: 'Formatic Hub', description: 'Collaborative formative study library' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
