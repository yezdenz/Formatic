import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = { title: 'Formatic Hub', description: 'Collaborative formative study library' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body><header className="topbar"><div className="topbar-inner"><Link className="brand" href="/">FORMATIC</Link><nav><Link href="/">Folders</Link> · <Link href="/login">Login</Link></nav></div></header>{children}</body></html>;
}
