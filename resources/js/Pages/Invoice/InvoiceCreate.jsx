import { useState, useEffect } from 'react';
import { Modal, Form, Select, Input, Button, Space, InputNumber, message } from 'antd';
import { PlusOutlined, MinusCircleOutlined } from '@ant-design/icons';
import { router } from '@inertiajs/react';
import dayjs from 'dayjs';

export default function InvoiceCreate({ show, onClose, auth }) {
    const [form] = Form.useForm();
    const [wonLeads, setWonLeads] = useState([]);
    const [loading, setLoading] = useState(false);
    const [totalAmount, setTotalAmount] = useState(0);

    useEffect(() => {
        if (show) {
            fetchWonLeads();
        }
    }, [show]);

    const fetchWonLeads = async () => {
        try {
            const response = await fetch(route('invoices.won-leads'));
            const data = await response.json();
            setWonLeads(data);
        } catch (error) {
            message.error('Failed to fetch leads');
        }
    };

    const calculateTotal = (items = []) => {
        const total = items.reduce((sum, item) => {
            return sum + (parseFloat(item.amount) || 0);
        }, 0);
        setTotalAmount(total);
        return total;
    };

    const handleSubmit = async (values) => {
        setLoading(true);
        const total = calculateTotal(values.invoice_items);
        
        const formData = {
            ...values,
            total_amount: total,
            amount_received: values.amount_received || 0,
            amount_remaining: total - (values.amount_received || 0),
            created_by: auth?.user?.id,
            updated_by: auth?.user?.id,
        };

        router.post(route('invoices.store'), formData, {
            onSuccess: () => {
                message.success('Invoice created successfully');
                form.resetFields();
                onClose();
            },
            onError: (errors) => {
                message.error(Object.values(errors)[0]);
            },
            onFinally: () => {
                setLoading(false);
            }
        });
    };

    return (
        <Modal
            title="Create Invoice"
            open={show}
            onCancel={onClose}
            footer={null}
            width={800}
        >
            <Form
                form={form}
                layout="vertical"
                onFinish={handleSubmit}
                initialValues={{
                    invoice_items: [{}],
                    status: 'draft'
                }}
            >
                <div className="grid grid-cols-2 gap-4">
                    <Form.Item
                        label="Date"
                        name="created_at"
                        initialValue={dayjs().format('YYYY-MM-DD')}
                    >
                        <Input disabled />
                    </Form.Item>

                    <Form.Item
                        label="Invoice Number"
                        name="invoice_number"
                        initialValue={`Loading...`}
                    >
                        <Input disabled />
                    </Form.Item>
                </div>

                <Form.Item
                    name="lead_id"
                    label="Client"
                    rules={[{ required: true, message: 'Please select a client' }]}
                >
                    <Select
                        placeholder="Select client"
                        options={wonLeads.map(lead => ({
                            label: lead.name,
                            value: lead.id
                        }))}
                    />
                </Form.Item>

                <div className="border rounded-lg p-4 mb-4">
                    <h3 className="text-lg font-medium mb-4">Services</h3>
                    <Form.List name="invoice_items">
                        {(fields, { add, remove }) => (
                            <>
                                {fields.map(({ key, name, ...restField }) => (
                                    <Space key={key} className="flex items-start mb-4" align="baseline">
                                        <Form.Item
                                            {...restField}
                                            name={[name, 'service_name']}
                                            rules={[{ required: true, message: 'Service name required' }]}
                                        >
                                            <Input placeholder="Service name" style={{ width: 200 }} />
                                        </Form.Item>
                                        <Form.Item
                                            {...restField}
                                            name={[name, 'description']}
                                        >
                                            <Input.TextArea placeholder="Description" style={{ width: 300 }} />
                                        </Form.Item>
                                        <Form.Item
                                            {...restField}
                                            name={[name, 'amount']}
                                            rules={[{ required: true, message: 'Amount required' }]}
                                        >
                                            <InputNumber
                                                placeholder="Amount"
                                                style={{ width: 150 }}
                                                onChange={() => {
                                                    const values = form.getFieldValue('invoice_items');
                                                    calculateTotal(values);
                                                }}
                                            />
                                        </Form.Item>
                                        {fields.length > 1 && (
                                            <MinusCircleOutlined onClick={() => remove(name)} />
                                        )}
                                    </Space>
                                ))}
                                <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                                    Add Service
                                </Button>
                            </>
                        )}
                    </Form.List>
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <Form.Item label="Total Amount">
                        <InputNumber
                            value={totalAmount}
                            disabled
                            style={{ width: '100%' }}
                        />
                    </Form.Item>

                    <Form.Item
                        name="amount_received"
                        label="Amount Received"
                    >
                        <InputNumber
                            style={{ width: '100%' }}
                            max={totalAmount}
                        />
                    </Form.Item>

                    <Form.Item label="Remaining Amount">
                        <InputNumber
                            value={totalAmount - (form.getFieldValue('amount_received') || 0)}
                            disabled
                            style={{ width: '100%' }}
                        />
                    </Form.Item>
                </div>

                <div className="flex justify-end gap-2">
                    <Button onClick={onClose}>
                        Cancel
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
                        Create Invoice
                    </Button>
                </div>
            </Form>
        </Modal>
    );
}
