import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import API from '../../api/axios';

interface Product {
    _id: string; name: string; description: string;
    price: number; compareAtPrice?: number; inventory: number;
    category: string; images: string[];
    store: { _id: string; name: string; category: string; settings: any };
    tags: string[];
}

const catEmoji: Record<string, string> = {
    food: '🍔', books: '📚', stationery: '✏️',
    electronics: '💻', clothing: '👕', services: '⚙️', other: '📦'
};

const ProductDetail = () => {
    const { id } = useParams();
    const [product, setProduct] = useState<Product | null>(null);
    const [loading, setLoading] = useState(true);
    const [quantity, setQuantity] = useState(1);
    const [adding, setAdding] = useState(false);
    const [toast, setToast] = useState('');
    const [currentImageIdx, setCurrentImageIdx] = useState(0);

    useEffect(() => {
        const fetch = async () => {
            try { const { data } = await API.get(`/products/${id}`); setProduct(data); }
            catch (err) { console.error('Error:', err); }
            finally { setLoading(false); }
        };
        fetch();
    }, [id]);

    const addToCart = async () => {
        if (!product) return;
        setAdding(true);
        try {
            await API.post('/cart/add', { productId: product._id, quantity });
            setToast('✅ Added to cart!');
            setTimeout(() => setToast(''), 3000);
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to add');
        } finally { setAdding(false); }
    };

    if (loading) return <div className="flex justify-center items-center py-32"><div className="uh-spinner" /></div>;

    if (!product) return (
        <div className="uh-card text-center py-20 max-w-md mx-auto mt-16">
            <p className="text-5xl mb-4">😞</p>
            <p className="text-xl font-bold text-white mb-4">Product not found</p>
            <Link to="/browse" className="uh-btn-outline px-6 py-2.5 inline-block">← Back to Browse</Link>
        </div>
    );

    const emoji = catEmoji[product.category] || '📦';
    const hasDiscount = product.compareAtPrice && product.compareAtPrice > product.price;
    const discountPct = hasDiscount ? Math.round((1 - product.price / product.compareAtPrice!) * 100) : 0;

    return (
        <div className="uh-page max-w-4xl mx-auto px-6 py-8">
            {/* Toast */}
            {toast && <div className="uh-toast success">{toast}</div>}

            <Link to="/browse" className="uh-btn-ghost px-4 py-2 text-sm inline-block mb-6">
                ← Back to Browse
            </Link>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Product Image Panel */}
                <div className="uh-card overflow-hidden flex flex-col">
                    <div className="h-72 flex items-center justify-center text-9xl relative"
                        style={{ background: 'linear-gradient(135deg, rgba(255,107,87,0.06) 0%, rgba(15,157,88,0.04) 100%)' }}>

                        {product.images?.length > 0 ? (
                            <img src={product.images[currentImageIdx]} alt={product.name} className="w-full h-full object-cover" />
                        ) : (
                            emoji
                        )}

                        {product.images?.length > 1 && (
                            <>
                                <button onClick={() => setCurrentImageIdx((prev: number) => (prev === 0 ? product.images.length - 1 : prev - 1))}
                                    className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white flex justify-center items-center hover:bg-black/80 transition">
                                    ←
                                </button>
                                <button onClick={() => setCurrentImageIdx((prev: number) => (prev === product.images.length - 1 ? 0 : prev + 1))}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white flex justify-center items-center hover:bg-black/80 transition">
                                    →
                                </button>
                                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 bg-black/40 px-2 py-1 rounded-full">
                                    {product.images.map((_, i) => (
                                        <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all ${i === currentImageIdx ? 'bg-white w-3' : 'bg-white/50 cursor-pointer'}`} onClick={() => setCurrentImageIdx(i)} />
                                    ))}
                                </div>
                            </>
                        )}

                    </div>
                    {/* Category + tags strip */}
                    <div className="p-4 flex flex-wrap gap-2">
                        <span className="uh-badge-green text-xs capitalize">{emoji} {product.category}</span>
                        {product.tags?.map(tag => (
                            <span key={tag} className="text-xs px-2 py-0.5 rounded-full"
                                style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--uh-text-muted)', border: '1px solid var(--uh-card-border)' }}>
                                #{tag}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Details */}
                <div className="flex flex-col gap-4">
                    <div>
                        <h1 className="text-2xl font-black text-white mb-2" style={{ letterSpacing: '-0.3px' }}>
                            {product.name}
                        </h1>

                        {/* Price */}
                        <div className="flex items-center gap-3 mb-1">
                            <span className="text-3xl font-black" style={{ color: 'var(--uh-green)' }}>
                                ₹{product.price.toFixed(0)}
                            </span>
                            {hasDiscount && (
                                <>
                                    <span className="text-lg line-through" style={{ color: 'var(--uh-text-faint)' }}>
                                        ₹{product.compareAtPrice!.toFixed(0)}
                                    </span>
                                    <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                                        style={{ background: 'rgba(255,107,87,0.12)', color: 'var(--uh-coral)', border: '1px solid rgba(255,107,87,0.25)' }}>
                                        {discountPct}% OFF
                                    </span>
                                </>
                            )}
                        </div>

                        {/* Stock status */}
                        <p className="text-sm font-bold" style={{ color: product.inventory > 0 ? 'var(--uh-green)' : 'var(--uh-error)' }}>
                            {product.inventory > 0
                                ? `✅ ${product.inventory} in stock`
                                : '❌ Out of stock'}
                        </p>
                    </div>

                    {/* Description */}
                    {product.description && (
                        <p className="text-sm leading-relaxed" style={{ color: 'var(--uh-text-muted)' }}>
                            {product.description}
                        </p>
                    )}

                    {/* Store Info */}
                    <div className="rounded-xl p-4"
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--uh-card-border)' }}>
                        <p className="uh-label mb-1">Sold by</p>
                        <p className="text-white font-bold">{product.store?.name || 'Unknown Store'}</p>
                        {product.store?.settings?.deliveryRadius && (
                            <p className="text-xs mt-1" style={{ color: 'var(--uh-text-muted)' }}>
                                📍 Delivery radius: {product.store.settings.deliveryRadius} km
                            </p>
                        )}
                    </div>

                    {/* Quantity + Add to Cart */}
                    {product.inventory > 0 && (
                        <div className="flex items-center gap-3 mt-auto">
                            {/* Qty stepper */}
                            <div className="flex items-center rounded-xl overflow-hidden"
                                style={{ border: '1px solid var(--uh-card-border)' }}>
                                <button
                                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                                    className="w-10 h-10 flex items-center justify-center text-lg font-bold transition-all"
                                    style={{ background: 'rgba(255,255,255,0.04)', color: quantity <= 1 ? 'var(--uh-text-faint)' : 'var(--uh-coral)' }}>
                                    −
                                </button>
                                <span className="w-10 text-center text-sm font-bold text-white"
                                    style={{ borderLeft: '1px solid var(--uh-card-border)', borderRight: '1px solid var(--uh-card-border)', padding: '0.5rem 0' }}>
                                    {quantity}
                                </span>
                                <button
                                    onClick={() => setQuantity(q => Math.min(product.inventory, q + 1))}
                                    className="w-10 h-10 flex items-center justify-center text-lg font-bold transition-all"
                                    style={{ background: 'rgba(255,255,255,0.04)', color: quantity >= product.inventory ? 'var(--uh-text-faint)' : 'var(--uh-coral)' }}>
                                    +
                                </button>
                            </div>

                            <button onClick={addToCart} disabled={adding} className="uh-btn-primary flex-1 py-3">
                                {adding
                                    ? <span className="flex items-center justify-center gap-2">
                                        <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Adding...
                                    </span>
                                    : '🛒 Add to Cart'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProductDetail;
