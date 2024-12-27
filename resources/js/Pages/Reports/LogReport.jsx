import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import { Card, Row, Col, Drawer, Form, Select, DatePicker, Button, Space, Table, Typography } from 'antd';
import { FilterOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { router } from '@inertiajs/react';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { Title } = Typography;

export default function LogReport({ auth, stats, users }) {
    const [showFilterDrawer, setShowFilterDrawer] = useState(false);
    const [loading, setLoading] = useState(false);
    const [form] = Form.useForm();

    const [filters, setFilters] = useState({
        start_date: dayjs().startOf('month').format('YYYY-MM-DD'),
        end_date: dayjs().endOf('month').format('YYYY-MM-DD'),
        user_id: null
    });

    const handleFilter = (values) => {
        setLoading(true);
        router.get(route('reports.logs'), {
            ...values,
            start_date: values.date_range?.[0]?.format('YYYY-MM-DD'),
            end_date: values.date_range?.[1]?.format('YYYY-MM-DD'),
        }, {
            preserveState: true,
            preserveScroll: true,
            onFinish: () => {
                setLoading(false);
                setShowFilterDrawer(false);
            }
        });
    };

    const clearFilters = () => {
        setLoading(true);
        form.resetFields();
        router.get(route('reports.logs'), {}, {
            preserveState: true,
            preserveScroll: true,
            onFinish: () => {
                setLoading(false);
                setShowFilterDrawer(false);
            }
        });
    };

    const columns = [
        {
            title: 'Lead Name',
            dataIndex: 'lead_name',
            key: 'lead_name',
        },
        {
            title: 'Phone',
            dataIndex: 'phone',
            key: 'phone',
        },
        {
            title: 'Activity',
            dataIndex: 'activity_type',
            key: 'activity_type',
            render: (type, record) => {
                const details = record.activity_details ? JSON.parse(record.activity_details) : {};
                const activityMap = {
                    note_added: 'Note Added',
                    document_uploaded: 'Document Uploaded',
                    status_updated: `Status Updated${details.new_status ? ` to ${details.new_status}` : ''}`,
                    field_updated: `${details.field || 'Field'} Updated`,
                    lead_assigned: `Lead Assigned${details.to_user ? ` to ${details.to_user}` : ''}`,
                    lead_closed: 'Lead Closed',
                    lead_won: 'Lead Won',
                    followup_scheduled: `Follow-up Scheduled${details.date ? ` for ${dayjs(details.date).format('YYYY-MM-DD')}` : ''}`
                };
                return activityMap[type] || type;
            }
        },
        {
            title: 'User',
            dataIndex: 'user_name',
            key: 'user_name',
        },
        {
            title: 'Timestamp',
            dataIndex: 'timestamp',
            key: 'timestamp',
            render: (text) => dayjs(text).format('YYYY-MM-DD HH:mm:ss')
        },
    ];

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={
                <h2 className="font-semibold text-xl text-gray-800 leading-tight">
                    Activity Logs Report
                </h2>
            }
        >
            <Head title="Activity Logs Report" />

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="flex justify-end mb-4">
                        <Button
                            type="primary"
                            icon={<FilterOutlined />}
                            onClick={() => setShowFilterDrawer(true)}
                            style={{
                                backgroundColor: '#85115b',
                                borderColor: '#85115b'
                            }}
                        >
                            Filter
                        </Button>
                    </div>

                    <Row gutter={[16, 16]}>
                        <Col xs={24}>
                            <Card loading={loading}>
                                <Title level={4}>Leads Handled</Title>
                                <div className="text-3xl font-bold">
                                    {stats?.leads_handled || 0}
                                </div>
                            </Card>
                        </Col>
                    </Row>

                    <div className="mt-4">
                        <Card loading={loading}>
                            <Table
                                columns={columns}
                                dataSource={stats?.activities || []}
                                rowKey="id"
                                pagination={{ pageSize: 10 }}
                            />
                        </Card>
                    </div>
                </div>
            </div>

            <Drawer
                title="Filter Options"
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
                        date_range: [dayjs(filters.start_date), dayjs(filters.end_date)],
                        user_id: filters.user_id
                    }}
                >
                    <Form.Item
                        name="date_range"
                        label="Date Range"
                    >
                        <RangePicker
                            style={{ width: '100%' }}
                            format="YYYY-MM-DD"
                        />
                    </Form.Item>

                    <Form.Item
                        name="user_id"
                        label="User"
                    >
                        <Select
                            allowClear
                            placeholder="Select User"
                            options={users?.map(user => ({
                                label: user.name,
                                value: user.id
                            }))}
                        />
                    </Form.Item>

                    <Form.Item>
                        <Space>
                            <Button 
                                type="primary" 
                                htmlType="submit"
                                style={{
                                    backgroundColor: '#85115b',
                                    borderColor: '#85115b'
                                }}
                            >
                                Apply Filters
                            </Button>
                            <Button onClick={clearFilters}>
                                Clear Filters
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Drawer>
        </AuthenticatedLayout>
    );
}