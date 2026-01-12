import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'HRM System - Quản lý nhân sự',
  description: 'Hệ thống quản lý nhân sự hiện đại',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body className="antialiased">{children}</body>
    </html>
  );
}