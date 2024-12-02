import { useState } from 'react';
import { Modal, Form, Input, Select, DatePicker, Switch, message } from 'antd';
import { router } from '@inertiajs/react';

export default function MarketingCreate({ show, onClose, leadSources }) {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (values) => {
        setLoading(true);
        try {
            await router.post(route('marketing.store'), {
                ...values,
                start_date: values.start_date.format('YYYY-MM-DD'),
                end_date: values.end_date.format('YYYY-MM-DD'),
            });
            message.success('Campaign created successfully');
            form.resetFields();
            onClose();
        } catch (error) {
            message.error('Failed to create campaign');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            title="Create Marketing Campaign"
            open={show}
            onCancel={onClose}
            okText="Create"
            confirmLoading={loading}
            onOk={() => form.submit()}
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
                initialValues={{
                    campaign_status: true
                }}
            >
                <Form.Item
                    name="campaign_name"
                    label="Campaign Name"
                    rules={[{ required: true, message: 'Please enter campaign name' }]}
                >
                    <Input placeholder="Enter campaign name" />
                </Form.Item>

                <Form.Item
                    name="cost"
                    label="Cost"
                    rules={[{ required: true, message: 'Please enter cost' }]}
                >
                    <Input
                        type="number"
                        step="0.01"
                        prefix="Rs"
                        placeholder="Enter campaign cost"
                    />
                </Form.Item>

                <Form.Item
                    name="lead_source"
                    label="Lead Source"
                    rules={[{ required: true, message: 'Please select lead source' }]}
                >
                    <Select
                        placeholder="Select lead source"
                        options={leadSources.map(source => ({
                            label: source,
                            value: source
                        }))}
                    />
                </Form.Item>

                <Form.Item
                    name="start_date"
                    label="Start Date"
                    rules={[{ required: true, message: 'Please select start date' }]}
                >
                    <DatePicker style={{ width: '100%' }} />
                </Form.Item>

                <Form.Item
                    name="end_date"
                    label="End Date"
                    rules={[{ required: true, message: 'Please select end date' }]}
                >
                    <DatePicker style={{ width: '100%' }} />
                </Form.Item>

                <Form.Item
                    name="campaign_status"
                    label="Campaign Status"
                    valuePropName="checked"
                >
                    <Switch />
                </Form.Item>
            </Form>
        </Modal>
    );
}
