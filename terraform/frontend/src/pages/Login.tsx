import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { login, isAuthenticated, user } = useAuth();

    useEffect(() => {
        if (isAuthenticated && user) {
            switch (user.role) {
                case 'student': navigate('/browse'); break;
                case 'shopkeeper': navigate('/vendor/dashboard'); break;
                case 'admin': navigate('/admin'); break;
                default: navigate('/browse');
            }
        }
    }, [isAuthenticated, user, navigate]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(email, password);
            const stored = localStorage.getItem('user');
            if (stored) {
                const userData = JSON.parse(stored);
                switch (userData.role) {
                    case 'student': navigate('/browse'); break;
                    case 'shopkeeper': navigate('/vendor/dashboard'); break;
                    case 'admin': navigate('/admin'); break;
                    default: navigate('/');
                }
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Invalid credentials. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen" style={{ fontFamily: "'Poppins', 'Inter', sans-serif", background: '#0F0F14' }}>

            {/* ─── LEFT BRAND PANEL ─── */}
            <div className="hidden lg:flex lg:w-5/12 xl:w-2/5 flex-col items-center justify-center px-12 relative overflow-hidden"
                style={{ background: 'linear-gradient(145deg, #1a1a24 0%, #0F0F14 60%, #1a0a0a 100%)' }}>

                {/* Background floating hearts */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className="absolute text-red-900/20 select-none"
                            style={{
                                left: `${10 + i * 12}%`,
                                top: `${8 + (i % 3) * 30}%`,
                                fontSize: `${20 + i * 8}px`,
                                animation: `float ${3 + i * 0.5}s ease-in-out infinite alternate`,
                                animationDelay: `${i * 0.4}s`
                            }}>❤️</div>
                    ))}
                </div>

                <div className="relative z-10 text-center max-w-xs">
                    {/* Logo circle */}
                    <div className="mx-auto mb-8 w-32 h-32 rounded-full flex items-center justify-center shadow-2xl"
                        style={{ background: 'linear-gradient(135deg, #FF6B57 0%, #FF3B5C 50%, #c0392b 100%)', boxShadow: '0 0 60px rgba(255,107,87,0.35)' }}>
                        <div className="text-center">
                            <div className="text-white font-black text-lg leading-tight tracking-tight">UNI</div>
                            <div className="text-white font-black text-2xl leading-none">❤️</div>
                            <div className="text-white/90 font-bold text-sm leading-tight">HEART</div>
                        </div>
                    </div>

                    {/* App name */}
                    <h1 className="text-4xl font-black mb-1 tracking-tight">
                        <span className="text-white">Uni</span>
                        <span style={{ color: '#FF6B57' }}>Heart</span>
                    </h1>
                    <div style={{ color: '#FF6B57' }} className="text-2xl mb-4">❤️</div>

                    {/* Slogan */}
                    <p className="text-gray-300 text-base leading-relaxed mb-8 font-medium">
                        The Pulse of Campus Life
                    </p>
                    <p className="text-gray-500 text-sm leading-relaxed">
                        Shop local. Connect campus.<br />Live the uni experience.
                    </p>

                    {/* Feature chips */}
                    <div className="flex flex-wrap gap-2 justify-center mt-8">
                        {['🛍️ Campus Shops', '🦸 Hero Delivery', '🎓 Uni Guide', '💜 Student Made'].map(chip => (
                            <span key={chip} className="px-3 py-1.5 rounded-full text-xs font-semibold border"
                                style={{ borderColor: 'rgba(255,107,87,0.35)', color: '#FF6B57', background: 'rgba(255,107,87,0.08)' }}>
                                {chip}
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            {/* ─── RIGHT FORM PANEL ─── */}
            <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden"
                style={{ background: 'linear-gradient(160deg, #12121a 0%, #0d0d14 50%, #130a0a 100%)' }}>

                {/* Subtle radial glow behind form */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full pointer-events-none"
                    style={{ background: 'radial-gradient(circle, rgba(255,107,87,0.08) 0%, transparent 70%)' }} />

                <div className="relative z-10 w-full max-w-md">
                    {/* Mobile logo */}
                    <div className="lg:hidden text-center mb-10">
                        <div className="inline-flex items-center gap-2 mb-2">
                            <span className="text-3xl font-black text-white">Uni</span>
                            <span className="text-3xl font-black" style={{ color: '#FF6B57' }}>Heart</span>
                            <span className="text-2xl">❤️</span>
                        </div>
                        <p className="text-gray-500 text-sm">The Pulse of Campus Life</p>
                    </div>

                    {/* Welcome heading */}
                    <div className="mb-8">
                        <h2 className="text-3xl font-bold text-white mb-2" style={{ letterSpacing: '-0.5px' }}>
                            Welcome back 👋
                        </h2>
                        <p className="text-gray-500 text-sm">Sign in to your Uni-Heart account</p>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="flex items-start gap-3 p-4 mb-6 rounded-xl text-sm border"
                            style={{ background: 'rgba(217,58,58,0.1)', borderColor: 'rgba(217,58,58,0.3)', color: '#ff6b6b' }}>
                            <span className="text-lg">⚠️</span>
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-widest mb-2"
                                style={{ color: '#6E7581' }}>Email Address</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 text-base">✉️</span>
                                <input
                                    type="email"
                                    placeholder="you@university.edu"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="w-full pl-11 pr-4 py-3.5 rounded-xl text-white text-sm outline-none transition-all"
                                    style={{
                                        background: 'rgba(255,255,255,0.04)',
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        fontFamily: 'inherit'
                                    }}
                                    onFocus={e => e.target.style.borderColor = 'rgba(255,107,87,0.5)'}
                                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-widest mb-2"
                                style={{ color: '#6E7581' }}>Password</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 text-base">🔒</span>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="w-full pl-11 pr-12 py-3.5 rounded-xl text-white text-sm outline-none transition-all"
                                    style={{
                                        background: 'rgba(255,255,255,0.04)',
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        fontFamily: 'inherit'
                                    }}
                                    onFocus={e => e.target.style.borderColor = 'rgba(255,107,87,0.5)'}
                                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                                />
                                <button type="button" onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 transition-colors text-sm">
                                    {showPassword ? '🙈' : '👁️'}
                                </button>
                            </div>
                        </div>

                        {/* Sign In Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 rounded-xl font-bold text-white text-sm tracking-wide transition-all mt-2"
                            style={{
                                background: loading ? 'rgba(255,107,87,0.4)' : 'linear-gradient(135deg, #FF6B57 0%, #FF3B5C 100%)',
                                boxShadow: loading ? 'none' : '0 8px 32px rgba(255,107,87,0.35)',
                                transform: 'scale(1)',
                                cursor: loading ? 'not-allowed' : 'pointer'
                            }}
                            onMouseDown={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.98)'; }}
                            onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
                                    Signing in...
                                </span>
                            ) : (
                                <span className="flex items-center justify-center gap-2">
                                    Sign In →
                                </span>
                            )}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="flex items-center gap-3 my-6">
                        <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }}></div>
                        <span className="text-xs" style={{ color: '#6E7581' }}>or</span>
                        <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }}></div>
                    </div>

                    {/* Continue with Email (alternative outline) */}
                    <Link to="/campus-guide"
                        className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl text-sm font-semibold transition-all"
                        style={{
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: '#9ca3af',
                            background: 'rgba(255,255,255,0.02)'
                        }}>
                        🗺️ Explore without an account
                    </Link>

                    {/* Sign Up Link */}
                    <p className="text-center text-sm mt-8" style={{ color: '#6E7581' }}>
                        New to Uni-Heart?{' '}
                        <Link to="/signup" className="font-bold transition-colors" style={{ color: '#FF6B57' }}
                            onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.color = '#ff8875'}
                            onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.color = '#FF6B57'}>
                            Create account
                        </Link>
                    </p>

                    {/* Terms */}
                    <p className="text-center text-xs mt-4" style={{ color: '#3d3d4d' }}>
                        By continuing, you agree to our{' '}
                        <Link to="/terms" className="underline" style={{ color: '#4d4d5d' }}>Terms of Service</Link>
                        {' '}and{' '}
                        <Link to="/privacy" className="underline" style={{ color: '#4d4d5d' }}>Privacy Policy</Link>
                    </p>
                </div>
            </div>

            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap');
                @keyframes float {
                    from { transform: translateY(0px) rotate(0deg); opacity: 0.15; }
                    to { transform: translateY(-20px) rotate(10deg); opacity: 0.25; }
                }
                input::placeholder { color: #3d3d4d; }
                input:-webkit-autofill {
                    -webkit-box-shadow: 0 0 0 100px #12121a inset !important;
                    -webkit-text-fill-color: #fff !important;
                }
            `}</style>
        </div>
    );
};

export default Login;
