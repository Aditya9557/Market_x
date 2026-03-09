import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import API from '../api/axios';

interface StoreInfo {
    _id: string;
    name: string;
    status: string;
}

interface User {
    _id: string;
    name: string;
    email: string;
    role: 'student' | 'shopkeeper' | 'admin' | 'hero';
    status: string;
    store?: StoreInfo;
    token: string;
    locationServicesEnabled?: boolean;
    currentLocation?: {
        type: string;
        coordinates: [number, number];
    };
}

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    role: string | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    signup: (data: SignupData) => Promise<void>;
    logout: () => void;
}

interface SignupData {
    name: string;
    email: string;
    password: string;
    role: string;
    shopName?: string;
    description?: string;
    category?: string;
    zone?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    // Restore user from localStorage on mount
    useEffect(() => {
        const stored = localStorage.getItem('user');
        const token = localStorage.getItem('token');
        if (stored && token) {
            try {
                setUser(JSON.parse(stored));
            } catch {
                localStorage.removeItem('user');
                localStorage.removeItem('token');
            }
        }
        setLoading(false);
    }, []);

    const login = async (email: string, password: string) => {
        const { data } = await API.post('/auth/login', { email, password });
        const userData: User = {
            _id: data._id,
            name: data.name,
            email: data.email,
            role: data.role,
            status: data.status,
            store: data.store,
            token: data.token
        };
        localStorage.setItem('token', data.token);
        if (data.refreshToken) {
            localStorage.setItem('refreshToken', data.refreshToken);
        }
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
    };

    const signup = async (data: SignupData) => {
        const { data: resData } = await API.post('/auth/signup', data);
        const userData: User = {
            _id: resData._id,
            name: resData.name,
            email: resData.email,
            role: resData.role,
            status: resData.status,
            store: resData.store,
            token: resData.token
        };
        localStorage.setItem('token', resData.token);
        if (resData.refreshToken) {
            localStorage.setItem('refreshToken', resData.refreshToken);
        }
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{
            user,
            isAuthenticated: !!user,
            role: user?.role || null,
            loading,
            login,
            signup,
            logout
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
