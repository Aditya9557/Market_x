import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Signup = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('student');
    const [shopName, setShopName] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('other');
    const [zone, setZone] = useState('other');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { signup } = useAuth();

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await signup({
                name, email, password, role,
                shopName: (role === 'shopkeeper' || role === 'seller') ? shopName : undefined,
                description: role === 'seller' ? description : undefined,
                category: role === 'seller' ? category : undefined,
                zone: role === 'seller' ? zone : undefined
            });
            if (role === 'shopkeeper' || role === 'seller') navigate('/vendor/dashboard');
            else navigate('/browse');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Signup failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const roles = [
        { id: 'student', label: '🎓 Student', desc: 'Shop, order & deliver' },
        { id: 'shopkeeper', label: '🏪 Shopkeeper', desc: 'Sell on campus' },
        { id: 'seller', label: '🎨 Student Seller', desc: 'Virtual shop owner' },
    ];

    return (
        <div className="flex min-h-screen" style={{ fontFamily: "'Poppins', 'Inter', sans-serif", background: '#0F0F14' }}>

            {/* ─── LEFT BRAND PANEL ─── */}
            <div className="hidden lg:flex lg:w-5/12 xl:w-2/5 flex-col items-center justify-center px-12 relative overflow-hidden"
                style={{ background: 'linear-gradient(145deg, #1a1a24 0%, #0F0F14 60%, #1a0a0a 100%)' }}>

                {/* Floating hearts bg */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className="absolute text-red-900/20 select-none"
                            style={{
                                left: `${10 + i * 12}%`, top: `${8 + (i % 3) * 30}%`,
                                fontSize: `${20 + i * 8}px`,
                                animation: `float ${3 + i * 0.5}s ease-in-out infinite alternate`,
                                animationDelay: `${i * 0.4}s`
                            }}>❤️</div>
                    ))}
                </div>

                <div className="relative z-10 text-center max-w-xs">
                    <div className="mx-auto mb-8 w-32 h-32 rounded-full flex items-center justify-center shadow-2xl"
                        style={{ background: 'linear-gradient(135deg, #FF6B57 0%, #FF3B5C 50%, #c0392b 100%)', boxShadow: '0 0 60px rgba(255,107,87,0.35)' }}>
                        <div className="text-center">
                            <div className="text-white font-black text-lg leading-tight">UNI</div>
                            <div className="text-white font-black text-2xl leading-none">❤️</div>
                            <div className="text-white/90 font-bold text-sm leading-tight">HEART</div>
                        </div>
                    </div>

                    <h1 className="text-4xl font-black mb-1 tracking-tight">
                        <span className="text-white">Uni</span>
                        <span style={{ color: '#FF6B57' }}>Heart</span>
                    </h1>
                    <div style={{ color: '#FF6B57' }} className="text-2xl mb-4">❤️</div>
                    <p className="text-gray-300 text-base leading-relaxed mb-4 font-medium">The Pulse of Campus Life</p>
                    <p className="text-gray-500 text-sm leading-relaxed">Join thousands of students,<br />sellers &amp; heroes on campus.</p>

                    <div className="mt-10 space-y-3 text-left">
                        {[
                            { icon: '🛍️', title: 'Shop Local', desc: 'Discover campus shops & virtual stores' },
                            { icon: '🦸', title: 'Hero Deliveries', desc: 'Fast on-campus delivery by student heroes' },
                            { icon: '🎓', title: 'Uni Guide', desc: 'Navigate campus zones & find everything' },
                        ].map(f => (
                            <div key={f.title} className="flex items-start gap-3 p-3 rounded-xl"
                                style={{ background: 'rgba(255,107,87,0.06)', border: '1px solid rgba(255,107,87,0.12)' }}>
                                <span className="text-xl">{f.icon}</span>
                                <div>
                                    <p className="text-white text-sm font-semibold">{f.title}</p>
                                    <p className="text-gray-500 text-xs">{f.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ─── RIGHT FORM PANEL ─── */}
            <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 relative overflow-hidden"
                style={{ background: 'linear-gradient(160deg, #12121a 0%, #0d0d14 50%, #130a0a 100%)' }}>

                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full pointer-events-none"
                    style={{ background: 'radial-gradient(circle, rgba(255,107,87,0.07) 0%, transparent 70%)' }} />

                <div className="relative z-10 w-full max-w-md">
                    {/* Mobile logo */}
                    <div className="lg:hidden text-center mb-8">
                        <div className="inline-flex items-center gap-2 mb-1">
                            <span className="text-3xl font-black text-white">Uni</span>
                            <span className="text-3xl font-black" style={{ color: '#FF6B57' }}>Heart</span>
                            <span className="text-2xl">❤️</span>
                        </div>
                        <p className="text-gray-500 text-sm">The Pulse of Campus Life</p>
                    </div>

                    <div className="mb-6">
                        <h2 className="text-3xl font-bold text-white mb-1" style={{ letterSpacing: '-0.5px' }}>
                            Create account ✨
                        </h2>
                        <p className="text-gray-500 text-sm">Join the Uni-Heart campus community</p>
                    </div>

                    {error && (
                        <div className="flex items-start gap-3 p-4 mb-5 rounded-xl text-sm border"
                            style={{ background: 'rgba(217,58,58,0.1)', borderColor: 'rgba(217,58,58,0.3)', color: '#ff6b6b' }}>
                            <span>⚠️</span><span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSignup} className="space-y-4">
                        {/* Role Selector */}
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#6E7581' }}>I am a...</label>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {roles.map(r => (
                                    <button key={r.id} type="button" onClick={() => setRole(r.id)}
                                        className="py-3 px-2 rounded-xl text-xs font-semibold transition-all text-center"
                                        style={{
                                            background: role === r.id ? 'rgba(255,107,87,0.15)' : 'rgba(255,255,255,0.03)',
                                            border: role === r.id ? '1px solid rgba(255,107,87,0.5)' : '1px solid rgba(255,255,255,0.07)',
                                            color: role === r.id ? '#FF6B57' : '#6E7581',
                                            boxShadow: role === r.id ? '0 0 20px rgba(255,107,87,0.15)' : 'none'
                                        }}>
                                        <div className="text-lg mb-0.5">{r.label.split(' ')[0]}</div>
                                        <div className="font-bold">{r.label.split(' ').slice(1).join(' ')}</div>
                                        <div className="text-xs opacity-70 mt-0.5 leading-tight">{r.desc}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Full Name */}
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#6E7581' }}>Full Name</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600">👤</span>
                                <input type="text" placeholder="Your full name" value={name} onChange={e => setName(e.target.value)} required
                                    className="w-full pl-11 pr-4 py-3.5 rounded-xl text-white text-sm outline-none transition-all"
                                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', fontFamily: 'inherit' }}
                                    onFocus={e => e.target.style.borderColor = 'rgba(255,107,87,0.5)'}
                                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'} />
                            </div>
                        </div>

                        {/* Shop Name (shopkeeper & seller) */}
                        {(role === 'shopkeeper' || role === 'seller') && (
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#6E7581' }}>Shop Name</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600">🏪</span>
                                    <input type="text" placeholder={role === 'seller' ? "My Virtual Store" : "My Campus Shop"} value={shopName} onChange={e => setShopName(e.target.value)} required
                                        className="w-full pl-11 pr-4 py-3.5 rounded-xl text-white text-sm outline-none transition-all"
                                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', fontFamily: 'inherit' }}
                                        onFocus={e => e.target.style.borderColor = 'rgba(255,107,87,0.5)'}
                                        onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'} />
                                </div>
                            </div>
                        )}

                        {/* Additional fields for Student Seller */}
                        {role === 'seller' && (
                            <>
                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#6E7581' }}>Description</label>
                                    <textarea placeholder="What are you selling? (e.g., Handmade crafts, digital notes)" value={description} onChange={e => setDescription(e.target.value)} required rows={2}
                                        className="w-full px-4 py-3.5 rounded-xl text-white text-sm outline-none transition-all resize-none"
                                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', fontFamily: 'inherit' }}
                                        onFocus={e => e.target.style.borderColor = 'rgba(255,107,87,0.5)'}
                                        onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}></textarea>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#6E7581' }}>Product Category</label>
                                        <select value={category} onChange={e => setCategory(e.target.value)}
                                            className="w-full px-4 py-3.5 rounded-xl text-white text-sm outline-none transition-all"
                                            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', fontFamily: 'inherit', appearance: 'none' }}>
                                            <option value="other" style={{ color: 'black' }}>🎨 Crafts & Art</option>
                                            <option value="clothing" style={{ color: 'black' }}>👕 Fashion</option>
                                            <option value="services" style={{ color: 'black' }}>⚙️ Services/Notes</option>
                                            <option value="food" style={{ color: 'black' }}>🍔 Homemade Food</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#6E7581' }}>Pickup Zone</label>
                                        <select value={zone} onChange={e => setZone(e.target.value)}
                                            className="w-full px-4 py-3.5 rounded-xl text-white text-sm outline-none transition-all"
                                            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', fontFamily: 'inherit', appearance: 'none' }}>
                                            <option value="hostel_area" style={{ color: 'black' }}>Hostel Area</option>
                                            <option value="academic_block" style={{ color: 'black' }}>Academic Block</option>
                                            <option value="food_court" style={{ color: 'black' }}>Food Court</option>
                                            <option value="other" style={{ color: 'black' }}>Other</option>
                                        </select>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Email */}
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#6E7581' }}>Email Address</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600">✉️</span>
                                <input type="email" placeholder="you@university.edu" value={email} onChange={e => setEmail(e.target.value)} required
                                    className="w-full pl-11 pr-4 py-3.5 rounded-xl text-white text-sm outline-none transition-all"
                                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', fontFamily: 'inherit' }}
                                    onFocus={e => e.target.style.borderColor = 'rgba(255,107,87,0.5)'}
                                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'} />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#6E7581' }}>Password</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600">🔒</span>
                                <input type={showPassword ? 'text' : 'password'} placeholder="Min. 8 characters" value={password} onChange={e => setPassword(e.target.value)} required
                                    className="w-full pl-11 pr-12 py-3.5 rounded-xl text-white text-sm outline-none transition-all"
                                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', fontFamily: 'inherit' }}
                                    onFocus={e => e.target.style.borderColor = 'rgba(255,107,87,0.5)'}
                                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'} />
                                <button type="button" onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 transition-colors text-sm">
                                    {showPassword ? '🙈' : '👁️'}
                                </button>
                            </div>
                        </div>

                        {/* Admin note for shopkeeper & seller */}
                        {(role === 'shopkeeper' || role === 'seller') && (
                            <div className="flex items-start gap-2 p-3 rounded-xl text-xs"
                                style={{ background: 'rgba(255,204,0,0.08)', border: '1px solid rgba(255,204,0,0.2)', color: '#FFCC00' }}>
                                <span>⏳</span>
                                <span>Your shop requires admin approval before being visible to customers.</span>
                            </div>
                        )}



                        {/* Submit Button */}
                        <button type="submit" disabled={loading}
                            className="w-full py-4 rounded-xl font-bold text-white text-sm tracking-wide transition-all mt-1"
                            style={{
                                background: loading ? 'rgba(255,107,87,0.4)' : 'linear-gradient(135deg, #FF6B57 0%, #FF3B5C 100%)',
                                boxShadow: loading ? 'none' : '0 8px 32px rgba(255,107,87,0.35)',
                                cursor: loading ? 'not-allowed' : 'pointer'
                            }}
                            onMouseDown={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.98)'; }}
                            onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}>
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
                                    Creating account...
                                </span>
                            ) : (
                                `Join Uni-Heart ${role === 'shopkeeper' ? '🏪' : role === 'seller' ? '🎨' : '🎓'}`
                            )}
                        </button>
                    </form>

                    <p className="text-center text-sm mt-6" style={{ color: '#6E7581' }}>
                        Already have an account?{' '}
                        <Link to="/login" className="font-bold" style={{ color: '#FF6B57' }}>Sign in</Link>
                    </p>

                    <p className="text-center text-xs mt-4" style={{ color: '#3d3d4d' }}>
                        By joining, you agree to our{' '}
                        <Link to="/terms" className="underline" style={{ color: '#4d4d5d' }}>Terms</Link>
                        {' '}&amp;{' '}
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

export default Signup;
