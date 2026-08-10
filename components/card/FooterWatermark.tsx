import React from 'react';
import Link from 'next/link';

interface FooterWatermarkProps {
  plan?: string;
  lang?: 'en' | 'ar';
}

export function FooterWatermark({ plan, lang = 'en' }: FooterWatermarkProps) {
  // Only show watermark if plan is 'free' or undefined
  if (plan === 'pro') return null;

  const isAr = lang === 'ar';

  return (
    <footer className="w-full py-6 text-center text-xs text-slate-500 dark:text-slate-400">
      <Link
        href="/"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center space-x-1.5 hover:text-violet-600 dark:hover:text-violet-400 transition-colors group"
      >
        <span>{isAr ? 'مدعوم بواسطة' : 'Powered by'}</span>
        <span className="font-extrabold tracking-wide text-violet-600 dark:text-violet-400 group-hover:underline">
          JustTap
        </span>
      </Link>
    </footer>
  );
}
