import { IconLogout } from '@tabler/icons-react';
import { useRouter } from 'next/router';
import React from 'react';

export const SignOutButton: React.FC = () => {
  const router = useRouter();

  const handleSignOut = () => {
    // Clear any authentication tokens or user info here:
    localStorage.removeItem('authToken');
    // Redirect to the login or landing page:
    router.push('/');
  };

  return (
    <button
      onClick={handleSignOut}
      className="absolute top-2 right-2 z-50 flex items-center gap-2 text-white bg-red-500 hover:bg-red-600 px-3 py-1 rounded-md"
    >
      <IconLogout size={18} />
      Sign Out
    </button>
  );
};