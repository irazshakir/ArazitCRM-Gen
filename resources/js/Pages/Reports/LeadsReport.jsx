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
    UserGroupIcon, 
    DocumentPlusIcon, 
    UserPlusIcon, 
    ArchiveBoxXMarkIcon,
    BellAlertIcon,
    ArrowUpIcon,
    ArrowDownIcon
} from '@heroicons/react/24/outline';
import { router } from '@inertiajs/react';

const { RangePicker } = DatePicker;

export default function LeadsReport({ auth, stats, userWiseStats, statusWiseStats, monthlyTrends, users, leadStatuses }) {
    const [showFilterDrawer, setShowFilterDrawer] = useState(false);
    const [loading, setLoading] = useState(false);
    const [form] = Form.useForm();
    const [expandedCards, setExpandedCards] = useState({});

    const handleFilter = (values) => {
        setLoading(true);
        router.get(route('reports.leads'), {
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
        router.get(route('reports.leads'), {}, {
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
            UserGroupIcon,
            DocumentPlusIcon,
            UserPlusIcon,
            ArchiveBoxXMarkIcon,
            BellAlertIcon
        }[icon] || UserGroupIcon;

        const getUserStatValue = (stat, cardId) => {
            switch (cardId) {
                case 'active':
                    return stat.active_leads || 0;
                case 'assigned':
                    return stat.assigned_leads || 0;
                case 'closed':
                    return stat.closed_leads || 0;
                case 'followup':
                    return stat.followup_required || 0;
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

    // Custom active bar style
    const activeBarStyle = {
        fill: 'rgba(169, 36, 121, 0.05)', // Theme color with 5% opacity
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold">Leads Report</h2>
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
            <Head title="Leads Report" />

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

                        <Form.Item 
                            name="lead_status" 
                            label="Lead Status"
                        >
                            <Select
                                allowClear
                                placeholder="Select status"
                                options={leadStatuses?.map(status => ({
                                    label: status,
                                    value: status
                                }))}
                            />
                        </Form.Item>

                        <Form.Item 
                            name="lead_active_status" 
                            label="Active Status"
                        >
                            <Select
                                allowClear
                                placeholder="Select active status"
                                options={[
                                    { label: 'Open', value: '1' },
                                    { label: 'Closed', value: '0' }
                                ]}
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
                        <Col span={24} md={8} lg={6}>
                            <StatCard
                                title="Active Leads"
                                value={stats.active_leads?.value || 0}
                                id="active"
                                userStats={userWiseStats}
                                icon="UserGroupIcon"
                                change={stats.active_leads?.change}
                            />
                        </Col>
                        <Col span={24} md={8} lg={6}>
                            <StatCard
                                title="Leads Created"
                                value={stats.leads_created?.value || 0}
                                id="created"
                                icon="DocumentPlusIcon"
                                change={stats.leads_created?.change}
                            />
                        </Col>
                        <Col span={24} md={8} lg={6}>
                            <StatCard
                                title="Assigned Leads"
                                value={stats.leads_assigned?.value || 0}
                                id="assigned"
                                userStats={userWiseStats}
                                icon="UserPlusIcon"
                                change={stats.leads_assigned?.change}
                            />
                        </Col>
                        <Col span={24} md={8} lg={6}>
                            <StatCard
                                title="Closed Leads"
                                value={stats.leads_closed?.value || 0}
                                id="closed"
                                userStats={userWiseStats}
                                icon="ArchiveBoxXMarkIcon"
                                change={stats.leads_closed?.change}
                            />
                        </Col>
                    </Row>

                    {/* Main Chart - Lead Trends */}
                    <Card className="mt-8">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-medium">Lead Trends</h3>
                            <div className="text-sm text-gray-500">
                                Monthly Comparison
                            </div>
                        </div>
                        <div style={{ width: '100%', height: 400 }}>
                            <ResponsiveContainer>
                                <BarChart
                                    data={monthlyTrends}
                                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip 
                                        cursor={{ fill: 'rgba(169, 36, 121, 0.05)' }}
                                    />
                                    <Legend />
                                    <Bar 
                                        dataKey="Created" 
                                        name="Created" 
                                        fill="#a92479" 
                                        barSize={20}
                                        activeBar={activeBarStyle}
                                    />
                                    <Bar 
                                        dataKey="Closed" 
                                        name="Closed" 
                                        fill="rgba(169, 36, 121, 0.1)" 
                                        barSize={20}
                                        activeBar={activeBarStyle}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>

                    {/* Sub Charts */}
                    <Row gutter={[16, 16]} className="mt-8">
                        <Col span={24} md={12}>
                            <Card title="User-wise Active Leads">
                                <div style={{ width: '100%', height: 300 }}>
                                    <ResponsiveContainer>
                                        <BarChart
                                            data={userWiseStats}
                                            layout="vertical"
                                            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis type="number" />
                                            <YAxis dataKey="name" type="category" />
                                            <Tooltip 
                                                cursor={{ fill: 'rgba(169, 36, 121, 0.05)' }}
                                            />
                                            <Bar 
                                                dataKey="active_leads" 
                                                fill="#a92479" 
                                                barSize={20}
                                                activeBar={activeBarStyle}
                                            />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </Card>
                        </Col>
                        <Col span={24} md={12}>
                            <Card title="Status-wise Leads">
                                <div style={{ width: '100%', height: 300 }}>
                                    <ResponsiveContainer>
                                        <BarChart
                                            data={statusWiseStats}
                                            layout="vertical"
                                            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis type="number" />
                                            <YAxis dataKey="lead_status" type="category" />
                                            <Tooltip 
                                                cursor={{ fill: 'rgba(169, 36, 121, 0.05)' }}
                                            />
                                            <Bar 
                                                dataKey="total" 
                                                fill="#a92479" 
                                                barSize={20}
                                                activeBar={activeBarStyle}
                                            />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </Card>
                        </Col>
                    </Row>
                </div>
            </Spin>
        </AuthenticatedLayout>
    );
}
