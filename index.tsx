import React, { useState, useEffect, FormEvent } from 'react';
import { createRoot } from 'react-dom/client';

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwrXxhHNWtz6a5bNCNNP2xvZorw6SC56neUCmsxVq54b4M8M7XvLUqL092zD054FW1w/exec';
const SESSION_KEY = 'KA_OMS_SESSION';
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

interface User {
  userId: string;
  role: string;
  userName: string;
}

interface Session {
  user: User;
  expiry: number;
}

const App = () => {
  const [view, setView] = useState<'login' | 'forgotPassword' | 'home'>('login');
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  
  // Form state
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    try {
      const storedSession = localStorage.getItem(SESSION_KEY);
      if (storedSession) {
        const session: Session = JSON.parse(storedSession);
        if (session.expiry > Date.now()) {
          setUser(session.user);
          setView('home');
        } else {
          localStorage.removeItem(SESSION_KEY);
        }
      }
    } catch (e) {
      console.error("Failed to parse session", e);
      localStorage.removeItem(SESSION_KEY);
    }
    setIsLoading(false);
  }, []);
  
  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    if (!/^\d{10}$/.test(userId)) {
        setError('User ID must be a 10-digit mobile number.');
        return;
    }
    if (!password) {
        setError('Password is required.');
        return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'cors',
        cache: 'no-cache',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({ action: 'login', userId, password }),
        redirect: 'follow',
      });

      const result = await response.json();

      if (result.success) {
        const session: Session = {
          user: { userId: result.userId, role: result.role, userName: result.userName },
          expiry: Date.now() + SESSION_DURATION_MS,
        };
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));
        setUser(session.user);
        setView('home');
        setPassword('');
      } else {
        let detailedError = result.message || 'An unknown error occurred.';
        if (result.error && result.error.message) {
            detailedError += ` (Details: ${result.error.message})`;
        }
        setError(detailedError);
      }
    } catch (err) {
      setError('Failed to connect to the server. Please check your internet connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: FormEvent) => {
      e.preventDefault();
      if (!email || !/\S+@\S+\.\S+/.test(email)) {
          setError('Please enter a valid email address.');
          return;
      }
      setIsLoading(true);
      setError(null);
      setMessage(null);

      try {
          const response = await fetch(SCRIPT_URL, {
              method: 'POST',
              mode: 'cors',
              cache: 'no-cache',
              headers: {
                  'Content-Type': 'text/plain;charset=utf-8',
              },
              body: JSON.stringify({ action: 'forgotPassword', email }),
              redirect: 'follow',
          });
          const result = await response.json();
          if (result.success) {
              setMessage(result.message);
          } else {
              let detailedError = result.message || 'An unknown error occurred.';
              if (result.error && result.error.message) {
                  detailedError += ` (Details: ${result.error.message})`;
              }
              setError(detailedError);
          }
      } catch (err) {
          setError('Failed to connect to the server.');
      } finally {
          setIsLoading(false);
      }
  };
  
  const handleLogout = () => {
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
    setView('login');
    setUserId('');
    setPassword('');
    setEmail('');
    setError(null);
    setMessage(null);
  };

  const renderLoading = () => (
    <div style={styles.container}>
      <div style={styles.spinner}></div>
      <p>Loading...</p>
    </div>
  );

  const renderLogin = () => (
    <div style={styles.card}>
      <h1 style={styles.title}>KA-OMS</h1>
      <p style={styles.subtitle}>Enamor Order Management</p>
      <form onSubmit={handleLogin} style={styles.form}>
        <div style={styles.inputGroup}>
          <label htmlFor="userId" style={styles.label}>User ID (Mobile)</label>
          <input
            type="tel"
            id="userId"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            style={styles.input}
            placeholder="10-digit mobile number"
            required
            pattern="\d{10}"
            title="User ID must be a 10-digit mobile number."
          />
        </div>
        <div style={styles.inputGroup}>
          <label htmlFor="password" style={styles.label}>Password</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
            placeholder="Enter your password"
            required
          />
        </div>
        {error && <p style={styles.error} aria-live="assertive">{error}</p>}
        <button type="submit" style={styles.button} disabled={isLoading}>
          {isLoading ? <span style={styles.buttonSpinner}></span> : 'Login'}
        </button>
      </form>
      <button 
        onClick={() => { setView('forgotPassword'); setError(null); setMessage(null); }}
        style={styles.linkButton}
      >
        Forgot Password?
      </button>
    </div>
  );
  
  const renderForgotPassword = () => (
    <div style={styles.card}>
      <h1 style={styles.title}>Forgot Password</h1>
      <p style={styles.subtitle}>Enter your email to recover your account.</p>
      <form onSubmit={handleForgotPassword} style={styles.form}>
        <div style={styles.inputGroup}>
          <label htmlFor="email" style={styles.label}>Email Address</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
            placeholder="you@example.com"
            required
          />
        </div>
        {error && <p style={styles.error} aria-live="assertive">{error}</p>}
        {message && <p style={styles.success} aria-live="assertive">{message}</p>}
        <button type="submit" style={styles.button} disabled={isLoading}>
          {isLoading ? <span style={styles.buttonSpinner}></span> : 'Send Recovery Email'}
        </button>
      </form>
      <button 
        onClick={() => { setView('login'); setError(null); setMessage(null); }}
        style={styles.linkButton}
      >
        &larr; Back to Login
      </button>
    </div>
  );
  
  const renderHome = () => (
    <div style={styles.card}>
       <h1 style={styles.title}>Welcome, {user?.userName}</h1>
       <p style={styles.subtitle}>Homepage - Coming Soon!</p>
       <button onClick={handleLogout} style={{...styles.button, backgroundColor: '#666'}}>Logout</button>
    </div>
  );

  if (isLoading && !user) {
      return renderLoading();
  }
  
  let content;
  if (view === 'login') {
      content = renderLogin();
  } else if (view === 'forgotPassword') {
      content = renderForgotPassword();
  } else {
      content = renderHome();
  }

  return (
    <main>
        {content}
    </main>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
    card: {
        backgroundColor: '#fff',
        padding: '2rem',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
        textAlign: 'center',
        width: '100%',
        boxSizing: 'border-box',
    },
    title: {
        margin: '0 0 0.5rem 0',
        color: 'var(--primary-color)',
        fontWeight: 600,
    },
    subtitle: {
        margin: '0 0 2rem 0',
        color: '#666',
        fontSize: '0.9rem',
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
    },
    inputGroup: {
        textAlign: 'left',
    },
    label: {
        display: 'block',
        marginBottom: '0.5rem',
        fontSize: '0.875rem',
        fontWeight: 500,
    },
    input: {
        width: '100%',
        padding: '0.75rem',
        border: '1px solid var(--border-color)',
        borderRadius: '8px',
        fontSize: '1rem',
        boxSizing: 'border-box',
        transition: 'border-color 0.2s, box-shadow 0.2s',
    },
    button: {
        width: '100%',
        padding: '0.85rem',
        border: 'none',
        borderRadius: '8px',
        backgroundColor: 'var(--primary-color)',
        color: '#fff',
        fontSize: '1rem',
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'background-color 0.2s',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '48px',
    },
    linkButton: {
        background: 'none',
        border: 'none',
        color: 'var(--primary-color)',
        cursor: 'pointer',
        marginTop: '1.5rem',
        fontSize: '0.9rem',
        fontWeight: 500,
        fontFamily: 'inherit',
    },
    error: {
        color: 'var(--error-color)',
        backgroundColor: 'rgba(211, 47, 47, 0.1)',
        padding: '0.75rem',
        borderRadius: '8px',
        fontSize: '0.875rem',
        textAlign: 'center',
        margin: '0',
    },
    success: {
        color: 'var(--success-color)',
        backgroundColor: 'rgba(56, 142, 60, 0.1)',
        padding: '0.75rem',
        borderRadius: '8px',
        fontSize: '0.875rem',
        textAlign: 'center',
        margin: '0',
    },
    container: {
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: 'calc(100vh - 2rem)',
    },
    spinner: {
        border: '4px solid rgba(0, 0, 0, 0.1)',
        width: '36px',
        height: '36px',
        borderRadius: '50%',
        borderLeftColor: 'var(--primary-color)',
        animation: 'spin 1s ease infinite',
        marginBottom: '1rem',
    },
    buttonSpinner: {
        border: '3px solid rgba(255, 255, 255, 0.3)',
        width: '20px',
        height: '20px',
        borderRadius: '50%',
        borderLeftColor: '#fff',
        animation: 'spin 1s ease infinite',
    },
};

const styleSheet = document.createElement("style");
styleSheet.type = "text/css";
styleSheet.innerText = `@keyframes spin { to { transform: rotate(360deg); } }
  input:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 3px var(--secondary-color);
  }
  button:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
  button:hover:not(:disabled) {
    opacity: 0.9;
  }
`;
document.head.appendChild(styleSheet);


const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<React.StrictMode><App /></React.StrictMode>);
}