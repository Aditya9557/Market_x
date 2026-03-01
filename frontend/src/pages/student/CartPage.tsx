import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import API from '../../api/axios';

interface CartItem {
    product: {
        _id: string; name: string; price: number;
        images: string[]; inventory: number;
        store: { _id: string; name: string };
        category?: string;
    };
    quantity: number;
    priceAtAdd: number;
}
interface Cart { _id: string; items: CartItem[]; }

const catEmoji: Record<string, string> = {
    food: '🍔', books: '📚', stationery: '✏️',
    electronics: '💻', clothing: '👕', services: '⚙️', other: '📦'
};

const CartPage = () => {
    const [cart, setCart] = useState<Cart | null>(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState<string | null>(null);
    const navigate = useNavigate();

    const fetchCart = async () => {
        try { const { data } = await API.get('/cart'); setCart(data); }
        catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchCart(); }, []);

    const updateQty = async (productId: string, quantity: number) => {
        setUpdating(productId);
        try { const { data } = await API.put('/cart/update', { productId, quantity }); setCart(data); }
        catch (err: any) { alert(err.response?.data?.message || 'Failed to update'); }
        finally { setUpdating(null); }
    };

    const removeItem = async (productId: string) => {
        setUpdating(productId);
        try { await API.delete(`/cart/remove/${productId}`); await fetchCart(); }
        catch (err) { console.error(err); }
        finally { setUpdating(null); }
    };

    const clearCart = async () => {
        try { await API.delete('/cart/clear'); await fetchCart(); }
        catch (err) { console.error(err); }
    };

    if (loading) return (
        <div className="flex justify-center items-center py-32">
            <div className="uh-spinner" />
        </div>
    );

    const items = cart?.items || [];
    const total = items.reduce((s, i) => s + i.product.price * i.quantity, 0);
    const grouped = items.reduce((acc, item) => {
        const id = item.product.store?._id || 'unknown';
        const name = item.product.store?.name || 'Unknown Store';
        if (!acc[id]) acc[id] = { name, items: [] };
        acc[id].items.push(item);
        return acc;
    }, {} as Record<string, { name: string; items: CartItem[] }>);

    return (
        <div className="uh-page max-w-4xl mx-auto px-6 py-8">
            <div className="mb-6">
                <h1 className="text-3xl font-black text-white mb-1" style={{ letterSpacing: '-0.5px' }}>Your Cart 🛒</h1>
                <p className="text-sm" style={{ color: 'var(--uh-text-muted)' }}>
                    {items.length} item{items.length !== 1 ? 's' : ''} from {Object.keys(grouped).length} shop{Object.keys(grouped).length !== 1 ? 's' : ''}
                </p>
            </div>

            {items.length === 0 ? (
                <div className="uh-card text-center py-20">
                    <p className="text-6xl mb-4">🛒</p>
                    <p className="text-xl font-bold text-white mb-2">Your cart is empty</p>
                    <p className="text-sm mb-8" style={{ color: 'var(--uh-text-muted)' }}>Discover products from campus shops</p>
                    <Link to="/browse" className="uh-btn-primary px-8 py-3 inline-block">
                        Browse Products
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Items */}
                    <div className="lg:col-span-2 space-y-4">
                        {Object.entries(grouped).map(([storeId, group]) => (
                            <div key={storeId} className="uh-card overflow-hidden">
                                {/* Store header */}
                                <div className="px-5 py-3 flex items-center gap-2"
                                    style={{ borderBottom: '1px solid var(--uh-card-border)', background: 'rgba(255,107,87,0.05)' }}>
                                    <span className="text-lg">🏪</span>
                                    <span className="text-sm font-bold" style={{ color: 'var(--uh-coral)' }}>{group.name}</span>
                                </div>

                                {group.items.map((item, idx) => (
                                    <div key={item.product._id}
                                        className="flex items-center px-5 py-4 gap-4"
                                        style={{ borderBottom: idx < group.items.length - 1 ? '1px solid var(--uh-card-border)' : 'none' }}>
                                        {/* Product icon */}
                                        <div className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl shrink-0"
                                            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--uh-card-border)' }}>
                                            {catEmoji[item.product.category || 'other'] || '📦'}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <p className="text-white font-semibold text-sm truncate">{item.product.name}</p>
                                            <p className="text-sm font-bold mt-0.5" style={{ color: 'var(--uh-green)' }}>
                                                ₹{item.product.price.toFixed(0)}
                                            </p>
                                        </div>

                                        {/* Quantity controls */}
                                        <div className="flex items-center gap-2 shrink-0">
                                            <div className="flex items-center rounded-xl overflow-hidden"
                                                style={{ border: '1px solid var(--uh-card-border)' }}>
                                                <button onClick={() => updateQty(item.product._id, item.quantity - 1)}
                                                    disabled={updating === item.product._id}
                                                    className="w-8 h-8 flex items-center justify-center text-white transition-all hover:bg-white/10 text-lg font-bold">
                                                    −
                                                </button>
                                                <span className="w-9 h-8 flex items-center justify-center text-white text-sm font-bold"
                                                    style={{ background: 'rgba(255,255,255,0.04)' }}>
                                                    {updating === item.product._id
                                                        ? <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                                        : item.quantity}
                                                </span>
                                                <button onClick={() => updateQty(item.product._id, item.quantity + 1)}
                                                    disabled={updating === item.product._id}
                                                    className="w-8 h-8 flex items-center justify-center text-white transition-all hover:bg-white/10 text-lg font-bold">
                                                    +
                                                </button>
                                            </div>
                                            <button onClick={() => removeItem(item.product._id)}
                                                className="w-8 h-8 flex items-center justify-center rounded-lg transition-all text-base"
                                                style={{ color: 'var(--uh-error)' }}
                                                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(217,58,58,0.1)'}
                                                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                                                🗑️
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ))}

                        <button onClick={clearCart}
                            className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
                            style={{ color: 'var(--uh-error)', border: '1px solid rgba(217,58,58,0.2)', background: 'rgba(217,58,58,0.05)' }}>
                            🗑️ Clear Cart
                        </button>
                    </div>

                    {/* Summary */}
                    <div className="uh-card p-6 h-fit sticky top-4">
                        <h3 className="text-lg font-bold text-white mb-5">Order Summary</h3>
                        <div className="space-y-3 text-sm mb-5">
                            <div className="flex justify-between" style={{ color: 'var(--uh-text-muted)' }}>
                                <span>Subtotal ({items.length} items)</span>
                                <span>₹{total.toFixed(0)}</span>
                            </div>
                            <div className="flex justify-between" style={{ color: 'var(--uh-text-muted)' }}>
                                <span>Delivery / Pickup</span>
                                <span className="text-xs" style={{ color: 'var(--uh-coral)' }}>Choose at checkout</span>
                            </div>
                            <div className="uh-divider" />
                            <div className="flex justify-between text-white font-black text-lg">
                                <span>Total</span>
                                <span style={{ color: 'var(--uh-green)' }}>₹{total.toFixed(0)}</span>
                            </div>
                        </div>

                        <p className="text-xs mb-4" style={{ color: 'var(--uh-text-muted)' }}>
                            📦 Orders from {Object.keys(grouped).length} shop(s) will be split at checkout
                        </p>

                        <button onClick={() => navigate('/checkout')}
                            className="uh-btn-primary w-full py-3.5">
                            Proceed to Checkout →
                        </button>

                        <Link to="/browse"
                            className="uh-btn-ghost w-full py-2.5 mt-3 text-sm text-center block">
                            ← Continue Shopping
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CartPage;
