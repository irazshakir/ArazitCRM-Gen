import { Typography } from 'antd';
import { useEffect, useState } from 'react';
import axios from 'axios';

const { Title } = Typography;

export default function ApplicationLogo(props) {
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const response = await axios.get('/api/settings');
                console.log('Settings response:', response.data); // Debug log
                if (response.data) {
                    setSettings(response.data);
                }
            } catch (error) {
                console.error('Error fetching settings:', error);
                setError(error);
            } finally {
                setLoading(false);
            }
        };

        fetchSettings();
    }, []);

    // Show loading placeholder while fetching settings
    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center">
                <div className="h-16 w-16 bg-gray-100 rounded-full animate-pulse" />
            </div>
        );
    }

    // If there's an error or no settings, show fallback
    if (error || !settings) {
        return (
            <div className="h-16 w-16 rounded-full bg-[#a92479]/10 flex items-center justify-center">
                <span className="text-[#a92479] text-2xl font-bold">C</span>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center">
            {settings.company_logo ? (
                <div className="relative w-16 h-16">
                    <img
                        src={`/storage/${settings.company_logo}`}
                        alt={settings.company_name || 'Company Logo'}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                            console.log('Image failed to load:', e); // Debug log
                            e.target.parentElement.nextElementSibling.style.display = 'block';
                            e.target.parentElement.style.display = 'none';
                        }}
                    />
                </div>
            ) : (
                <div className="h-16 w-16 rounded-full bg-[#a92479]/10 flex items-center justify-center">
                    <span className="text-[#a92479] text-2xl font-bold">
                        {settings.company_name?.[0]?.toUpperCase() || 'C'}
                    </span>
                </div>
            )}
            
            {settings.company_name && (
                <Title 
                    level={5} 
                    className="mt-2 text-gray-800 text-center whitespace-nowrap font-medium"
                    style={{ marginTop: '0.5rem', marginBottom: 0 }}
                >
                    {settings.company_name}
                </Title>
            )}

            {/* Fallback logo (hidden by default) */}
            <div 
                className="h-16 w-16 rounded-full bg-[#a92479]/10 flex items-center justify-center"
                style={{ display: 'none' }}
            >
                <span className="text-[#a92479] text-2xl font-bold">
                    {settings.company_name?.[0]?.toUpperCase() || 'C'}
                </span>
            </div>
        </div>
    );
}
