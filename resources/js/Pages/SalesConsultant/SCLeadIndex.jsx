import { Head, Link, router } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Table, Button, Space, Popconfirm, message, Drawer, Form, Select, Input, DatePicker, Badge } from 'antd';
import { FilterOutlined, ClearOutlined } from '@ant-design/icons';
import Pusher from 'pusher-js';
import { notification } from 'antd';
import dayjs from 'dayjs';
import axios from 'axios';
import SCLeadCreate from './SCLeadCreate';

export default function SCLeadIndex({ auth, leads, leadConstants, filters, products, users }) {
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

    useEffect(() => {
        // Initialize Pusher
        const pusher = new Pusher('ab43b7081fd487b51b53', {
            cluster: 'ap2',
        });

        // Subscribe to leads channel
        const channel = pusher.subscribe('leads');

        // Listen for LeadUpdated event
        channel.bind('App\\Events\\LeadUpdated', (data) => {
            // Refresh the data using Inertia
            router.reload({ only: ['leads'] });
        });

        // Listen for LeadCreated event
        channel.bind('App\\Events\\LeadCreated', (data) => {
            if (data.assigned_user_id === auth.user.id) {
                const followupDate = data.followup_date ? 
                    dayjs(data.followup_date).format('D MMM YYYY') : 'Not set';
                const followupTime = data.followup_hour && data.followup_minute ? 
                    `${data.followup_hour}:${data.followup_minute} ${data.followup_period}` : '';
                    
                notification.open({
                    message: 'New Lead Assigned',
                    description: (
                        <div className="space-y-1">
                            <p><strong>Name:</strong> {data.name}</p>
                            <p><strong>Phone:</strong> {data.phone}</p>
                            <p><strong>Source:</strong> {data.leadData?.lead_source || 'Not specified'}</p>
                            <p><strong>Follow-up:</strong> {followupDate} {followupTime}</p>
                            {data.initial_remarks && (
                                <div>
                                    <strong>Notes:</strong>
                                    <p className="mt-1 text-gray-600">{data.initial_remarks}</p>
                                </div>
                            )}
                            <a 
                                onClick={async (e) => {
                                    e.preventDefault();
                                    try {
                                        // Mark as viewed first
                                        await axios.post(`/leads/${data.id}/mark-as-viewed`);
                                        // Then navigate
                                        window.location.href = route('leads.edit', data.id);
                                    } catch (error) {
                                        console.error('Failed to mark as viewed:', error);
                                        // Still navigate even if marking as viewed fails
                                        window.location.href = route('leads.edit', data.id);
                                    }
                                }}
                                href={route('leads.edit', data.id)} 
                                className="text-blue-500 underline cursor-pointer"
                            >
                                View Lead
                            </a>
                        </div>
                    ),
                    placement: 'bottomRight',
                    duration: 15,
                    className: 'custom-notification',
                    style: {
                        width: '350px',
                    },
                });
                router.reload({ only: ['leads'] });
            }
        });

        // Cleanup on component unmount
        return () => {
            pusher.unsubscribe('leads');
        };
    }, []);

    const columns = [
        {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
            render: (text, record) => (
                <div className="flex items-center gap-2">
                    {record.followup_required && (
                        <span className="w-2 h-2 rounded-full bg-red-500" />
                    )}
                    <div className="flex items-center gap-2">
                        {!record.notification_status && (
                            <span className="inline-flex items-center rounded-full bg-[#a92479] px-2 py-0.5 text-xs font-medium text-white">
                                New
                            </span>
                        )}
                        <span>{text}</span>
                    </div>
                </div>
            ),
        },
        {
            title: 'Phone',
            dataIndex: 'phone',
            key: 'phone',
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
            title: 'Follow-up Date',
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
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                <Space>
                    <Button 
                        type="primary" 
                        size="small"
                        style={{
                            backgroundColor: '#a92479',
                            borderColor: '#a92479'
                        }}
                        onClick={async () => {
                            try {
                                // Mark as viewed first
                                await axios.post(`/leads/${record.id}/mark-as-viewed`);
                                // Then navigate to edit page
                                window.location.href = route('sales-consultant.leads.edit', record.id);
                            } catch (error) {
                                console.error('Failed to mark as viewed:', error);
                                // Still navigate even if marking as viewed fails
                                window.location.href = route('sales-consultant.leads.edit', record.id);
                            }
                        }}
                    >
                        Edit
                    </Button>
                </Space>
            ),
        },
    ];

    const handleFilter = (values) => {
        router.get(
            route('sales-consultant.leads.index'),
            {
                ...values,
                ...{ page: 1 },
            },
            {
                preserveState: true,
                preserveScroll: true,
                only: ['leads'],
            }
        );
        setShowFilterDrawer(false);
    };

    const clearFilters = () => {
        form.resetFields();
        router.get(
            route('sales-consultant.leads.index'),
            {},
            {
                preserveState: true,
                preserveScroll: true,
                only: ['leads'],
            }
        );
        setShowFilterDrawer(false);
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Leads</h2>}
        >
            <Head title="Leads" />

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg p-6">
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center space-x-4">
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
                                <Button
                                    icon={<FilterOutlined />}
                                    onClick={() => setShowFilterDrawer(true)}
                                    style={{
                                        borderColor: hasActiveFilters ? '#a92479' : undefined,
                                        color: hasActiveFilters ? '#a92479' : undefined
                                    }}
                                >
                                    Filters {hasActiveFilters && '(Active)'}
                                </Button>
                                {hasActiveFilters && (
                                    <Button
                                        icon={<ClearOutlined />}
                                        onClick={clearFilters}
                                        style={{
                                            borderColor: '#a92479',
                                            color: '#a92479'
                                        }}
                                    >
                                        Clear Filters
                                    </Button>
                                )}
                            </div>
                        </div>

                        <Table
                            columns={columns}
                            dataSource={leads.data}
                            rowKey="id"
                            pagination={{
                                total: leads.total,
                                pageSize: leads.per_page,
                                current: leads.current_page,
                                onChange: (page) => {
                                    router.get(
                                        route('sales-consultant.leads.index'),
                                        { page },
                                        {
                                            preserveState: true,
                                            preserveScroll: true,
                                            only: ['leads'],
                                        }
                                    );
                                },
                            }}
                        />
                    </div>
                </div>
            </div>

            <Drawer
                title="Filter Leads"
                placement="right"
                onClose={() => setShowFilterDrawer(false)}
                open={showFilterDrawer}
                width={400}
            >
                <Form
                    form={form}
                    onFinish={handleFilter}
                    layout="vertical"
                    initialValues={filters}
                >
                    <Form.Item name="search" label="Search">
                        <Input placeholder="Search by name or phone" />
                    </Form.Item>

                    <Form.Item name="lead_status" label="Lead Status">
                        <Select
                            allowClear
                            placeholder="Select status"
                            options={[
                                { value: 'New', label: 'New' },
                                { value: 'Contacted', label: 'Contacted' },
                                { value: 'Interested', label: 'Interested' },
                                { value: 'Not Interested', label: 'Not Interested' },
                                { value: 'Converted', label: 'Converted' },
                            ]}
                        />
                    </Form.Item>

                    <Form.Item name="lead_source" label="Lead Source">
                        <Select
                            allowClear
                            placeholder="Select source"
                            options={[
                                { value: 'Website', label: 'Website' },
                                { value: 'Referral', label: 'Referral' },
                                { value: 'Social Media', label: 'Social Media' },
                                { value: 'Direct', label: 'Direct' },
                                { value: 'Other', label: 'Other' },
                            ]}
                        />
                    </Form.Item>

                    <Form.Item name="lead_active_status" label="Active Status">
                        <Select
                            allowClear
                            placeholder="Select active status"
                            options={[
                                { value: '1', label: 'Active' },
                                { value: '0', label: 'Inactive' },
                            ]}
                        />
                    </Form.Item>

                    <Form.Item name="followup_filter" label="Follow-up">
                        <Select
                            allowClear
                            placeholder="Select follow-up filter"
                            options={[
                                { value: 'today', label: 'Today' },
                                { value: 'week', label: 'This Week' },
                                { value: 'month', label: 'This Month' },
                                { value: 'overdue', label: 'Overdue' },
                            ]}
                        />
                    </Form.Item>

                    <Form.Item name="product_id" label="Product">
                        <Select
                            allowClear
                            placeholder="Select product"
                            options={products?.map(product => ({
                                value: product.id,
                                label: product.name
                            }))}
                        />
                    </Form.Item>

                    <Form.Item name="notification_status" label="Notification Status">
                        <Select
                            allowClear
                            placeholder="Select notification status"
                            options={[
                                { value: '1', label: 'Viewed' },
                                { value: '0', label: 'Not Viewed' },
                            ]}
                        />
                    </Form.Item>

                    <Form.Item>
                        <Button type="primary" htmlType="submit" block>
                            Apply Filters
                        </Button>
                    </Form.Item>
                </Form>
            </Drawer>

            <SCLeadCreate 
                show={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                leadConstants={leadConstants}
                products={products}
                users={users}
            />
        </AuthenticatedLayout>
    );
}