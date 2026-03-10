import { Navigate } from 'react-router-dom';
import { useCurrentUser } from '../../api/useAuth';

export default function ProtectedRoute({ children }) {
  const { data: user, isLoading } = useCurrentUser();

  if (isLoading) return null;
  if (!user) return <Navigate to="/login" replace />;

  return children;
}
