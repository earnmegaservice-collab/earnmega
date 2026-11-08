'use client';

import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const MASTER_ADMINS = ['horpalservice@gmail.com', 'geestablish@gmail.com'];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      if (!user?.email || !MASTER_ADMINS.includes(user.email.toLowerCase())) {
        router.replace('/');
      } else {
        setAuthorized(true);
      }
    }
  }, [user, isLoading, router]);

  if (!authorized) {
    return null; // Render nothing while verifying or redirecting
  }

  return (
    <div className="min-h-screen bg-[#050811] text-white">
      {children}
    </div>
  );
}
