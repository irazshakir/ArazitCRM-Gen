import { Head, Link, router } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Table, Button, Space, Popconfirm, message, Drawer, Form, Select, Input, DatePicker, Card, Row, Col, Statistic, Dropdown, List } from 'antd';
import { FilterOutlined, ClearOutlined, LoadingOutlined, DollarOutlined, DownOutlined, UnorderedListOutlined } from '@ant-design/icons';
import MarketingCreate from './MarketingCreate';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

export default function MarketingIndex({ auth, marketing, leadSources, filters, totalCost, activeCampaigns }) {
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showFilterDrawer, setShowFilterDrawer] = useState(false);
    const [filterLoading, setFilterLoading] = useState(false);
    const [filterValues, setFilterValues] = useState(filters || {});
    const [form] = Form.useForm();

    // Initialize form with filters when component mounts or filters change
    useEffect(() => {
        if (filters) {
            const formattedFilters = {
                ...filters,
                date_range: filters.start_date && filters.end_date ? [
                    dayjs(filters.start_date),
                    dayjs(filters.end_date)
                ] : undefined
            };
            form.setFieldsValue(formattedFilters);
            setFilterValues(filters);
        }
    }, [filters]);

    const hasActiveFilters = Object.keys(filters || {}).length > 0;

    const columns = [
        {
            title: 'SR No.',
            key: 'id',
            render: (_, __, index) => index + 1,
        },
        {
            title: 'Campaign Name',
            dataIndex: 'campaign_name',
            key: 'campaign_name',
        },
        {
            title: 'Source',
            dataIndex: 'lead_source',
            key: 'lead_source',
        },
        {
            title: 'Cost',
            dataIndex: 'cost',
            key: 'cost',
            render: (cost) => `Rs ${parseFloat(cost).toFixed(2)}`,
        },
        {
            title: 'Duration',
            key: 'duration',
            render: (_, record) => {
                const formatDate = (dateString) => {
                    const date = new Date(dateString);
                    return date.toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: '2-digit'
                    });
                };
                return `${formatDate(record.start_date)} to ${formatDate(record.end_date)}`;
            },
        },
        {
            title: 'Status',
            dataIndex: 'campaign_status',
            key: 'campaign_status',
            render: (status) => (
                <span className={`px-2 py-1 rounded-full text-xs ${
                    status ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                    {status ? 'Active' : 'Inactive'}
                </span>
            ),
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                <Space>
                    <Link href={route('marketing.edit', record.id)}>
                        <Button 
                            type="primary" 
                            size="small"
                            style={{
                                backgroundColor: '#a92479',
                                borderColor: '#a92479'
                            }}
                        >
                            Edit
                        </Button>
                    </Link>
                    <Popconfirm
                        title="Delete Campaign"
                        description="Are you sure you want to delete this campaign?"
                        onConfirm={() => handleDelete(record.id)}
                        okText="Yes"
                        cancelText="No"
                        okButtonProps={{ danger: true }}
                    >
                        <Button danger size="small">
                            Delete
                        </Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    // Create items for dropdown with improved UI
    const dropdownItems = {
        items: [{
            key: 'activeCampaignsList',
            label: (
                <List
                    size="small"
                    header={<div className="font-semibold">Active Campaigns</div>}
                    bordered
                    dataSource={activeCampaigns || []}
                    renderItem={(campaign) => (
                        <List.Item className="flex justify-between">
                            <span>{campaign.campaign_name}</span>
                            <span className="text-gray-500">Rs {Math.round(campaign.cost)}</span>
                        </List.Item>
                    )}
                    style={{ width: '300px', maxHeight: '400px', overflow: 'auto' }}
                />
            ),
        }],
    };

    const handleFilter = async (values) => {
        setFilterLoading(true);
        try {
            // Merge new values with existing filters
            const mergedValues = {
                ...filterValues,
                ...values,
            };

            // Transform date range if exists
            if (values.date_range) {
                mergedValues.start_date = values.date_range[0].format('YYYY-MM-DD');
                mergedValues.end_date = values.date_range[1].format('YYYY-MM-DD');
                delete mergedValues.date_range;
            }

            // Remove any undefined or null values
            Object.keys(mergedValues).forEach(key => {
                if (mergedValues[key] === undefined || mergedValues[key] === null) {
                    delete mergedValues[key];
                }
            });

            setFilterValues(mergedValues);

            await router.get(route('marketing.index'), mergedValues, {
                preserveState: true,
                preserveScroll: true,
                onSuccess: () => {
                    setShowFilterDrawer(false);
                    message.success('Filters applied successfully');
                },
                onError: () => {
                    message.error('Failed to apply filters');
                }
            });
        } catch (error) {
            message.error('Failed to apply filters');
        } finally {
            setFilterLoading(false);
        }
    };

    const clearFilters = () => {
        form.resetFields();
        setFilterValues({});
        router.get(route('marketing.index'), {}, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleDelete = async (id) => {
        try {
            await router.delete(route('marketing.destroy', id));
            message.success('Campaign deleted successfully');
        } catch (error) {
            message.error('Failed to delete campaign');
        }
    };

    const getCurrentMonthRange = () => {
        const start = dayjs().startOf('month').format('YYYY-MM-DD');
        const end = dayjs().endOf('month').format('YYYY-MM-DD');
        return { start, end };
    };

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Marketing Campaigns" />

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    {/* Statistics Section */}
                    <div className="mb-8">
                        <Row gutter={16}>
                            <Col span={8}>
                                <Card hoverable className="h-full">
                                    <Statistic
                                        title="Total Campaign Cost"
                                        value={Math.round(totalCost || 0)}
                                        formatter={(value) => `Rs ${value}`}
                                        prefix={<DollarOutlined className="text-[#a92479] mr-2" />}
                                        className="text-[#a92479]"
                                    />
                                    <div className="flex flex-col mt-2">
                                        <span className="text-gray-500 text-sm">
                                            {filters?.start_date && filters?.end_date 
                                                ? `${dayjs(filters.start_date).format('DD-MMM-YY')} to ${dayjs(filters.end_date).format('DD-MMM-YY')}`
                                                : `Current Month (${dayjs().format('MMMM YYYY')})`
                                            }
                                        </span>
                                        <Dropdown 
                                            menu={dropdownItems} 
                                            trigger={['click']}
                                            placement="bottomRight"
                                        >
                                            <Button 
                                                type="link" 
                                                className="mt-2 flex items-center text-[#a92479]"
                                                icon={<UnorderedListOutlined />}
                                            >
                                                View Active Campaigns
                                            </Button>
                                        </Dropdown>
                                    </div>
                                </Card>
                            </Col>
                        </Row>
                    </div>

                    {/* Main Content Card */}
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl text-gray-600">Marketing Campaigns</h2>
                            <div className="flex gap-2 items-center">
                                {hasActiveFilters && (
                                    <Button
                                        icon={<ClearOutlined />}
                                        onClick={clearFilters}
                                        type="text"
                                        danger
                                    >
                                        Clear Filters
                                    </Button>
                                )}
                                <Button
                                    icon={<FilterOutlined />}
                                    onClick={() => setShowFilterDrawer(true)}
                                    type={hasActiveFilters ? 'primary' : 'default'}
                                    style={hasActiveFilters ? {
                                        backgroundColor: '#a92479',
                                        borderColor: '#a92479'
                                    } : {}}
                                >
                                    Filter
                                </Button>
                                <Button 
                                    type="primary" 
                                    onClick={() => setShowCreateModal(true)}
                                    style={{
                                        backgroundColor: '#a92479',
                                        borderColor: '#a92479'
                                    }}
                                >
                                    Create Campaign
                                </Button>
                            </div>
                        </div>

                        <Table
                            columns={columns}
                            dataSource={marketing.data}
                            rowKey="id"
                            pagination={{
                                total: marketing.meta.total,
                                pageSize: marketing.meta.per_page,
                                current: marketing.meta.current_page,
                                showSizeChanger: true,
                                showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} campaigns`,
                            }}
                        />

                        <Drawer
                            title="Filter Campaigns"
                            placement="right"
                            onClose={() => setShowFilterDrawer(false)}
                            open={showFilterDrawer}
                            width={400}
                        >
                            <Form
                                form={form}
                                layout="vertical"
                                onFinish={handleFilter}
                                initialValues={filterValues}
                                preserve={true}
                                onValuesChange={(_, allValues) => {
                                    // Update filterValues state when form values change
                                    setFilterValues(prev => ({
                                        ...prev,
                                        ...allValues,
                                    }));
                                }}
                            >
                                <Form.Item name="search" label="Search">
                                    <Input placeholder="Search by campaign name" />
                                </Form.Item>

                                <Form.Item name="lead_source" label="Source">
                                    <Select
                                        allowClear
                                        placeholder="Select source"
                                        options={leadSources.map(source => ({
                                            label: source,
                                            value: source
                                        }))}
                                    />
                                </Form.Item>

                                <Form.Item name="date_range" label="Date Range">
                                    <RangePicker style={{ width: '100%' }} />
                                </Form.Item>

                                <Form.Item name="campaign_status" label="Status">
                                    <Select
                                        allowClear
                                        placeholder="Select status"
                                        options={[
                                            { label: 'Active', value: 1 },
                                            { label: 'Inactive', value: 0 }
                                        ]}
                                    />
                                </Form.Item>

                                <Form.Item>
                                    <Space className="w-full justify-end">
                                        <Button onClick={() => setShowFilterDrawer(false)}>
                                            Cancel
                                        </Button>
                                        <Button 
                                            type="primary" 
                                            htmlType="submit"
                                            loading={filterLoading}
                                            icon={filterLoading ? <LoadingOutlined /> : <FilterOutlined />}
                                            style={{
                                                backgroundColor: '#a92479',
                                                borderColor: '#a92479'
                                            }}
                                        >
                                            {filterLoading ? 'Applying...' : 'Apply Filters'}
                                        </Button>
                                    </Space>
                                </Form.Item>
                            </Form>
                        </Drawer>

                        <MarketingCreate 
                            show={showCreateModal}
                            onClose={() => setShowCreateModal(false)}
                            leadSources={leadSources}
                        />
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
