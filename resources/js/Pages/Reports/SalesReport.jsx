import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import { Card, Row, Col, Drawer, Form, Select, DatePicker, Button, Space, Spin } from 'antd';
import { FilterOutlined, LoadingOutlined } from '@ant-design/icons';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';
import { 
    TrophyIcon,
    ChartBarIcon,
    XCircleIcon,
    NoSymbolIcon,
    ArrowUpIcon,
    ArrowDownIcon
} from '@heroicons/react/24/outline';
import { router } from '@inertiajs/react';

const { RangePicker } = DatePicker;

export default function SalesReport({ auth, stats, userWiseStats, conversionTrends, users }) {
    const [showFilterDrawer, setShowFilterDrawer] = useState(false);
    const [loading, setLoading] = useState(false);
    const [form] = Form.useForm();
    const [expandedCards, setExpandedCards] = useState({});

    const handleFilter = (values) => {
        setLoading(true);
        router.get(route('reports.sales'), {
            ...values,
            start_date: values.date_range?.[0]?.format('YYYY-MM-DD'),
            end_date: values.date_range?.[1]?.format('YYYY-MM-DD'),
        }, {
            preserveState: true,
            preserveScroll: true,
            onFinish: () => {
                setLoading(false);
                setShowFilterDrawer(false);
            }
        });
    };

    const clearFilters = () => {
        setLoading(true);
        form.resetFields();
        router.get(route('reports.sales'), {}, {
            preserveState: true,
            preserveScroll: true,
            onFinish: () => {
                setLoading(false);
                setShowFilterDrawer(false);
            }
        });
    };

    const toggleCard = (cardId) => {
        setExpandedCards(prev => ({
            ...prev,
            [cardId]: !prev[cardId]
        }));
    };

    const StatCard = ({ title, value, id, userStats, icon, change }) => {
        const Icon = {
            TrophyIcon,
            ChartBarIcon,
            XCircleIcon,
            NoSymbolIcon
        }[icon] || TrophyIcon;

        const getUserStatValue = (stat, cardId) => {
            switch (cardId) {
                case 'sales':
                    return stat.total_sales || 0;
                case 'conversion':
                    return `${stat.conversion_ratio || 0}%`;
                case 'non_potential':
                    return stat.non_potential_leads || 0;
                case 'lost':
                    return stat.lost_leads || 0;
                default:
                    return stat.total || 0;
            }
        };

        return (
            <Card className="shadow-md">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(169, 36, 121, 0.1)' }}>
                            <Icon className="w-6 h-6" style={{ color: '#a92479' }} />
                        </div>
                        <div>
                            <p className="text-gray-600 text-sm">{title}</p>
                            <div className="flex items-center gap-2">
                                <p className="text-2xl font-bold">{value}</p>
                                {change && (
                                    <span className={`flex items-center text-sm font-medium ${
                                        change.type === 'positive' ? 'text-green-600' : 'text-red-600'
                                    }`}>
                                        {change.type === 'positive' ? (
                                            <ArrowUpIcon className="w-4 h-4" />
                                        ) : (
                                            <ArrowDownIcon className="w-4 h-4" />
                                        )}
                                        {Math.abs(change.percentage)}%
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    {userStats && (
                        <button 
                            onClick={() => toggleCard(id)}
                            className="p-2 hover:bg-gray-100 rounded-full"
                        >
                            {expandedCards[id] ? (
                                <ChevronUpIcon className="h-5 w-5" />
                            ) : (
                                <ChevronDownIcon className="h-5 w-5" />
                            )}
                        </button>
                    )}
                </div>
                
                {expandedCards[id] && userStats && (
                    <div className="mt-4 border-t pt-4">
                        {userStats.map(stat => (
                            <div key={stat.name} className="flex justify-between py-1">
                                <span>{stat.name}</span>
                                <span className="font-semibold">
                                    {getUserStatValue(stat, id)}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </Card>
        );
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold">Sales Report</h2>
                    <Button 
                        onClick={() => setShowFilterDrawer(true)}
                        icon={loading ? <LoadingOutlined /> : <FilterOutlined />}
                        style={{ backgroundColor: '#a92479', borderColor: '#a92479' }}
                        type="primary"
                        loading={loading}
                    >
                        {loading ? 'Loading...' : 'Filter'}
                    </Button>
                </div>
            }
        >
            <Head title="Sales Report" />

            {/* Filter Drawer */}
            <Drawer
                title="Filter Reports"
                placement="right"
                onClose={() => setShowFilterDrawer(false)}
                open={showFilterDrawer}
                width={320}
                className="filter-drawer"
            >
                <Spin spinning={loading}>
                    <Form
                        form={form}
                        layout="vertical"
                        onFinish={handleFilter}
                    >
                        <Form.Item 
                            name="date_range" 
                            label="Date Range"
                        >
                            <RangePicker 
                                className="w-full"
                                format="YYYY-MM-DD"
                            />
                        </Form.Item>

                        <Form.Item 
                            name="user_id" 
                            label="User"
                        >
                            <Select
                                allowClear
                                placeholder="Select user"
                                options={users?.map(user => ({
                                    label: user.name,
                                    value: user.id
                                }))}
                            />
                        </Form.Item>

                        <Space className="w-full justify-end">
                            <Button 
                                onClick={clearFilters}
                                disabled={loading}
                            >
                                Clear
                            </Button>
                            <Button 
                                type="primary" 
                                htmlType="submit"
                                style={{
                                    backgroundColor: '#a92479',
                                    borderColor: '#a92479'
                                }}
                                loading={loading}
                            >
                                Apply Filters
                            </Button>
                        </Space>
                    </Form>
                </Spin>
            </Drawer>

            <Spin spinning={loading}>
                <div className="p-6">
                    {/* Stats Cards */}
                    <Row gutter={[16, 16]}>
                        <Col span={24} md={12} lg={6}>
                            <StatCard
                                title="Total Sales"
                                value={stats.total_sales?.value || 0}
                                id="sales"
                                userStats={userWiseStats}
                                icon="TrophyIcon"
                                change={stats.total_sales?.change}
                            />
                        </Col>
                        <Col span={24} md={12} lg={6}>
                            <StatCard
                                title="Conversion Ratio"
                                value={`${stats.conversion_ratio?.value || 0}%`}
                                id="conversion"
                                userStats={userWiseStats}
                                icon="ChartBarIcon"
                                change={stats.conversion_ratio?.change}
                            />
                        </Col>
                        <Col span={24} md={12} lg={6}>
                            <StatCard
                                title="Non-Potential Leads"
                                value={stats.non_potential?.value || 0}
                                id="non_potential"
                                userStats={userWiseStats}
                                icon="XCircleIcon"
                                change={stats.non_potential?.change}
                            />
                        </Col>
                        <Col span={24} md={12} lg={6}>
                            <StatCard
                                title="Client Lost"
                                value={stats.client_lost?.value || 0}
                                id="lost"
                                userStats={userWiseStats}
                                icon="NoSymbolIcon"
                                change={stats.client_lost?.change}
                            />
                        </Col>
                    </Row>

                    {/* Conversion Trends Chart */}
                    <Card className="mt-8">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-medium">Leads Assigned vs Conversion Ratio</h3>
                            <div className="text-sm text-gray-500">
                                Monthly Comparison
                            </div>
                        </div>
                        <div style={{ width: '100%', height: 400 }}>
                            {conversionTrends && conversionTrends.length > 0 ? (
                                <ResponsiveContainer>
                                    <BarChart
                                        data={conversionTrends}
                                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis 
                                            dataKey="name" 
                                            tick={{ fontSize: 12 }}
                                        />
                                        <YAxis 
                                            yAxisId="left"
                                            tick={{ fontSize: 12 }}
                                        />
                                        <YAxis 
                                            yAxisId="right"
                                            orientation="right"
                                            tick={{ fontSize: 12 }}
                                        />
                                        <Tooltip 
                                            cursor={{ fill: 'rgba(169, 36, 121, 0.20)' }}
                                            contentStyle={{ fontSize: 12 }}
                                        />
                                        <Legend />
                                        <Bar 
                                            yAxisId="left"
                                            dataKey="assigned_leads" 
                                            name="Assigned Leads"
                                            fill="#a92479" 
                                            barSize={20}
                                        />
                                        <Bar 
                                            yAxisId="right"
                                            dataKey="conversion_ratio" 
                                            name="Conversion Ratio (%)"
                                            fill="rgba(169, 36, 121, 0.7)" 
                                            barSize={20}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex items-center justify-center h-full text-gray-500">
                                    No data available for the selected period
                                </div>
                            )}
                        </div>
                    </Card>
                </div>
            </Spin>
        </AuthenticatedLayout>
    );
}
