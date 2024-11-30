import { Head } from '@inertiajs/react';
import { Form, Input, Select, InputNumber, Card, Button, message, Typography, Image } from 'antd';
import { router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

const { Text } = Typography;

export default function AccountEdit({ auth, account }) {
    const [form] = Form.useForm();

    const handleSubmit = (values) => {
        const originalAmount = parseFloat(account.amount);
        const newAmount = parseFloat(values.amount);
        const amountDifference = newAmount - originalAmount;

        const formData = new FormData();
        formData.append('payment_type', values.payment_type);
        formData.append('amount', newAmount);
        formData.append('original_amount', originalAmount);
        formData.append('amount_difference', amountDifference);
        formData.append('has_invoice', !!account.invoice_id);
        formData.append('_method', 'PUT');

        router.post(route('accounts.update', account.id), formData, {
            onSuccess: () => {
                message.success('Transaction updated successfully');
                router.get(route('accounts.index'));
            },
            onError: (errors) => {
                message.error('Failed to update transaction');
                console.error(errors);
            },
        });
    };

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Edit Transaction" />

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <Card title="Edit Transaction" className="shadow-sm">
                        <div className="grid grid-cols-2 gap-6 mb-6">
                            <div>
                                <Text strong>Created By:</Text>
                                <div>{account.creator?.name}</div>
                            </div>
                            {account.invoice && (
                                <div>
                                    <Text strong>Invoice Number:</Text>
                                    <div>{account.invoice.invoice_number}</div>
                                </div>
                            )}
                            <div>
                                <Text strong>Payment Mode:</Text>
                                <div>{account.payment_mode}</div>
                            </div>
                            <div>
                                <Text strong>Transaction Type:</Text>
                                <div>{account.transaction_type}</div>
                            </div>
                            {account.vendor_name && (
                                <div>
                                    <Text strong>Vendor Name:</Text>
                                    <div>{account.vendor_name}</div>
                                </div>
                            )}
                            {account.document_path && (
                                <div className="col-span-2">
                                    <Text strong>Document:</Text>
                                    <div className="mt-2">
                                        <Image
                                            src={`/storage/${account.document_path}`}
                                            alt="Document"
                                            width={200}
                                            fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMAAAADA..."
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        <Form
                            form={form}
                            layout="vertical"
                            onFinish={handleSubmit}
                            initialValues={account}
                            className="max-w-2xl"
                        >
                            <Form.Item
                                name="payment_type"
                                label="Payment Type"
                                rules={[{ required: true }]}
                            >
                                <Select>
                                    <Select.Option value="Received">Received</Select.Option>
                                    <Select.Option value="Refunded">Refunded</Select.Option>
                                    <Select.Option value="Expenses">Expenses</Select.Option>
                                    <Select.Option value="Vendor Payment">Vendor Payment</Select.Option>
                                </Select>
                            </Form.Item>

                            <Form.Item
                                name="amount"
                                label="Amount"
                                rules={[{ required: true }]}
                            >
                                <InputNumber
                                    className="w-full"
                                    formatter={value => `Rs. ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                    parser={value => value.replace(/Rs\.\s?|(,*)/g, '')}
                                    min={0}
                                />
                            </Form.Item>

                            <Form.Item className="mb-0">
                                <div className="flex justify-end gap-4">
                                    <Button onClick={() => router.get(route('accounts.index'))}>
                                        Cancel
                                    </Button>
                                    <Button
                                        type="primary"
                                        htmlType="submit"
                                        style={{
                                            backgroundColor: '#a92479',
                                            borderColor: '#a92479',
                                        }}
                                    >
                                        Update Transaction
                                    </Button>
                                </div>
                            </Form.Item>
                        </Form>
                    </Card>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
