import type { Metadata } from 'next';
import { Prompt, Sarabun, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { ThemeAndBrandProvider } from '@/components/ThemeAndBrandProvider';

const prompt = Prompt({
  subsets: ['thai', 'latin'],
  weight: ['400', '600', '700', '800'],
  variable: '--font-prompt',
  display: 'swap',
});

const sarabun = Sarabun({
  subsets: ['thai', 'latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sarabun',
  display: 'swap',
});

const mono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['500', '700'],
  variable: '--font-mono',
  display: 'swap',
});

const BASE_PATH = (process.env.NEXT_PUBLIC_BASE_PATH || '').replace(/\/$/, '');

export const metadata: Metadata = {
  title: 'GURU POLICE — ติวสอบนายสิบตำรวจ ตัวจริง',
  description:
    'คลังข้อสอบนายสิบตำรวจ 7,038 ข้อ ครบ 7 วิชา เฉลยละเอียด วิเคราะห์จุดอ่อนรายหัวข้อ และโหมดสอบจับเวลาเสมือนจริง',
  manifest: `${BASE_PATH}/manifest.webmanifest`,
  icons: {
    icon: `${BASE_PATH}/icon.svg`,
    apple: `${BASE_PATH}/apple-icon.png`,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="th"
      data-theme="light"
      data-brand="blue"
      suppressHydrationWarning
      className={`${prompt.variable} ${sarabun.variable} ${mono.variable}`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('gp:theme');if(t==='dark'||t==='light'){document.documentElement.dataset.theme=t;}var b=localStorage.getItem('gp:brand');if(b){document.documentElement.dataset.brand=b;}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-screen bg-bg font-sans text-ink antialiased selection:bg-brand/20 selection:text-ink">
        <ThemeAndBrandProvider>{children}</ThemeAndBrandProvider>
      </body>
    </html>
  );
}

