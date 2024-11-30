import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Table, Button, Space, Popconfirm, message, Tag, Drawer, Form, Input, Select, DatePicker, Card, Statistic } from 'antd';
import { PlusOutlined, DownloadOutlined, FilterOutlined, ClearOutlined } from '@ant-design/icons';
import InvoiceCreate from './InvoiceCreate';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

export default function InvoiceIndex({ auth, invoices, stats, can, filters }) {
    if (!auth?.user) {
        return <div>Loading...</div>;
    }

    const [loading, setLoading] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showFilterDrawer, setShowFilterDrawer] = useState(false);
    const [form] = Form.useForm();

    const hasActiveFilters = Object.keys(filters || {}).length > 0;

    const handleFilter = (values) => {
        setShowFilterDrawer(false);
        router.get(route('invoices.index'), {
            ...values,
            date_range: values.date_range ? [
                values.date_range[0].format('YYYY-MM-DD'),
                values.date_range[1].format('YYYY-MM-DD')
            ] : null,
            page: 1,
        }, {
            preserveState: true,
            preserveScroll: false,
        });
    };

    const clearFilters = () => {
        form.resetFields();
        router.get(route('invoices.index'), {}, {
            preserveState: true,
            preserveScroll: false,
        });
    };

    const handleDelete = async (id) => {
        try {
            await router.delete(route('invoices.destroy', id), {
                onSuccess: () => message.success('Invoice deleted successfully'),
                onError: () => message.error('Failed to delete invoice')
            });
        } catch (error) {
            message.error('Failed to delete invoice');
        }
    };

    const getStatusTag = (status) => {
        const statusColors = {
            draft: 'default',
            pending: 'warning',
            partially_paid: 'processing',
            paid: 'success',
            cancelled: 'error'
        };

        return (
            <Tag color={statusColors[status]}>
                {status.replace('_', ' ').toUpperCase()}
            </Tag>
        );
    };

    const columns = [
        {
            title: 'Invoice #',
            dataIndex: 'invoice_number',
            key: 'invoice_number',
        },
        {
            title: 'Client Name',
            dataIndex: ['lead', 'name'],
            key: 'client_name',
        },
        {
            title: 'Date',
            dataIndex: 'created_at',
            key: 'date',
            render: (date) => dayjs(date).format('DD/MM/YYYY'),
        },
        {
            title: 'Total',
            dataIndex: 'total_amount',
            key: 'total',
            render: (amount) => `Rs. ${parseFloat(amount).toFixed(2)}`,
        },
        {
            title: 'Received',
            dataIndex: 'total_received',
            key: 'received',
            render: (amount) => `Rs. ${parseFloat(amount).toFixed(2)}`,
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status) => getStatusTag(status),
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                <Space>
                    <Button
                        type="primary"
                        size="small"
                        icon={<DownloadOutlined />}
                        onClick={() => window.open(route('invoices.download', record.id))}
                        style={{
                            backgroundColor: '#52c41a',
                            borderColor: '#52c41a',
                        }}
                    >
                        Download
                    </Button>
                    <Button
                        type="primary"
                        size="small"
                        onClick={() => router.get(route('invoices.edit', record.id))}
                        style={{
                            backgroundColor: '#a92479',
                            borderColor: '#a92479',
                        }}
                    >
                        Edit
                    </Button>
                    <Popconfirm
                        title="Delete Invoice"
                        description="Are you sure you want to delete this invoice?"
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

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Invoices" />

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg p-6">
                        {/* Stats Cards */}
                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 mb-6">
                            <Card>
                                <Statistic
                                    title="Payments Received"
                                    value={stats.payments_received}
                                    precision={2}
                                    prefix="Rs. "
                                />
                                <div className="text-xs text-gray-500 mt-2">
                                    {filters?.date_range ? 'Filtered Period' : 'Current Month'}
                                </div>
                            </Card>
                            <Card>
                                <Statistic
                                    title="Pending Payments"
                                    value={stats.pending_payments}
                                    precision={2}
                                    prefix="Rs. "
                                    valueStyle={{ color: '#faad14' }}
                                />
                            </Card>
                            <Card>
                                <Statistic
                                    title="Active Invoices"
                                    value={stats.active_invoices}
                                    valueStyle={{ color: '#52c41a' }}
                                />
                            </Card>
                        </div>

                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl text-gray-600">Invoices</h2>
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
                                    icon={<PlusOutlined />}
                                    onClick={() => setShowCreateModal(true)}
                                    style={{
                                        backgroundColor: '#a92479',
                                        borderColor: '#a92479',
                                    }}
                                >
                                    Create Invoice
                                </Button>
                            </div>
                        </div>

                        <Table
                            columns={columns}
                            dataSource={invoices?.data || []}
                            rowKey="id"
                            loading={loading}
                            pagination={{
                                total: invoices?.meta?.total || 0,
                                pageSize: invoices?.meta?.per_page || 10,
                                current: invoices?.meta?.current_page || 1,
                                showSizeChanger: true,
                                showTotal: (total, range) => 
                                    `${range[0]}-${range[1]} of ${total} invoices`,
                            }}
                        />

                        {/* Filter Drawer */}
                        <Drawer
                            title="Filter Invoices"
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
                                    <Input placeholder="Search by invoice number or client name" />
                                </Form.Item>

                                <Form.Item name="status" label="Status">
                                    <Select
                                        allowClear
                                        placeholder="Select status"
                                        options={[
                                            { label: 'Draft', value: 'draft' },
                                            { label: 'Pending', value: 'pending' },
                                            { label: 'Partially Paid', value: 'partially_paid' },
                                            { label: 'Paid', value: 'paid' },
                                            { label: 'Cancelled', value: 'cancelled' }
                                        ]}
                                    />
                                </Form.Item>

                                <Form.Item name="date_range" label="Date Range">
                                    <RangePicker 
                                        className="w-full"
                                        format="DD/MM/YYYY"
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

                        <InvoiceCreate
                            show={showCreateModal}
                            onClose={() => setShowCreateModal(false)}
                            auth={auth}
                        />
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
