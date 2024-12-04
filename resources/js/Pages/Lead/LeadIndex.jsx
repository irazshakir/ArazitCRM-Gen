import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Table, Button, Space, Popconfirm, message, Drawer, Form, Select, Input, DatePicker, Badge } from 'antd';
import LeadCreate from './LeadCreate';
import { FilterOutlined, ClearOutlined } from '@ant-design/icons';

export default function LeadIndex({ auth, leads, leadConstants, users, filters, products }) {
    // Add error boundary
    if (!auth?.user) {
        return <div>Loading...</div>;
    }

    const [loading, setLoading] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showFilterDrawer, setShowFilterDrawer] = useState(false);
    const [form] = Form.useForm();

    // Add this state to track if filters are applied
    const hasActiveFilters = Object.values(filters || {}).some(value => 
        value !== null && value !== undefined && value !== ''
    );

    const handleFilter = (values) => {
        setShowFilterDrawer(false);
        // Remove empty values before sending
        const cleanedValues = Object.fromEntries(
            Object.entries(values).filter(([_, value]) => 
                value !== null && value !== undefined && value !== ''
            )
        );
        
        router.get(route('leads.index'), {
            ...cleanedValues,
            page: 1, // Reset to first page when filtering
        }, {
            preserveState: true,
            preserveScroll: false,
        });
    };

    const clearFilters = () => {
        form.resetFields();
        router.get(route('leads.index'), {}, {
            preserveState: true,
            preserveScroll: false,
        });
    };

    const handleDelete = async (id) => {
        try {
            await router.delete(route('leads.destroy', id), {
                onSuccess: () => {
                    message.success('Lead deleted successfully');
                },
                onError: () => {
                    message.error('Failed to delete lead');
                }
            });
        } catch (error) {
            message.error('Failed to delete lead');
        }
    };

    const columns = [
        {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
            sorter: true,
            render: (text, record) => (
                <div className="flex items-center gap-2">
                    {record.followup_required && (
                        <span className="w-2 h-2 rounded-full bg-red-500" />
                    )}
                    <span>{text}</span>
                </div>
            ),
        },
        {
            title: 'Phone',
            dataIndex: 'phone',
            key: 'phone',
        },
        {
            title: 'Assigned To',
            dataIndex: ['assigned_user', 'name'],
            key: 'assigned_user',
        },
        {
            title: 'Status',
            dataIndex: 'lead_status',
            key: 'lead_status',
            render: (status) => (
                <span className={`px-2 py-1 rounded-full text-xs ${
                    status === 'Won' ? 'bg-green-100 text-green-800' :
                    status === 'Lost' ? 'bg-red-100 text-red-800' :
                    'bg-blue-100 text-blue-800'
                }`}>
                    {status}
                </span>
            ),
        },
        {
            title: 'Source',
            dataIndex: 'lead_source',
            key: 'lead_source',
        },
        {
            title: 'Followup',
            key: 'followup',
            render: (_, record) => {
                if (!record.followup_date) return 'Not Set';
                
                const date = new Date(record.followup_date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                });
                
                const time = `${record.followup_hour || ''}:${record.followup_minute || ''} ${record.followup_period || ''}`;
                const isPast = record.followup_required;
                
                return (
                    <span className={isPast ? 'text-red-600 font-medium' : ''}>
                        {`${date}`} <br/> {`${time}`}
                        {/* {isPast && ' (Followup Required)'} */}
                    </span>
                );
            },
        },
        {
            title: 'Status',
            dataIndex: 'lead_active_status',
            key: 'lead_active_status',
            render: (status) => (
                <span className={`px-2 py-1 rounded-full text-xs ${
                    status ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                    {status ? 'Open' : 'Closed'}
                </span>
            ),
        },
        {
            title: 'Product',
            dataIndex: ['product', 'name'],
            key: 'product',
            render: (text, record) => (
                <span>{record.product?.name || 'Not Assigned'}</span>
            ),
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                <Space>
                    <Link href={route('leads.edit', record.id)}>
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
                        title="Delete Lead"
                        description="Are you sure you want to delete this lead?"
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

    // Prepare pagination config with safety checks
    const paginationConfig = leads?.meta ? {
        total: leads.meta.total || 0,
        pageSize: leads.meta.per_page || 10,
        current: leads.meta.current_page || 1,
        showSizeChanger: true,
        showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} leads`,
    } : false; // If no meta data, disable pagination

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Leads" />

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl text-gray-600">Leads</h2>
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
                                    Create Lead
                                </Button>
                            </div>
                        </div>

                        <Table
                            columns={columns}
                            dataSource={leads?.data || []}
                            rowKey="id"
                            loading={loading}
                            pagination={{
                                total: leads?.meta?.total || 0,
                                pageSize: leads?.meta?.per_page || 10,
                                current: leads?.meta?.current_page || 1,
                                showSizeChanger: true,
                                showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} leads`,
                                pageSizeOptions: ['10', '25', '50', '100']
                            }}
                            onChange={(pagination, filters, sorter) => {
                                router.get(route('leads.index'), {
                                    page: pagination.current,
                                    per_page: pagination.pageSize,
                                }, {
                                    preserveState: true,
                                    preserveScroll: true,
                                });
                            }}
                        />

                        {/* Filter Drawer */}
                        <Drawer
                            title="Filter Leads"
                            placement="right"
                            onClose={() => setShowFilterDrawer(false)}
                            open={showFilterDrawer}
                            width={400}
                        >
                            <Form
                                form={form}
                                layout="vertical"
                                onFinish={handleFilter}
                                initialValues={filters}
                            >
                                <Form.Item name="search" label="Search">
                                    <Input placeholder="Search by name or phone" />
                                </Form.Item>

                                <Form.Item name="assigned_user_id" label="Assigned To">
                                    <Select
                                        allowClear
                                        placeholder="Select user"
                                        options={users.map(user => ({
                                            label: user.name,
                                            value: user.id
                                        }))}
                                    />
                                </Form.Item>

                                <Form.Item name="lead_status" label="Status">
                                    <Select
                                        allowClear
                                        placeholder="Select status"
                                        options={leadConstants.STATUSES.map(status => ({
                                            label: status,
                                            value: status
                                        }))}
                                    />
                                </Form.Item>

                                <Form.Item name="lead_source" label="Source">
                                    <Select
                                        allowClear
                                        placeholder="Select source"
                                        options={leadConstants.SOURCES.map(source => ({
                                            label: source,
                                            value: source
                                        }))}
                                    />
                                </Form.Item>

                                <Form.Item name="followup_filter" label="Followup Date">
                                    <Select
                                        allowClear
                                        placeholder="Select followup filter"
                                        options={[
                                            { label: 'Today', value: 'today' },
                                            { label: 'This Week', value: 'week' },
                                            { label: 'This Month', value: 'month' },
                                            { label: 'Overdue', value: 'overdue' }
                                        ]}
                                    />
                                </Form.Item>

                                <Form.Item name="lead_active_status" label="Lead Status">
                                    <Select
                                        allowClear
                                        placeholder="Select lead status"
                                        options={[
                                            { label: 'Open', value: '1' },
                                            { label: 'Closed', value: '0' }
                                        ]}
                                    />
                                </Form.Item>

                                <Form.Item name="product_id" label="Product">
                                    <Select
                                        allowClear
                                        placeholder="Select product"
                                        options={products.map(product => ({
                                            label: product.name,
                                            value: product.id
                                        }))}
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
                                            style={{
                                                backgroundColor: '#a92479',
                                                borderColor: '#a92479'
                                            }}
                                        >
                                            Apply Filters
                                        </Button>
                                    </Space>
                                </Form.Item>
                            </Form>
                        </Drawer>

                        <LeadCreate 
                            show={showCreateModal}
                            onClose={() => setShowCreateModal(false)}
                            users={users}
                            leadConstants={leadConstants}
                            products={products}
                        />
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
