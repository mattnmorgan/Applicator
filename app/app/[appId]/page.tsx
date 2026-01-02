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
  const [user, setUser] = useState<{
    displayName: string;
    profilePicture?: string;
    isAdmin: boolean;
  } | null>(null);
  const [brandName, setBrandName] = useState('Applicator');
  const [brandIcon, setBrandIcon] = useState<string | undefined>(undefined);

  // Fetch user data
  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          setUser({
            displayName: data.user.displayName,
            profilePicture: data.user.profilePicture,
            isAdmin: data.user.isAdmin || false
          });
        }
      })
      .catch(err => {
        console.error('Error fetching user data:', err);
      });
  }, []);

  // Fetch brand settings
  useEffect(() => {
    fetch('/api/system/brand')
      .then(res => res.json())
      .then(data => {
        setBrandName(data.brandName || 'Applicator');
        setBrandIcon(data.brandIcon);
      })
      .catch(err => {
        console.error('Error fetching brand settings:', err);
      });
  }, []);

  useEffect(() => {
    if (!appId) return;

    const scripts: HTMLScriptElement[] = [];

    // Load React and ReactDOM first
    const loadReact = () => {
      return new Promise<void>((resolve, reject) => {
        // Check if React is already loaded
        // @ts-ignore
        if (window.React && window.ReactDOM) {
          resolve();
          return;
        }

        const reactScript = document.createElement('script');
        reactScript.src = '/assets/react.production.min.js';
        reactScript.onload = () => {
          const reactDOMScript = document.createElement('script');
          reactDOMScript.src = '/assets/react-dom.production.min.js';
          reactDOMScript.onload = () => resolve();
          reactDOMScript.onerror = () => reject(new Error('Failed to load ReactDOM'));
          document.body.appendChild(reactDOMScript);
          scripts.push(reactDOMScript);
        };
        reactScript.onerror = () => reject(new Error('Failed to load React'));
        document.body.appendChild(reactScript);
        scripts.push(reactScript);
      });
    };

    // Load the app bundle after React is ready
    const loadApp = async () => {
      try {
        await loadReact();

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
        scripts.push(script);
      } catch (err) {
        console.error('Error loading dependencies:', err);
        setError('Failed to load app dependencies');
        setLoading(false);
      }
    };

    loadApp();

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

      // Remove all scripts
      scripts.forEach(script => {
        if (script.parentNode) {
          document.body.removeChild(script);
        }
      });
    };
  }, [appId]);

  return (
    <>
      <Navigation
        displayName={user?.displayName || ''}
        profilePicture={user?.profilePicture}
        isAdmin={user?.isAdmin || false}
        brandName={brandName}
        brandIcon={brandIcon}
      />
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
