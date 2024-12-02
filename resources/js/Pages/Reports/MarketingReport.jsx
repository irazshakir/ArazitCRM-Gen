import { useState, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Card, Row, Col, Drawer, Form, DatePicker, Button, Space, Spin, Select } from 'antd';
import { FilterOutlined, LoadingOutlined, DollarOutlined, CalculatorOutlined } from '@ant-design/icons';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { ChevronUpIcon, ChevronDownIcon, ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/outline';
import { router } from '@inertiajs/react';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

export default function MarketingReport({ auth, stats, monthlyTrends, leadSources, filters, avgLeadCostByPlatform, conversionRatioBySource }) {
    const [showFilterDrawer, setShowFilterDrawer] = useState(false);
    const [loading, setLoading] = useState(false);
    const [form] = Form.useForm();

    useEffect(() => {
        if (filters) {
            form.setFieldsValue({
                date_range: filters.date_range ? [
                    dayjs(filters.date_range[0]),
                    dayjs(filters.date_range[1])
                ] : null,
                lead_source: filters.lead_source || null
            });
        }
    }, [filters]);

    const handleFilter = (values) => {
        setLoading(true);
        router.get(route('reports.marketing'), {
            start_date: values.date_range?.[0]?.format('YYYY-MM-DD'),
            end_date: values.date_range?.[1]?.format('YYYY-MM-DD'),
            lead_source: values.lead_source
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
        router.get(route('reports.marketing'), {}, {
            preserveState: true,
            preserveScroll: true,
            onFinish: () => {
                setLoading(false);
                setShowFilterDrawer(false);
            }
        });
    };

    const StatCard = ({ title, value, icon, change }) => {
        const Icon = icon;
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
                                <p className="text-2xl font-bold">
                                    {typeof value === 'number' ? `Rs ${value.toFixed()}` : value}
                                </p>
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
                </div>
            </Card>
        );
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold">Marketing Report</h2>
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
            <Head title="Marketing Report" />

            <Drawer
                title="Filter Reports"
                placement="right"
                onClose={() => setShowFilterDrawer(false)}
                open={showFilterDrawer}
                width={320}
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
                            name="lead_source" 
                            label="Lead Source"
                        >
                            <Select
                                allowClear
                                placeholder="Select Lead Source"
                                options={leadSources.map(source => ({
                                    label: source,
                                    value: source
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
                    <Row gutter={[16, 16]}>
                        <Col span={24} md={12} lg={8}>
                            <StatCard
                                title="Budget Spend"
                                value={stats.budget_spend?.value || 0}
                                icon={DollarOutlined}
                                change={stats.budget_spend?.change}
                            />
                        </Col>
                        <Col span={24} md={12} lg={8}>
                            <StatCard
                                title="Cost per Lead"
                                value={stats.cost_per_lead?.value || 0}
                                icon={CalculatorOutlined}
                                change={stats.cost_per_lead?.change}
                            />
                        </Col>
                    </Row>

                    <Card className="mt-8">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-medium">Budget Spend vs Leads Created</h3>
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
                                            dataKey="budget_spend" 
                                            name="Budget Spend (Rs)"
                                            fill="#a92479" 
                                            barSize={20}
                                        />
                                        <Bar 
                                            yAxisId="right"
                                            dataKey="leads_created" 
                                            name="Leads Created"
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

                    <Row gutter={[16, 16]} className="mt-8">
                        <Col span={24} md={12}>
                            <Card title="Average Lead Cost by Platform">
                                <div style={{ width: '100%', height: 400 }}>
                                    {avgLeadCostByPlatform && avgLeadCostByPlatform.length > 0 ? (
                                        <ResponsiveContainer>
                                            <BarChart
                                                data={avgLeadCostByPlatform}
                                                layout="vertical"
                                                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                            >
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis type="number" />
                                                <YAxis 
                                                    dataKey="name" 
                                                    type="category"
                                                    width={100}
                                                />
                                                <Tooltip 
                                                    cursor={{ fill: 'rgba(169, 36, 121, 0.05)' }}
                                                    formatter={(value) => [`Rs ${value}`, 'Avg Cost per Lead']}
                                                />
                                                <Bar 
                                                    dataKey="avg_cost" 
                                                    fill="#a92479" 
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
                        </Col>
                        <Col span={24} md={12}>
                            <Card title="Conversion Ratio by Source">
                                <div style={{ width: '100%', height: 400 }}>
                                    {conversionRatioBySource && conversionRatioBySource.length > 0 ? (
                                        <ResponsiveContainer>
                                            <BarChart
                                                data={conversionRatioBySource}
                                                layout="vertical"
                                                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                            >
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis 
                                                    type="number" 
                                                    unit="%" 
                                                />
                                                <YAxis 
                                                    dataKey="name" 
                                                    type="category"
                                                    width={100}
                                                />
                                                <Tooltip 
                                                    cursor={{ fill: 'rgba(169, 36, 121, 0.05)' }}
                                                    formatter={(value) => [`${value}%`, 'Conversion Ratio']}
                                                />
                                                <Bar 
                                                    dataKey="conversion_ratio" 
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
                        </Col>
                    </Row>
                </div>
            </Spin>
        </AuthenticatedLayout>
    );
}
