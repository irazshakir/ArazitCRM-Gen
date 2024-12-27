import { Head, Link, router } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Table, Button, Space, Popconfirm, message, Drawer, Form, Select, Input, DatePicker, Badge, Checkbox } from 'antd';
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
    const [activeFilters, setActiveFilters] = useState({});

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
            render: (text, record) => {
                const isOverdue = record.followup_date && (() => {
                    const followupDate = dayjs(record.followup_date);
                    const now = dayjs();
                    
                    // If date is in the past
                    if (followupDate.isBefore(now, 'day')) {
                        return true;
                    }
                    
                    // If date is today, check time
                    if (followupDate.isSame(now, 'day')) {
                        const followupMinutes = 
                            (record.followup_period === 'PM' && record.followup_hour !== '12' 
                                ? parseInt(record.followup_hour) + 12 
                                : record.followup_period === 'AM' && record.followup_hour === '12'
                                ? 0
                                : parseInt(record.followup_hour)) * 60 
                            + parseInt(record.followup_minute);
                        
                        const currentMinutes = now.hour() * 60 + now.minute();
                        return followupMinutes < currentMinutes;
                    }
                    
                    return false;
                })();

                return (
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        {isOverdue && (
                            <span 
                                style={{ 
                                    width: '8px', 
                                    height: '8px', 
                                    backgroundColor: '#ff4d4f',
                                    borderRadius: '50%',
                                    display: 'inline-block',
                                    marginRight: '8px'
                                }} 
                            />
                        )}
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
                );
            }
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
            render: (text, record) => {
                const isOverdue = record.followup_date && (() => {
                    const followupDate = dayjs(record.followup_date);
                    const now = dayjs();
                    
                    // If date is in the past
                    if (followupDate.isBefore(now, 'day')) {
                        return true;
                    }
                    
                    // If date is today, check time
                    if (followupDate.isSame(now, 'day')) {
                        const followupMinutes = 
                            (record.followup_period === 'PM' && record.followup_hour !== '12' 
                                ? parseInt(record.followup_hour) + 12 
                                : record.followup_period === 'AM' && record.followup_hour === '12'
                                ? 0
                                : parseInt(record.followup_hour)) * 60 
                            + parseInt(record.followup_minute);
                        
                        const currentMinutes = now.hour() * 60 + now.minute();
                        return followupMinutes < currentMinutes;
                    }
                    
                    return false;
                })();

                const followupDate = record.followup_date ? dayjs(record.followup_date).format('D MMM YYYY') : '-';
                const followupTime = record.followup_hour && record.followup_minute 
                    ? `${record.followup_hour}:${record.followup_minute} ${record.followup_period}` 
                    : '';

                return (
                    <div style={{ 
                        color: isOverdue ? '#ff4d4f' : 'inherit',
                        fontWeight: isOverdue ? 'bold' : 'normal'
                    }}>
                        {followupDate} {followupTime}
                    </div>
                );
            }
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
        setLoading(true);
        
        // Remove empty values and format date range
        const cleanValues = Object.fromEntries(
            Object.entries(values).filter(([key, value]) => {
                if (Array.isArray(value)) {
                    return value.length > 0;
                }
                // Special handling for boolean values and date range
                if (key === 'show_overdue') {
                    return true; // Always include show_overdue even if false
                }
                if (key === 'lead_active_status') {
                    return value !== undefined && value !== null && value !== '';
                }
                if (key === 'followup_date_range' && value) {
                    return value[0] && value[1];
                }
                return value !== undefined && value !== null && value !== '';
            })
        );

        // Format date range if present
        if (cleanValues.followup_date_range) {
            cleanValues.followup_date_range = [
                cleanValues.followup_date_range[0].format('YYYY-MM-DD'),
                cleanValues.followup_date_range[1].format('YYYY-MM-DD')
            ];
        }

        // Ensure show_overdue is properly passed as a string
        cleanValues.show_overdue = values.show_overdue ? 'true' : 'false';
        
        setActiveFilters(cleanValues);

        router.get(
            route('sales-consultant.leads.index'),
            cleanValues,
            {
                preserveState: true,
                preserveScroll: true,
                only: ['leads'],
                onSuccess: () => {
                    setLoading(false);
                },
                onError: () => {
                    setLoading(false);
                    message.error('Failed to apply filters');
                }
            }
        );
        setShowFilterDrawer(false);
    };

    const clearFilters = () => {
        setActiveFilters({});
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
    };

    // Function to display active filters summary
    const getActiveFiltersSummary = () => {
        const summary = [];
        
        if (activeFilters.lead_status?.length) {
            summary.push(`Status: ${activeFilters.lead_status.join(', ')}`);
        }
        if (activeFilters.lead_source?.length) {
            summary.push(`Source: ${activeFilters.lead_source.join(', ')}`);
        }
        if (activeFilters.followup_date_range) {
            summary.push(`Follow-up: ${activeFilters.followup_date_range[0]} to ${activeFilters.followup_date_range[1]}`);
        }
        if (activeFilters.product_id) {
            const product = products.find(p => p.id === activeFilters.product_id);
            if (product) summary.push(`Product: ${product.name}`);
        }
        if (activeFilters.search) {
            summary.push(`Search: ${activeFilters.search}`);
        }
        if (activeFilters.lead_active_status !== undefined) {
            summary.push(`Status: ${activeFilters.lead_active_status === 'true' ? 'Active' : 'Inactive'}`);
        }
        if (activeFilters.show_overdue) {
            summary.push('Showing Overdue Leads');
        }
        
        return summary.join(' | ');
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
                                <div className="flex items-center space-x-2">
                                    <Button
                                        icon={<FilterOutlined />}
                                        onClick={() => setShowFilterDrawer(true)}
                                        style={{
                                            borderColor: Object.keys(activeFilters).length ? '#a92479' : undefined,
                                            color: Object.keys(activeFilters).length ? '#a92479' : undefined
                                        }}
                                    >
                                        Filters
                                    </Button>
                                    {Object.keys(activeFilters).length > 0 && (
                                        <>
                                            <span className="text-sm text-gray-500">{getActiveFiltersSummary()}</span>
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
                                        </>
                                    )}
                                </div>
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
                            loading={loading}
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
                            mode="multiple"
                            placeholder="Select status"
                            options={[
                                { value: 'Initial Contact', label: 'Initial Contact' },
                                { value: 'Query', label: 'Query' },
                                { value: 'Negotiation', label: 'Negotiation' },
                                { value: 'Won', label: 'Won' },
                                { value: 'Lost', label: 'Lost' },
                                { value: 'Non-Potential', label: 'Non-Potential' },
                                { value: 'No-Reply', label: 'No-Reply' },
                                { value: 'Call-Back-Later', label: 'Call-Back-Later' }
                            ]}
                        />
                    </Form.Item>

                    <Form.Item name="lead_source" label="Lead Source">
                        <Select
                            allowClear
                            mode="multiple"
                            placeholder="Select source"
                            options={[
                                { value: 'Facebook', label: 'Facebook' },
                                { value: 'Instagram', label: 'Instagram' },
                                { value: 'LinkedIn', label: 'LinkedIn' },
                                { value: 'Whatsapp', label: 'Whatsapp' },
                                { value: 'Google-Ads', label: 'Google Ads' },
                                { value: 'Youtube-Ads', label: 'Youtube Ads' }
                            ]}
                        />
                    </Form.Item>

                    <Form.Item name="lead_active_status" label="Active Status">
                        <Select
                            allowClear
                            placeholder="Select active status"
                            options={[
                                { value: 'true', label: 'Active' },
                                { value: 'false', label: 'Inactive' },
                            ]}
                        />
                    </Form.Item>

                    <Form.Item name="followup_date_range" label="Follow-up Date Range">
                        <DatePicker.RangePicker 
                            style={{ width: '100%' }}
                            format="YYYY-MM-DD"
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

                    <Form.Item name="show_overdue" valuePropName="checked">
                        <Checkbox>
                            <span className="text-md text-red-600">
                                Show Overdue Leads
                            </span>
                        </Checkbox>
                    </Form.Item>

                    <Form.Item>
                        <Button
                            type="primary"
                            htmlType="submit"
                            block
                            loading={loading}
                            style={{
                                backgroundColor: '#85115b',
                                borderColor: '#85115b',
                            }}
                        >
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