import { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Form, Input, InputNumber, Button, Space, Table, Modal, DatePicker, Select, message, Popconfirm } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

export default function InvoiceEdit({ auth, invoice }) {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentForm] = Form.useForm();
    const [paymentLoading, setPaymentLoading] = useState(false);

    const handleSubmit = (values) => {
        setLoading(true);
        router.put(route('invoices.update', invoice.id), {
            ...values,
            amount_remaining: invoice.total_amount - values.amount_received,
        }, {
            onSuccess: () => {
                message.success('Invoice updated successfully');
                setLoading(false);
            },
            onError: (errors) => {
                message.error(Object.values(errors)[0]);
                setLoading(false);
            }
        });
    };

    const handleAddPayment = (values) => {
        setPaymentLoading(true);
        router.post(route('invoice-payments.store'), {
            ...values,
            invoice_id: invoice.id
        }, {
            onSuccess: () => {
                message.success('Payment added successfully');
                paymentForm.resetFields();
                setShowPaymentModal(false);
            },
            onError: (errors) => {
                message.error(Object.values(errors)[0]);
            },
            onFinally: () => {
                setPaymentLoading(false);
            }
        });
    };

    const handleDeletePayment = async (paymentId) => {
        try {
            await router.delete(route('invoice-payments.destroy', paymentId), {
                onSuccess: () => {
                    message.success('Payment deleted successfully');
                },
                onError: () => {
                    message.error('Failed to delete payment');
                }
            });
        } catch (error) {
            message.error('Failed to delete payment');
        }
    };

    const paymentColumns = [
        {
            title: 'Date',
            dataIndex: 'payment_date',
            key: 'payment_date',
            render: (date) => dayjs(date).format('DD/MM/YYYY'),
        },
        {
            title: 'Amount',
            dataIndex: 'amount',
            key: 'amount',
            render: (amount) => `Rs. ${parseFloat(amount).toFixed(2)}`,
        },
        {
            title: 'Method',
            dataIndex: 'payment_method',
            key: 'payment_method',
        },
        {
            title: 'Reference',
            dataIndex: 'transaction_reference',
            key: 'transaction_reference',
        },
        {
            title: 'Notes',
            dataIndex: 'notes',
            key: 'notes',
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                <Popconfirm
                    title="Delete Payment"
                    description="Are you sure you want to delete this payment?"
                    onConfirm={() => handleDeletePayment(record.id)}
                    okText="Yes"
                    cancelText="No"
                    okButtonProps={{ danger: true }}
                >
                    <Button 
                        danger 
                        size="small"
                        icon={<DeleteOutlined />}
                    >
                        Delete
                    </Button>
                </Popconfirm>
            ),
        }
    ];

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Edit Invoice" />

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="flex gap-6">
                        {/* Main Invoice Edit Form */}
                        <div className="w-1/3 bg-white overflow-hidden shadow-sm sm:rounded-lg p-6">
                            <h2 className="text-2xl font-semibold text-gray-800 mb-6">Edit Invoice</h2>

                            <Form
                                form={form}
                                layout="vertical"
                                onFinish={handleSubmit}
                                initialValues={{
                                    invoice_number: invoice.invoice_number,
                                    total_amount: invoice.total_amount,
                                    amount_received: invoice.amount_received,
                                    amount_remaining: invoice.amount_remaining,
                                    notes: invoice.notes,
                                }}
                            >
                                <Form.Item
                                    label="Invoice Number"
                                    name="invoice_number"
                                >
                                    <Input disabled />
                                </Form.Item>

                                <Form.Item
                                    label="Total Amount"
                                    name="total_amount"
                                >
                                    <InputNumber
                                        className="w-full"
                                        disabled
                                        formatter={value => `Rs. ${value}`}
                                    />
                                </Form.Item>

                                <Form.Item
                                    label="Amount Received"
                                    name="amount_received"
                                >
                                    <InputNumber
                                        className="w-full"
                                        disabled
                                        formatter={value => `Rs. ${value}`}
                                    />
                                </Form.Item>

                                <Form.Item
                                    label="Amount Remaining"
                                    name="amount_remaining"
                                >
                                    <InputNumber
                                        className="w-full"
                                        disabled
                                        formatter={value => `Rs. ${value}`}
                                    />
                                </Form.Item>

                                <Form.Item
                                    label="Notes"
                                    name="notes"
                                >
                                    <Input.TextArea rows={4} />
                                </Form.Item>

                                <div className="flex justify-between items-center">
                                    <Button
                                        type="primary"
                                        onClick={() => setShowPaymentModal(true)}
                                        icon={<PlusOutlined />}
                                        style={{
                                            backgroundColor: '#52c41a',
                                            borderColor: '#52c41a'
                                        }}
                                    >
                                        Add Payment
                                    </Button>

                                    <Button
                                        type="primary"
                                        htmlType="submit"
                                        loading={loading}
                                        style={{
                                            backgroundColor: '#a92479',
                                            borderColor: '#a92479'
                                        }}
                                    >
                                        Update Invoice
                                    </Button>
                                </div>
                            </Form>
                        </div>

                        {/* Payment History */}
                        <div className="flex-1 bg-white overflow-hidden shadow-sm sm:rounded-lg p-6">
                            <h3 className="text-lg font-medium text-gray-700 mb-4">Payment History</h3>
                            <Table
                                columns={paymentColumns}
                                dataSource={invoice.invoice_payments}
                                rowKey="id"
                                pagination={false}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Add Payment Modal */}
            <Modal
                title="Add Payment"
                open={showPaymentModal}
                onCancel={() => setShowPaymentModal(false)}
                footer={null}
            >
                <Form
                    form={paymentForm}
                    layout="vertical"
                    onFinish={handleAddPayment}
                >
                    <Form.Item
                        name="amount"
                        label="Amount"
                        rules={[{ required: true, message: 'Please enter amount' }]}
                    >
                        <InputNumber
                            className="w-full"
                            formatter={(value) => (value ? `Rs. ${value}` : '')}
                            parser={(value) => value.replace(/Rs\.\s?/g, '')}
                            max={invoice.amount_remaining}
                            precision={2}
                            step={0.01}
                            style={{ width: '100%' }}
                        />
                    </Form.Item>

                    <Form.Item
                        name="payment_date"
                        label="Payment Date"
                        rules={[{ required: true, message: 'Please select date' }]}
                    >
                        <DatePicker className="w-full" />
                    </Form.Item>

                    <Form.Item
                        name="payment_method"
                        label="Payment Method"
                        rules={[{ required: true, message: 'Please select payment method' }]}
                    >
                        <Select>
                            <Select.Option value="cash">Cash</Select.Option>
                            <Select.Option value="bank_transfer">Bank Transfer</Select.Option>
                            <Select.Option value="cheque">Cheque</Select.Option>
                        </Select>
                    </Form.Item>

                    <Form.Item
                        name="transaction_reference"
                        label="Transaction Reference"
                    >
                        <Input />
                    </Form.Item>

                    <Form.Item
                        name="notes"
                        label="Notes"
                    >
                        <Input.TextArea rows={4} />
                    </Form.Item>

                    <div className="flex justify-end gap-2">
                        <Button onClick={() => setShowPaymentModal(false)}>
                            Cancel
                        </Button>
                        <Button
                            type="primary"
                            htmlType="submit"
                            loading={paymentLoading}
                            style={{
                                backgroundColor: '#a92479',
                                borderColor: '#a92479'
                            }}
                        >
                            {paymentLoading ? 'Adding Payment...' : 'Add Payment'}
                        </Button>
                    </div>
                </Form>
            </Modal>
        </AuthenticatedLayout>
    );
}
