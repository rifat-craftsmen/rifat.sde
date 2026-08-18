import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function ProtectedRoute({ children }) {
  const { isLoggedIn } = useAuth();
  const location = useLocation();

  if (!isLoggedIn) {
    // Pass the attempted URL in router state so DemoApp can redirect back after login
    return <Navigate to="/demo" state={{ from: location.pathname }} replace />;
  }

  return children;
}

export default ProtectedRoute;
