import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin Dashboard | Sylla Vacations',
  description: 'Manage users and system settings',
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}