import { useAuth } from '../context/AuthContext';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';

function DemoApp() {
  const { isLoggedIn, token, login, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // ProtectedRoute sets state.from to the URL the user originally tried to visit
  const intendedPath = location.state?.from ?? null;
  const [email, setEmail] = useState('demo@example.com');
  const [password, setPassword] = useState('password123');
  const [loginError, setLoginError] = useState('');

  const handleLogin = async () => {
    const { ok, error } = await login(email, password);
    if (!ok) {
      setLoginError(error ?? 'Login failed');
    } else {
      setLoginError('');
      // Navigate back to the page the user was trying to reach, or stay on /demo
      navigate(intendedPath ?? '/demo', { replace: true });
    }
  };

  return (
    <div>
      <h1>🎮 Demo App: Authentication + Protected Area</h1>
      <div style={styles.card}>
        {!isLoggedIn ? (
          <div style={styles.loginBox}>
            <h3>Login</h3>
            <p>Credentials are validated against the backend (demo@example.com / password123)</p>
            {intendedPath && (
              <p style={{ background: '#fff3cd', padding: '0.4rem 0.6rem', borderRadius: '4px', fontSize: '0.85rem' }}>
                You will be redirected to <code>{intendedPath}</code> after login.
              </p>
            )}
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
            />
            <button onClick={handleLogin} style={styles.button}>
              Login
            </button>
            {loginError && <p style={{ color: 'red' }}>{loginError}</p>}
          </div>
        ) : (
          <div>
            <div style={styles.loggedBox}>
              <h3>✅ You are logged in!</h3>
              <p><strong>JWT:</strong> <span style={{ wordBreak: 'break-all', fontSize: '0.8rem' }}>{token}</span></p>
              <button onClick={logout} style={styles.button}>Logout</button>
            </div>

            <hr />
            <h3>Dashboard (accessible to any logged-in user)</h3>
            <div style={styles.dashboard}>
              <p>📊 Welcome to your dashboard. Here is some statistics (demo).</p>
              <p>🔐 Your role: <strong>Trainer</strong></p>
            </div>

            <hr />
            <h3>Admin Section (Protected)</h3>
            <div style={styles.adminLinkBox}>
              <p>Admin page requires authentication (already satisfied).</p>
              <Link to="/admin" style={styles.linkButton}>Go to Admin Panel →</Link>
              <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
                💡 Try manually typing <code>/admin</code> in URL while logged out → redirects here.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  card: { background: '#f8f9fa', padding: '1.5rem', borderRadius: '8px' },
  loginBox: { padding: '1rem', background: '#e9ecef', borderRadius: '6px' },
  loggedBox: { background: '#d4edda', padding: '1rem', borderRadius: '6px' },
  dashboard: { background: '#fff', padding: '1rem', border: '1px solid #dee2e6', borderRadius: '6px' },
  adminLinkBox: { background: '#cfe2ff', padding: '1rem', borderRadius: '6px' },
  input: { display: 'block', margin: '0.5rem 0', padding: '0.5rem', width: '250px' },
  button: { padding: '0.5rem 1rem', cursor: 'pointer', background: '#007bff', color: '#fff', border: 'none', borderRadius: '4px' },
  linkButton: { display: 'inline-block', marginTop: '0.5rem', padding: '0.4rem 0.8rem', background: '#28a745', color: 'white', textDecoration: 'none', borderRadius: '4px' },
};

export default DemoApp;