'use client';

import { useParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import Navigation from '@/app/components/Navigation/Navigation';
import AppMenu from '@/app/components/AppMenu/AppMenu';

export default function AppPage() {
  const params = useParams();
  const appId = params.appId as string;
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!appId) return;

    // Load the app bundle
    const script = document.createElement('script');
    script.src = `/api/assets/apps/${appId}`;
    script.async = true;

    script.onload = () => {
      try {
        // The app should export a mount function
        // @ts-ignore
        if (window.AppMount && typeof window.AppMount === 'function') {
          // @ts-ignore
          window.AppMount(containerRef.current, { appId });
          setLoading(false);
        } else {
          setError('App does not export a mount function');
          setLoading(false);
        }
      } catch (err) {
        console.error('Error mounting app:', err);
        setError('Failed to mount app');
        setLoading(false);
      }
    };

    script.onerror = () => {
      setError('Failed to load app');
      setLoading(false);
    };

    document.body.appendChild(script);

    return () => {
      // Cleanup: unmount the app if it provides an unmount function
      // @ts-ignore
      if (window.AppUnmount && typeof window.AppUnmount === 'function') {
        try {
          // @ts-ignore
          window.AppUnmount();
        } catch (err) {
          console.error('Error unmounting app:', err);
        }
      }

      // Remove the script
      document.body.removeChild(script);
    };
  }, [appId]);

  return (
    <>
      <Navigation displayName="" profilePicture={undefined} isAdmin={false} brandName="Applicator" brandIcon={undefined} />
      <AppMenu />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900" style={{ paddingTop: '113px' }}>
        <div className="container mx-auto px-4 py-8">
          {loading && (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-600 dark:text-gray-400">Loading app...</div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          <div ref={containerRef} className="app-container" />
        </div>
      </div>
    </>
  );
}
