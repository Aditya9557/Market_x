import type { ReactNode } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
    children: ReactNode;
    allowedRoles?: string[];
}

const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
    const { isAuthenticated, user, loading, logout } = useAuth();
    const navigate = useNavigate();

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-900">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles && user && !allowedRoles.includes(user.role)) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-900">
                <div className="bg-gray-800 p-8 rounded-lg shadow-lg text-center max-w-md">
                    <div className="text-red-400 text-5xl mb-4">🚫</div>
                    <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
                    <p className="text-gray-400 mb-4">
                        Your role ({user.role}) does not have access to this page.
                    </p>
                    <a href="/" className="text-blue-400 hover:text-blue-300 underline">
                        Go Home
                    </a>
                </div>
            </div>
        );
    }

    // For shopkeepers with pending status, show pending screen with Sign Out
    if (user?.role === 'shopkeeper' && user?.status === 'pending') {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-900">
                <div className="bg-gray-800 p-8 rounded-lg shadow-lg text-center max-w-md">
                    <div className="text-yellow-400 text-5xl mb-4">⏳</div>
                    <h2 className="text-2xl font-bold text-white mb-2">Approval Pending</h2>
                    <p className="text-gray-400 mb-4">
                        Your shop is under review by the admin. You'll be able to access your dashboard once approved.
                    </p>
                    <p className="text-gray-500 text-sm mb-6">
                        Store: {user.store?.name || 'N/A'} — Status: <span className="text-yellow-400 font-semibold">Pending</span>
                    </p>
                    <button
                        onClick={() => { logout(); navigate('/login'); }}
                        className="px-6 py-2.5 rounded-xl text-sm font-bold transition-all"
                        style={{
                            background: 'rgba(255,204,0,0.12)',
                            border: '1px solid rgba(255,204,0,0.3)',
                            color: '#FFCC00',
                            cursor: 'pointer'
                        }}
                    >
                        Sign Out
                    </button>
                </div>
            </div>
        );
    }

    return <>{children}</>;
};

export default ProtectedRoute;
