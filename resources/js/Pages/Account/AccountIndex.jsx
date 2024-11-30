import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Table, Button, Space, Popconfirm, message, Drawer, Form, Input, Select, Card, Statistic, Tag, DatePicker } from 'antd';
import { PlusOutlined, FilterOutlined, ClearOutlined } from '@ant-design/icons';
import AccountCreate from './AccountCreate';
import moment from 'moment';

const { Search } = Input;
const { RangePicker } = DatePicker;

export default function AccountIndex({ auth, accounts, stats, filters, invoices }) {
    if (!auth?.user) {
        return <div>Loading...</div>;
    }

    const [loading, setLoading] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showFilterDrawer, setShowFilterDrawer] = useState(false);
    const [form] = Form.useForm();
    const [searchText, setSearchText] = useState('');

    const hasActiveFilters = Object.keys(filters || {}).length > 0;

    const handleFilter = (values) => {
        const filterData = { ...values };
        
        // Format date range if selected
        if (values.date_range) {
            filterData.start_date = values.date_range[0].format('YYYY-MM-DD');
            filterData.end_date = values.date_range[1].format('YYYY-MM-DD');
            delete filterData.date_range;
        }

        setShowFilterDrawer(false);
        router.get(route('accounts.index'), {
            ...filterData,
            page: 1,
        }, {
            preserveState: true,
            preserveScroll: false,
        });
    };

    const clearFilters = () => {
        form.resetFields();
        router.get(route('accounts.index'), {}, {
            preserveState: true,
            preserveScroll: false,
        });
    };

    const handleDelete = async (id) => {
        try {
            await router.delete(route('accounts.destroy', id), {
                onSuccess: () => message.success('Transaction deleted successfully'),
                onError: () => message.error('Failed to delete transaction')
            });
        } catch (error) {
            message.error('Failed to delete transaction');
        }
    };

    const handleSearch = (value) => {
        router.get(route('accounts.index'), {
            ...filters,
            search: value,
            page: 1,
        }, {
            preserveState: true,
            preserveScroll: false,
        });
    };

    const columns = [
        {
            title: 'SR',
            key: 'index',
            render: (_, __, index) => index + 1,
            width: 60,
        },
        {
            title: 'Payment',
            dataIndex: 'payment_type',
            key: 'payment_type',
            render: (type) => (
                <Tag color={
                    type === 'Received' ? 'green' :
                    type === 'Refunded' ? 'orange' :
                    type === 'Expenses' ? 'red' :
                    'blue'
                }>
                    {type}
                </Tag>
            ),
        },
        {
            title: 'Mode',
            dataIndex: 'payment_mode',
            key: 'payment_mode',
        },
        {
            title: 'Type',
            dataIndex: 'transaction_type',
            key: 'transaction_type',
            render: (type) => (
                <Tag color={type === 'Credit' ? 'green' : 'red'}>
                    {type}
                </Tag>
            ),
        },
        {
            title: 'Amount',
            dataIndex: 'amount',
            key: 'amount',
            render: (amount) => `Rs. ${parseFloat(amount).toFixed(2)}`,
        },
        {
            title: 'Client/Vendor',
            key: 'client_vendor',
            render: (_, record) => {
                if (record.payment_type === 'Vendor Payment') {
                    return record.vendor_name || '-';
                }
                return record.invoice?.lead?.name || '-';
            },
        },
        {
            title: 'Invoice #',
            key: 'invoice_number',
            render: (_, record) => record.invoice?.invoice_number || '-',
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                <Space>
                    <Button
                        type="primary"
                        size="small"
                        onClick={() => router.get(route('accounts.edit', record.id))}
                        style={{
                            backgroundColor: '#a92479',
                            borderColor: '#a92479',
                        }}
                    >
                        Edit
                    </Button>
                    <Popconfirm
                        title="Delete Transaction"
                        description="Are you sure you want to delete this transaction?"
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
            <Head title="Accounts" />

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg p-6">
                        {/* Stats Cards */}
                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-4 mb-6">
                            <Card>
                                <Statistic
                                    title="Total Income"
                                    value={stats.total_income}
                                    precision={2}
                                    prefix="Rs. "
                                    valueStyle={{ color: '#3f8600' }}
                                />
                            </Card>
                            <Card>
                                <Statistic
                                    title="Total Expenses"
                                    value={stats.total_expenses}
                                    precision={2}
                                    prefix="Rs. "
                                    valueStyle={{ color: '#cf1322' }}
                                />
                            </Card>
                            <Card>
                                <Statistic
                                    title="Total Refunds"
                                    value={stats.total_refunds}
                                    precision={2}
                                    prefix="Rs. "
                                    valueStyle={{ color: '#faad14' }}
                                />
                            </Card>
                            <Card>
                                <Statistic
                                    title="Net Balance"
                                    value={stats.net_balance}
                                    precision={2}
                                    prefix="Rs. "
                                />
                            </Card>
                        </div>

                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl text-gray-600">Transactions</h2>
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
                                    Add Transaction
                                </Button>
                            </div>
                        </div>

                        <Table
                            columns={columns}
                            dataSource={accounts?.data || []}
                            rowKey="id"
                            loading={loading}
                            pagination={{
                                total: accounts?.meta?.total || 0,
                                pageSize: accounts?.meta?.per_page || 10,
                                current: accounts?.meta?.current_page || 1,
                                showSizeChanger: true,
                                showTotal: (total, range) => 
                                    `${range[0]}-${range[1]} of ${total} transactions`,
                            }}
                        />

                        <AccountCreate
                            show={showCreateModal}
                            onClose={() => setShowCreateModal(false)}
                            auth={auth}
                            invoices={invoices}
                        />

                        <Drawer
                            title="Filter Transactions"
                            placement="right"
                            onClose={() => setShowFilterDrawer(false)}
                            open={showFilterDrawer}
                            width={400}
                        >
                            <Form
                                form={form}
                                layout="vertical"
                                onFinish={handleFilter}
                                initialValues={{
                                    ...filters,
                                    date_range: filters.start_date && filters.end_date ? 
                                        [moment(filters.start_date), moment(filters.end_date)] : null
                                }}
                            >
                                <Form.Item name="date_range" label="Date Range">
                                    <RangePicker 
                                        style={{ width: '100%' }}
                                        format="YYYY-MM-DD"
                                    />
                                </Form.Item>

                                <Form.Item name="payment_type" label="Payment Type">
                                    <Select allowClear>
                                        <Select.Option value="Received">Received</Select.Option>
                                        <Select.Option value="Refunded">Refunded</Select.Option>
                                        <Select.Option value="Expenses">Expenses</Select.Option>
                                        <Select.Option value="Vendor Payment">Vendor Payment</Select.Option>
                                    </Select>
                                </Form.Item>

                                <Form.Item name="payment_mode" label="Payment Mode">
                                    <Select allowClear>
                                        <Select.Option value="Cash">Cash</Select.Option>
                                        <Select.Option value="Online">Online</Select.Option>
                                        <Select.Option value="Cheque">Cheque</Select.Option>
                                    </Select>
                                </Form.Item>

                                <Form.Item name="transaction_type" label="Transaction Type">
                                    <Select allowClear>
                                        <Select.Option value="Credit">Credit</Select.Option>
                                        <Select.Option value="Debit">Debit</Select.Option>
                                    </Select>
                                </Form.Item>

                                <Form.Item label="Search" name="search">
                                    <Search
                                        placeholder="Search by invoice number or name"
                                        allowClear
                                        onSearch={handleSearch}
                                        style={{ width: '100%' }}
                                    />
                                </Form.Item>

                                <Button type="primary" htmlType="submit" block
                                    style={{
                                        backgroundColor: '#a92479',
                                        borderColor: '#a92479',
                                    }}
                                >
                                    Apply Filters
                                </Button>
                            </Form>
                        </Drawer>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
