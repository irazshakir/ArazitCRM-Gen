import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import { Card, Row, Col, Drawer, Form, Select, DatePicker, Button, Space, Spin, Statistic } from 'antd';
import { FilterOutlined, LoadingOutlined } from '@ant-design/icons';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { useState } from 'react';
import { 
    UserGroupIcon, 
    DocumentPlusIcon, 
    CheckCircleIcon,
    TrophyIcon,
    ClipboardDocumentCheckIcon,
} from '@heroicons/react/24/outline';
import { router } from '@inertiajs/react';

const { RangePicker } = DatePicker;

export default function SCReports({ auth, stats, leadSources, leadStatuses, products }) {
    const [showFilterDrawer, setShowFilterDrawer] = useState(false);
    const [loading, setLoading] = useState(false);
    const [form] = Form.useForm();

    const handleFilter = (values) => {
        setLoading(true);
        router.get(route('sc.reports'), {
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

    const StatCard = ({ icon: Icon, title, value, color }) => (
        <Card className="h-full shadow hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
                <div className="flex-1">
                    <div className="text-sm text-gray-600 mb-1">{title}</div>
                    <div className="text-2xl font-semibold">{value}</div>
                </div>
                <div className={`p-3 rounded-full ${color}`}>
                    <Icon className="w-6 h-6 text-white" />
                </div>
            </div>
        </Card>
    );

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={
                <div className="flex justify-between items-center">
                    <h2 className="font-semibold text-xl text-gray-800 leading-tight">
                        Sales Consultant Reports
                    </h2>
                    <Button
                        type="primary"
                        icon={<FilterOutlined />}
                        onClick={() => setShowFilterDrawer(true)}
                    >
                        Filter
                    </Button>
                </div>
            }
        >
            <Head title="Sales Consultant Reports" />

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    {loading && (
                        <div className="fixed inset-0 bg-black bg-opacity-30 z-50 flex items-center justify-center">
                            <Spin indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} />
                        </div>
                    )}

                    <Row gutter={[16, 16]}>
                        <Col xs={24} sm={12} lg={6}>
                            <StatCard
                                icon={DocumentPlusIcon}
                                title="Created Leads"
                                value={stats?.created_leads || 0}
                                color="bg-blue-500"
                            />
                        </Col>
                        <Col xs={24} sm={12} lg={6}>
                            <StatCard
                                icon={UserGroupIcon}
                                title="Assigned Leads"
                                value={stats?.assigned_leads || 0}
                                color="bg-green-500"
                            />
                        </Col>
                        <Col xs={24} sm={12} lg={6}>
                            <StatCard
                                icon={CheckCircleIcon}
                                title="Closed Leads"
                                value={stats?.closed_leads || 0}
                                color="bg-yellow-500"
                            />
                        </Col>
                        <Col xs={24} sm={12} lg={6}>
                            <StatCard
                                icon={TrophyIcon}
                                title="Won Leads"
                                value={stats?.won_leads || 0}
                                color="bg-purple-500"
                            />
                        </Col>
                        <Col xs={24} sm={12} lg={6}>
                            <StatCard
                                icon={ClipboardDocumentCheckIcon}
                                title="Leads Handled"
                                value={stats?.active_leads || 0}
                                color="bg-indigo-500"
                            />
                        </Col>
                    </Row>

                    <div className="mt-8">
                        <Card title="Lead Performance Over Time" className="shadow">
                            <ResponsiveContainer width="100%" height={400}>
                                <BarChart 
                                    data={stats?.monthly_trends || []}
                                    margin={{
                                        top: 20,
                                        right: 30,
                                        left: 20,
                                        bottom: 5,
                                    }}
                                    barSize={40}
                                >
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis 
                                        dataKey="month" 
                                        padding={{ left: 10, right: 10 }}
                                    />
                                    <YAxis />
                                    <Tooltip 
                                        cursor={{fill: 'rgba(0, 0, 0, 0.1)'}}
                                        contentStyle={{
                                            backgroundColor: '#fff',
                                            border: '1px solid #ccc',
                                            borderRadius: '4px',
                                            padding: '10px'
                                        }}
                                    />
                                    <Legend 
                                        wrapperStyle={{
                                            paddingTop: '20px'
                                        }}
                                    />
                                    <Bar 
                                        dataKey="created" 
                                        name="Created" 
                                        fill="#1890ff"
                                        radius={[4, 4, 0, 0]}
                                    />
                                    <Bar 
                                        dataKey="closed" 
                                        name="Closed" 
                                        fill="#faad14"
                                        radius={[4, 4, 0, 0]}
                                    />
                                    <Bar 
                                        dataKey="won" 
                                        name="Won" 
                                        fill="#52c41a"
                                        radius={[4, 4, 0, 0]}
                                    />
                                    <Bar 
                                        dataKey="active" 
                                        name="Leads Handled" 
                                        fill="#6366f1"
                                        radius={[4, 4, 0, 0]}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </Card>
                    </div>
                </div>
            </div>

            <Drawer
                title="Filter Reports"
                placement="right"
                onClose={() => setShowFilterDrawer(false)}
                open={showFilterDrawer}
                width={400}
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleFilter}
                >
                    <Form.Item
                        name="date_range"
                        label="Date Range"
                    >
                        <RangePicker className="w-full" />
                    </Form.Item>

                    <Form.Item
                        name="lead_sources"
                        label="Lead Sources"
                    >
                        <Select
                            mode="multiple"
                            placeholder="Select lead sources"
                            options={leadSources?.map(source => ({
                                label: source.name,
                                value: source.id
                            }))}
                        />
                    </Form.Item>

                    <Form.Item
                        name="lead_statuses"
                        label="Lead Status"
                    >
                        <Select
                            mode="multiple"
                            placeholder="Select lead status"
                            options={leadStatuses?.map(status => ({
                                label: status.name,
                                value: status.id
                            }))}
                        />
                    </Form.Item>

                    <Form.Item
                        name="products"
                        label="Products"
                    >
                        <Select
                            mode="multiple"
                            placeholder="Select products"
                            options={products?.map(product => ({
                                label: product.name,
                                value: product.id
                            }))}
                        />
                    </Form.Item>

                    <Form.Item
                        name="is_active"
                        label="Lead Status"
                    >
                        <Select
                            placeholder="Select lead activity status"
                            options={[
                                { label: 'Active Leads', value: true },
                                { label: 'Inactive Leads', value: false }
                            ]}
                        />
                    </Form.Item>

                    <Space className="w-full justify-end">
                        <Button onClick={() => {
                            form.resetFields();
                            handleFilter({});
                        }}>
                            Reset
                        </Button>
                        <Button type="primary" htmlType="submit">
                            Apply Filters
                        </Button>
                    </Space>
                </Form>
            </Drawer>
        </AuthenticatedLayout>
    );
}