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
    ArrowDownIcon,
    TrophyIcon,
    DocumentDuplicateIcon, 
    ClipboardDocumentCheckIcon, 
    XCircleIcon
} from '@heroicons/react/24/outline';
import { router } from '@inertiajs/react';
import { Menu } from '@headlessui/react';
import { ChevronDownIcon as ChevronDownIcon20 } from '@heroicons/react/20/solid';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

function classNames(...classes) {
    return classes.filter(Boolean).join(' ')
}

export default function LeadsReport({ auth, stats, userWiseStats, wonLeadsUserWise, createdLeadsUserWise, handledLeadsUserWise, statusWiseStats, monthlyTrends, users, leadStatuses, leadSources, products }) {
    const [showFilterDrawer, setShowFilterDrawer] = useState(false);
    const [loading, setLoading] = useState(false);
    const [form] = Form.useForm();
    const [expandedCards, setExpandedCards] = useState({});
    const [filters, setFilters] = useState({
        start_date: dayjs().startOf('month').format('YYYY-MM-DD'),
        end_date: dayjs().endOf('month').format('YYYY-MM-DD'),
        lead_sources: [],
        lead_statuses: [],
        products: [],
        is_active: null
    });
    const [isFilterOpen, setIsFilterOpen] = useState(false);

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

    const StatCard = ({ title, value, id, userStats, icon, change, userStatKey }) => {
        const Icon = {
            UserGroupIcon,
            DocumentPlusIcon,
            UserPlusIcon,
            ArchiveBoxXMarkIcon,
            BellAlertIcon,
            TrophyIcon
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
                case 'won_leads':
                    return stat.total_won || 0;
                case 'created':
                    return stat.total_created || 0;
                default:
                    return userStatKey ? stat[userStatKey] || 0 : stat.total || 0;
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

    const CreatedLeadsCard = () => {
        return (
            <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            <DocumentDuplicateIcon className="h-6 w-6 text-blue-500" aria-hidden="true" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                            <dl>
                                <dt className="text-sm font-medium text-gray-500 truncate">Created Leads</dt>
                                <dd className="flex items-baseline">
                                    <div className="text-2xl font-semibold text-gray-900">
                                        {stats?.created_leads?.total || 0}
                                    </div>
                                </dd>
                            </dl>
                        </div>
                        <Menu as="div" className="relative">
                            <Menu.Button className="flex items-center text-gray-400 hover:text-gray-600">
                                <ChevronDownIcon20 className="h-5 w-5" aria-hidden="true" />
                            </Menu.Button>
                            <Menu.Items className="absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                                <div className="py-1">
                                    {stats?.created_leads?.by_user.map((user) => (
                                        <Menu.Item key={user.user_id}>
                                            {({ active }) => (
                                                <div
                                                    className={classNames(
                                                        active ? 'bg-gray-100' : '',
                                                        'px-4 py-2 text-sm text-gray-700 flex justify-between'
                                                    )}
                                                >
                                                    <span>{user.user_name}</span>
                                                    <span className="font-medium">{user.count}</span>
                                                </div>
                                            )}
                                        </Menu.Item>
                                    ))}
                                </div>
                            </Menu.Items>
                        </Menu>
                    </div>
                </div>
            </div>
        );
    };

    const LeadsHandledCard = () => {
        return (
            <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            <div className="bg-pink-50 p-2 rounded-lg">
                                <ClipboardDocumentCheckIcon className="h-6 w-6 text-pink-600" aria-hidden="true" />
                            </div>
                        </div>
                        <div className="ml-5 w-0 flex-1">
                            <dl>
                                <dt className="text-sm font-medium text-gray-500 truncate">Leads Handled</dt>
                                <dd className="flex items-baseline">
                                    <div className="text-2xl font-semibold text-gray-900">
                                        {stats?.handled_leads?.total || 0}
                                    </div>
                                </dd>
                            </dl>
                        </div>
                        <Menu as="div" className="relative">
                            <Menu.Button className="flex items-center text-gray-400 hover:text-gray-600">
                                <ChevronDownIcon20 className="h-5 w-5" aria-hidden="true" />
                            </Menu.Button>
                            <Menu.Items className="absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                                <div className="py-1">
                                    {stats?.handled_leads?.by_user?.map((user) => (
                                        <Menu.Item key={user.id}>
                                            {({ active }) => (
                                                <div
                                                    className={classNames(
                                                        active ? 'bg-gray-100' : '',
                                                        'px-4 py-2 text-sm text-gray-700 flex justify-between'
                                                    )}
                                                >
                                                    <span>{user.name}</span>
                                                    <span className="font-medium">{user.value}</span>
                                                </div>
                                            )}
                                        </Menu.Item>
                                    ))}
                                </div>
                            </Menu.Items>
                        </Menu>
                    </div>
                </div>
            </div>
        );
    };

    const ClosedLeadsCard = () => {
        return (
            <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            <XCircleIcon className="h-6 w-6 text-yellow-500" aria-hidden="true" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                            <dl>
                                <dt className="text-sm font-medium text-gray-500 truncate">Closed Leads</dt>
                                <dd className="flex items-baseline">
                                    <div className="text-2xl font-semibold text-gray-900">
                                        {stats?.closed_leads || 0}
                                    </div>
                                </dd>
                            </dl>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const WonLeadsCard = () => {
        return (
            <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            <TrophyIcon className="h-6 w-6 text-purple-500" aria-hidden="true" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                            <dl>
                                <dt className="text-sm font-medium text-gray-500 truncate">Won Leads</dt>
                                <dd className="flex items-baseline">
                                    <div className="text-2xl font-semibold text-gray-900">
                                        {stats?.won_leads || 0}
                                    </div>
                                </dd>
                            </dl>
                        </div>
                    </div>
                </div>
            </div>
        );
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
                    <Row gutter={[16, 16]} className="mb-4">
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
                                userStats={createdLeadsUserWise}
                                icon="DocumentPlusIcon"
                                change={stats.leads_created?.change}
                                userStatKey="total_created"
                            />
                        </Col>
                        <Col span={24} md={8} lg={6}>
                            <StatCard
                                title="Leads Handled"
                                value={stats.leads_handled?.value || 0}
                                id="handled"
                                userStats={handledLeadsUserWise}
                                icon="ClipboardDocumentCheckIcon"
                                change={stats.leads_handled?.change}
                                userStatKey="total_handled"
                            />
                        </Col>
                        <Col xs={24} sm={12} md={8} lg={6}>
                            <StatCard
                                title="Won Leads"
                                value={stats.won_leads?.value || 0}
                                id="won_leads"
                                icon="TrophyIcon"
                                change={stats.won_leads?.change}
                                userStats={wonLeadsUserWise}
                                userStatKey="total_won"
                            />
                        </Col>
                    </Row>

                    
                    
                    
                    
                    <Card className="mt-8">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-medium">Lead Trends</h3>
                            <div className="text-sm text-gray-500">
                                Monthly Comparison
                            </div>
                        </div>
                        <div style={{ width: '100%', height: 400 }}>
                            {monthlyTrends && monthlyTrends.length > 0 ? (
                                <ResponsiveContainer>
                                    <BarChart
                                        data={monthlyTrends}
                                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis 
                                            dataKey="name" 
                                            tick={{ fontSize: 12 }}
                                        />
                                        <YAxis 
                                            tick={{ fontSize: 12 }}
                                        />
                                        <Tooltip 
                                            cursor={{ fill: 'rgba(169, 36, 121, 0.20)' }}
                                            contentStyle={{ fontSize: 12 }}
                                        />
                                        <Legend />
                                        <Bar 
                                            dataKey="Created" 
                                            fill="#a92479" 
                                            barSize={20}
                                        />
                                        <Bar 
                                            dataKey="Handled" 
                                            fill="rgba(169, 36, 121, 0.7)" 
                                            barSize={20}
                                        />
                                        <Bar 
                                            dataKey="Won" 
                                            fill="rgba(169, 36, 121, 0.5)" 
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
