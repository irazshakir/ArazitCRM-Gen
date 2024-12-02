import { useEffect } from 'react';
import { Head } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Form, Input, Select, DatePicker, Switch, Card, Button, message } from 'antd';
import dayjs from 'dayjs';
import { router } from '@inertiajs/react';

export default function MarketingEdit({ auth, marketing, leadSources }) {
    const [form] = Form.useForm();

    useEffect(() => {
        form.setFieldsValue({
            ...marketing,
            start_date: dayjs(marketing.start_date),
            end_date: dayjs(marketing.end_date),
        });
    }, [marketing]);

    const handleSubmit = async (values) => {
        try {
            await router.put(route('marketing.update', marketing.id), {
                ...values,
                start_date: values.start_date.format('YYYY-MM-DD'),
                end_date: values.end_date.format('YYYY-MM-DD'),
            });
            message.success('Campaign updated successfully');
        } catch (error) {
            message.error('Failed to update campaign');
        }
    };

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Edit Marketing Campaign" />

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <Card title="Edit Marketing Campaign">
                        <Form
                            form={form}
                            layout="vertical"
                            onFinish={handleSubmit}
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

                            <Form.Item>
                                <Button
                                    type="primary"
                                    htmlType="submit"
                                    style={{
                                        backgroundColor: '#a92479',
                                        borderColor: '#a92479'
                                    }}
                                >
                                    Update Campaign
                                </Button>
                            </Form.Item>
                        </Form>
                    </Card>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
