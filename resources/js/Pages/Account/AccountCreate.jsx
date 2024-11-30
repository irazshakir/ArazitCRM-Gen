import { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, InputNumber, Upload, Button, message } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { router } from '@inertiajs/react';

export default function AccountCreate({ show, onClose, auth, invoices }) {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [fileList, setFileList] = useState([]);
    const [showVendorName, setShowVendorName] = useState(false);
    const [showInvoiceSelect, setShowInvoiceSelect] = useState(false);

    // Watch payment_type changes
    const paymentType = Form.useWatch('payment_type', form);

    useEffect(() => {
        if (paymentType) {
            // Set transaction_type based on payment_type
            const transactionType = paymentType === 'Received' ? 'Credit' : 'Debit';
            form.setFieldValue('transaction_type', transactionType);
            
            // Show/hide vendor name field
            setShowVendorName(paymentType === 'Vendor Payment');
            
            // Show/hide invoice select for both Received and Refunded
            setShowInvoiceSelect(paymentType === 'Received' || paymentType === 'Refunded');
        }
    }, [paymentType]);

    const handleSubmit = async (values) => {
        setLoading(true);
        
        const formData = new FormData();
        Object.keys(values).forEach(key => {
            if (values[key] !== undefined && values[key] !== null) {
                formData.append(key, values[key]);
            }
        });

        if (fileList.length > 0) {
            formData.append('document', fileList[0].originFileObj);
        }

        router.post(route('accounts.store'), formData, {
            onSuccess: () => {
                message.success('Transaction created successfully');
                form.resetFields();
                setFileList([]);
                onClose();
            },
            onError: (errors) => {
                message.error('Failed to create transaction');
                console.error(errors);
            },
            onFinish: () => setLoading(false),
        });
    };

    // Get appropriate invoice list based on payment type
    const getFilteredInvoices = () => {
        if (paymentType === 'Received') {
            return invoices?.filter(invoice => 
                ['pending', 'partially_paid'].includes(invoice.status) && 
                invoice.amount_remaining > 0
            );
        } else if (paymentType === 'Refunded') {
            return invoices?.filter(invoice => 
                ['paid', 'partially_paid'].includes(invoice.status) && 
                invoice.amount_received > 0
            );
        }
        return [];
    };

    return (
        <Modal
            title="Add New Transaction"
            open={show}
            onCancel={onClose}
            onOk={() => form.submit()}
            confirmLoading={loading}
            width={600}
            okText="Create"
            okButtonProps={{
                style: {
                    backgroundColor: '#a92479',
                    borderColor: '#a92479',
                }
            }}
        >
            <Form
                form={form}
                layout="vertical"
                onFinish={handleSubmit}
                className="mt-4"
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

                {showInvoiceSelect && (
                    <Form.Item
                        name="invoice_id"
                        label={`Select Invoice for ${paymentType}`}
                        rules={[{ required: true, message: 'Please select an invoice' }]}
                    >
                        <Select
                            showSearch
                            placeholder="Search invoices"
                            optionFilterProp="children"
                            filterOption={(input, option) =>
                                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                            }
                            options={getFilteredInvoices().map(invoice => ({
                                value: invoice.id,
                                label: `${invoice.invoice_number} - Rs. ${parseFloat(invoice.amount).toLocaleString()} ${
                                    paymentType === 'Received' 
                                        ? `(Remaining: Rs. ${parseFloat(invoice.amount_remaining).toLocaleString()})`
                                        : `(Paid: Rs. ${parseFloat(invoice.amount_received).toLocaleString()})`
                                }`
                            }))}
                        />
                    </Form.Item>
                )}

                <Form.Item
                    name="payment_mode"
                    label="Payment Mode"
                    rules={[{ required: true }]}
                >
                    <Select>
                        <Select.Option value="Cash">Cash</Select.Option>
                        <Select.Option value="Online">Online</Select.Option>
                        <Select.Option value="Cheque">Cheque</Select.Option>
                    </Select>
                </Form.Item>

                <Form.Item
                    name="transaction_type"
                    label="Transaction Type"
                    rules={[{ required: true }]}
                >
                    <Select disabled>
                        <Select.Option value="Credit">Credit</Select.Option>
                        <Select.Option value="Debit">Debit</Select.Option>
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

                {showVendorName && (
                    <Form.Item
                        name="vendor_name"
                        label="Vendor Name"
                        rules={[{ required: true, message: 'Please enter vendor name' }]}
                    >
                        <Input />
                    </Form.Item>
                )}

                <Form.Item
                    name="notes"
                    label="Notes"
                >
                    <Input.TextArea rows={4} />
                </Form.Item>

                <Form.Item
                    name="document"
                    label="Document"
                >
                    <Upload
                        beforeUpload={() => false}
                        fileList={fileList}
                        onChange={({ fileList }) => setFileList(fileList)}
                        maxCount={1}
                    >
                        <Button icon={<UploadOutlined />}>Upload Document</Button>
                    </Upload>
                </Form.Item>
            </Form>
        </Modal>
    );
}
