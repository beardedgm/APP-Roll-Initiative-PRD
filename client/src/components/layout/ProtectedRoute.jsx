import { Navigate } from 'react-router-dom';
import { useCurrentUser } from '../../api/useAuth';

export default function ProtectedRoute({ children }) {
  const { data: user, isLoading } = useCurrentUser();

  if (isLoading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <span aria-label="Loading">Loading...</span>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;

  return children;
}
