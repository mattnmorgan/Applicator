'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/lib/components/utility/Button';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    displayName: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Check if self-registration is enabled
    fetch('/api/system/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.settings?.selfregistrationEnabled !== 'true') {
          router.push('/');
        } else {
          setChecking(false);
        }
      })
      .catch(() => {
        router.push('/');
      });
  }, [router]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/system/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to create account');
        setLoading(false);
        return;
      }

      // Redirect to login page
      router.push('/system/login');
    } catch (err) {
      setError('An error occurred. Please try again.');
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0f172a',
      }}>
        <div style={{ color: '#94a3b8' }}>Loading...</div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0f172a',
      padding: '20px'
    }}>
      <div style={{
        background: '#1e293b',
        padding: '40px',
        borderRadius: '10px',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)',
        width: '100%',
        maxWidth: '400px',
        border: '1px solid #334155'
      }}>
        <h1 style={{
          fontSize: '28px',
          fontWeight: 'bold',
          marginBottom: '10px',
          color: '#f1f5f9'
        }}>
          Create Account
        </h1>
        <p style={{
          color: '#94a3b8',
          marginBottom: '30px'
        }}>
          Register for a new account
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label htmlFor="username" style={{
              display: 'block',
              marginBottom: '5px',
              fontWeight: '500',
              color: '#e2e8f0'
            }}>
              Username
            </label>
            <input
              id="username"
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              required
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #475569',
                borderRadius: '5px',
                fontSize: '14px',
                boxSizing: 'border-box',
                background: '#0f172a',
                color: '#f1f5f9'
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label htmlFor="email" style={{
              display: 'block',
              marginBottom: '5px',
              fontWeight: '500',
              color: '#e2e8f0'
            }}>
              Email
            </label>
            <input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #475569',
                borderRadius: '5px',
                fontSize: '14px',
                boxSizing: 'border-box',
                background: '#0f172a',
                color: '#f1f5f9'
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label htmlFor="displayName" style={{
              display: 'block',
              marginBottom: '5px',
              fontWeight: '500',
              color: '#e2e8f0'
            }}>
              Display Name
            </label>
            <input
              id="displayName"
              type="text"
              value={formData.displayName}
              onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
              required
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #475569',
                borderRadius: '5px',
                fontSize: '14px',
                boxSizing: 'border-box',
                background: '#0f172a',
                color: '#f1f5f9'
              }}
            />
          </div>

          <div style={{ marginBottom: '25px' }}>
            <label htmlFor="password" style={{
              display: 'block',
              marginBottom: '5px',
              fontWeight: '500',
              color: '#e2e8f0'
            }}>
              Password
            </label>
            <input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #475569',
                borderRadius: '5px',
                fontSize: '14px',
                boxSizing: 'border-box',
                background: '#0f172a',
                color: '#f1f5f9'
              }}
            />
          </div>

          {error && (
            <div style={{
              padding: '10px',
              marginBottom: '15px',
              background: '#7f1d1d',
              color: '#fecaca',
              borderRadius: '5px',
              fontSize: '14px',
              border: '1px solid #991b1b'
            }}>
              {error}
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            disabled={loading}
            fullWidth
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </Button>

          <p style={{
            textAlign: 'center',
            marginTop: '20px',
            color: '#94a3b8',
            fontSize: '14px',
          }}>
            Already have an account?{' '}
            <a
              href="/system/login"
              style={{
                color: '#3b82f6',
                textDecoration: 'none',
              }}
            >
              Sign in
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}
