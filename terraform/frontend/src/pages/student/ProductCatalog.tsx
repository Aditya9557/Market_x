import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../../api/axios';

interface Product {
    _id: string;
    name: string;
    description: string;
    price: number;
    compareAtPrice?: number;
    inventory: number;
    category: string;
    images: string[];
    store: { _id: string; name: string; category: string; storeType?: string };
    tags: string[];
}

const catEmoji: Record<string, string> = {
    food: '🍔', books: '📚', stationery: '✏️',
    electronics: '💻', clothing: '👕', services: '⚙️', other: '📦'
};
const categories = ['all', 'food', 'books', 'stationery', 'electronics', 'clothing', 'services', 'other'];

const ProductCatalog = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('all');
    const [storeType, setStoreType] = useState('all');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [addingToCart, setAddingToCart] = useState<string | null>(null);
    const [toast, setToast] = useState('');

    const showToast = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(''), 2500);
    };

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const params: any = { page, limit: 12 };
            if (category !== 'all') params.category = category;
            if (search) params.search = search;
            if (storeType !== 'all') params.storeType = storeType;
            const { data } = await API.get('/products', { params });
            setProducts(data.products);
            setTotalPages(data.totalPages);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchProducts(); }, [category, page, storeType]);
    useEffect(() => {
        const t = setTimeout(() => { setPage(1); fetchProducts(); }, 400);
        return () => clearTimeout(t);
    }, [search]);

    const addToCart = async (productId: string) => {
        setAddingToCart(productId);
        try {
            await API.post('/cart/add', { productId, quantity: 1 });
            showToast('✅ Added to cart!');
        } catch (err: any) {
            showToast('❌ ' + (err.response?.data?.message || 'Failed to add'));
        } finally {
            setAddingToCart(null);
        }
    };

    return (
        <div className="uh-page max-w-7xl mx-auto px-6 py-8">

            {/* Toast */}
            {toast && <div className={`uh-toast ${toast.startsWith('✅') ? 'success' : 'error'}`}>{toast}</div>}

            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-black text-white mb-1" style={{ letterSpacing: '-0.5px' }}>
                    Browse Products
                </h1>
                <p style={{ color: 'var(--uh-text-muted)' }} className="text-sm">
                    Discover items from campus shops and student sellers
                </p>
            </div>

            {/* Search & Filters */}
            <div className="mb-6 space-y-3">
                <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg" style={{ color: 'var(--uh-text-faint)' }}>🔍</span>
                    <input
                        type="text"
                        placeholder="Search products, shops, categories..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="uh-input pl-11"
                        style={{ fontSize: '15px', padding: '14px 16px 14px 44px' }}
                    />
                </div>
                <div className="flex gap-2 flex-wrap">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => { setCategory(cat); setPage(1); }}
                            className={`uh-chip ${category === cat ? 'active' : ''}`}
                        >
                            {cat !== 'all' && <span className="mr-1">{catEmoji[cat]}</span>}
                            <span className="capitalize">{cat}</span>
                        </button>
                    ))}
                </div>

                {/* Store Type Toggle */}
                <div className="flex gap-2 mb-4">
                    <button onClick={() => { setStoreType('all'); setPage(1); }} className={`uh-chip ${storeType === 'all' ? 'active' : ''}`}>
                        🌐 All Shops
                    </button>
                    <button onClick={() => { setStoreType('physical'); setPage(1); }} className={`uh-chip ${storeType === 'physical' ? 'active' : ''}`}>
                        🏪 Campus Shops
                    </button>
                    <button onClick={() => { setStoreType('virtual'); setPage(1); }} className={`uh-chip ${storeType === 'virtual' ? 'active' : ''}`}>
                        🎨 Student-Created Shops
                    </button>
                </div>
            </div>

            {/* Grid */}
            {loading ? (
                <div className="flex justify-center py-24">
                    <div className="uh-spinner" />
                </div>
            ) : products.length === 0 ? (
                <div className="text-center py-24">
                    <p className="text-6xl mb-4">🔍</p>
                    <p className="text-xl font-bold text-white mb-2">No products found</p>
                    <p style={{ color: 'var(--uh-text-muted)' }} className="text-sm">Try a different search or category</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                    {products.map(product => (
                        <div key={product._id} className="uh-card overflow-hidden flex flex-col group">
                            {/* Image area */}
                            <div className="h-44 flex items-center justify-center text-6xl relative overflow-hidden"
                                style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #12122a 100%)' }}>

                                {product.images?.length > 0 ? (
                                    <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                ) : (
                                    <span className="group-hover:scale-110 transition-transform duration-300">
                                        {catEmoji[product.category] || '📦'}
                                    </span>
                                )}

                                {product.inventory <= 0 && (
                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                        <span className="uh-badge-coral text-xs">Out of Stock</span>
                                    </div>
                                )}
                                {product.compareAtPrice && product.compareAtPrice > product.price && (
                                    <div className="absolute top-3 left-3">
                                        <span className="uh-badge-coral">SALE</span>
                                    </div>
                                )}
                            </div>

                            <div className="p-4 flex flex-col flex-1">
                                {/* Store & category */}
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-semibold" style={{ color: 'var(--uh-coral)' }}>
                                        {product.store?.storeType === 'virtual' ? '🎨' : '🏪'} {product.store?.name || 'Campus Shop'}
                                    </span>
                                    <span className="text-xs capitalize px-2 py-0.5 rounded-full"
                                        style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--uh-text-muted)' }}>
                                        {product.category}
                                    </span>
                                </div>

                                <Link to={`/product/${product._id}`}
                                    className="text-base font-bold text-white hover:text-[#FF6B57] transition-colors line-clamp-1 mb-1">
                                    {product.name}
                                </Link>
                                <p className="text-sm line-clamp-2 flex-1 mb-3" style={{ color: 'var(--uh-text-muted)' }}>
                                    {product.description || 'No description available'}
                                </p>

                                {/* Price row */}
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-xl font-black" style={{ color: 'var(--uh-green)' }}>
                                            ₹{product.price.toFixed(0)}
                                        </span>
                                        {product.compareAtPrice && product.compareAtPrice > product.price && (
                                            <span className="text-xs line-through" style={{ color: 'var(--uh-text-faint)' }}>
                                                ₹{product.compareAtPrice.toFixed(0)}
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-xs" style={{ color: product.inventory > 0 ? 'var(--uh-green)' : 'var(--uh-error)' }}>
                                        {product.inventory > 0 ? `${product.inventory} left` : 'Sold out'}
                                    </span>
                                </div>

                                <button
                                    onClick={() => addToCart(product._id)}
                                    disabled={product.inventory <= 0 || addingToCart === product._id}
                                    className="uh-btn-primary w-full text-sm py-2.5"
                                >
                                    {addingToCart === product._id
                                        ? <span className="flex items-center justify-center gap-2"><span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />Adding...</span>
                                        : product.inventory <= 0
                                            ? 'Out of Stock'
                                            : '🛒 Add to Cart'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex justify-center mt-10 gap-3">
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                        className="uh-btn-ghost px-5 text-sm disabled:opacity-30">
                        ← Previous
                    </button>
                    <span className="flex items-center px-4 text-sm" style={{ color: 'var(--uh-text-muted)' }}>
                        Page <strong className="mx-1 text-white">{page}</strong> of {totalPages}
                    </span>
                    <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                        className="uh-btn-ghost px-5 text-sm disabled:opacity-30">
                        Next →
                    </button>
                </div>
            )}
        </div>
    );
};

export default ProductCatalog;
