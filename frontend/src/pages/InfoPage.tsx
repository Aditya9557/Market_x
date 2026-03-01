import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import API from '../api/axios';

const InfoPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const type = location.pathname.includes('terms') ? 'terms' : 'privacy';

    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchContent = async () => {
            try {
                const { data } = await API.get(`/user/${type}`);
                setTitle(data.title);
                setContent(data.content);
            } catch (error) {
                console.error('Error fetching content:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchContent();
    }, [type]);

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <div className="bg-white px-6 py-4 flex items-center shadow-sm sticky top-0 z-10">
                <button onClick={() => navigate(-1)} className="mr-4 text-gray-600 hover:text-gray-900">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <h1 className="text-xl font-bold text-gray-900">{loading ? 'Loading...' : title}</h1>
            </div>

            <div className="flex-1 p-6 max-w-2xl mx-auto w-full">
                {loading ? (
                    <div className="space-y-4 animate-pulse">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                        <div className="h-4 bg-gray-200 rounded w-full"></div>
                    </div>
                ) : (
                    <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 prose prose-blue max-w-none">
                        <pre className="whitespace-pre-wrap font-sans text-gray-700">{content}</pre>
                    </div>
                )}
            </div>
        </div>
    );
};

export default InfoPage;
