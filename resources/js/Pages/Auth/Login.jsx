import { useEffect } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import { Form, Input, Button, Checkbox, Card, Typography, Spin, Space } from 'antd';
import { UserOutlined, LockOutlined, TeamOutlined, BarChartOutlined, 
    DollarOutlined, PhoneOutlined, MessageOutlined } from '@ant-design/icons';
import GuestLayout from '@/Layouts/GuestLayout';

const { Title, Text } = Typography;

export default function Login({ status, canResetPassword, settings }) {
    const { data, setData, post, processing, errors } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    const onFinish = () => {
        post(route('login'));
    };

    return (
        <GuestLayout>
            <Head title="Log in" />
            <Spin spinning={processing} size="large">
                <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
                    <div className="max-w-7xl w-full flex gap-12">
                        {/* Left side - CRM Features */}
                        <div className="hidden lg:flex flex-col justify-center w-1/2">
                            <Title level={2} className="text-[#a92479] mb-8">
                                Welcome to Our CRM Platform
                            </Title>
                            <Space direction="vertical" size="large" className="w-full">
                                <Card className="bg-white/50 border border-[#a92479]/20">
                                    <Space>
                                        <TeamOutlined className="text-2xl text-[#a92479]" />
                                        <div>
                                            <Text strong>Lead Management</Text>
                                            <Text className="block text-gray-600">
                                                Efficiently track and manage your leads
                                            </Text>
                                        </div>
                                    </Space>
                                </Card>
                                <Card className="bg-white/50 border border-[#a92479]/20">
                                    <Space>
                                        <BarChartOutlined className="text-2xl text-[#a92479]" />
                                        <div>
                                            <Text strong>Analytics & Reports</Text>
                                            <Text className="block text-gray-600">
                                                Detailed insights and performance metrics
                                            </Text>
                                        </div>
                                    </Space>
                                </Card>
                                <Card className="bg-white/50 border border-[#a92479]/20">
                                    <Space>
                                        <DollarOutlined className="text-2xl text-[#a92479]" />
                                        <div>
                                            <Text strong>Sales Tracking</Text>
                                            <Text className="block text-gray-600">
                                                Monitor sales pipeline and revenue
                                            </Text>
                                        </div>
                                    </Space>
                                </Card>
                            </Space>
                        </div>

                        {/* Right side - Login Form */}
                        <div className="w-full lg:w-1/2 max-w-md mx-auto">
                            <Card className="w-full shadow-lg border-[#a92479]/20">
                                <div className="mb-8 text-center">
                                    {/* Logo and Company Name */}
                                    <div className="flex flex-col items-center mb-4">
                                        {settings?.company_logo ? (
                                            <div className="relative w-16 h-16">
                                                <img
                                                    src={`/storage/${settings.company_logo}`}
                                                    alt="Company Logo"
                                                    className="w-full h-full object-contain"
                                                    onError={(e) => {
                                                        e.target.parentElement.style.display = 'none';
                                                        e.target.parentElement.nextElementSibling.style.display = 'flex';
                                                    }}
                                                />
                                            </div>
                                        ) : (
                                            <div className="h-16 w-16 rounded-full bg-[#a92479]/10 flex items-center justify-center">
                                                <span className="text-[#a92479] text-2xl font-bold">
                                                    {settings?.company_name?.[0]?.toUpperCase() || 'C'}
                                                </span>
                                            </div>
                                        )}
                                        {settings?.company_name && (
                                            <Title 
                                                level={5} 
                                                className="mt-2 text-gray-800 text-center whitespace-nowrap font-medium"
                                                style={{ marginTop: '0.5rem', marginBottom: 0 }}
                                            >
                                                {settings.company_name}
                                            </Title>
                                        )}
                                    </div>

                                    <Title level={3} className="text-gray-800">
                                        Sign in to your account
                                    </Title>
                                    {status && (
                                        <Text className="text-green-600">
                                            {status}
                                        </Text>
                                    )}
                                </div>

                                <Form
                                    name="login"
                                    onFinish={onFinish}
                                    layout="vertical"
                                    requiredMark={false}
                                    className="w-full"
                                >
                                    <Form.Item
                                        label="Email"
                                        validateStatus={errors.email ? 'error' : ''}
                                        help={errors.email}
                                    >
                                        <Input
                                            prefix={<UserOutlined className="text-gray-400" />}
                                            value={data.email}
                                            onChange={e => setData('email', e.target.value)}
                                            placeholder="Enter your email"
                                            size="large"
                                        />
                                    </Form.Item>

                                    <Form.Item
                                        label="Password"
                                        validateStatus={errors.password ? 'error' : ''}
                                        help={errors.password}
                                    >
                                        <Input.Password
                                            prefix={<LockOutlined className="text-gray-400" />}
                                            value={data.password}
                                            onChange={e => setData('password', e.target.value)}
                                            placeholder="Enter your password"
                                            size="large"
                                        />
                                    </Form.Item>

                                    <Form.Item className="mb-4">
                                        <div className="flex items-center justify-between">
                                            <Checkbox
                                                checked={data.remember}
                                                onChange={e => setData('remember', e.target.checked)}
                                            >
                                                Remember me
                                            </Checkbox>
                                            {canResetPassword && (
                                                <Link
                                                    href={route('password.request')}
                                                    className="text-[#a92479] hover:text-[#8e1d65]"
                                                >
                                                    Forgot password?
                                                </Link>
                                            )}
                                        </div>
                                    </Form.Item>

                                    <Button
                                        type="primary"
                                        htmlType="submit"
                                        size="large"
                                        loading={processing}
                                        className="w-full bg-[#a92479] hover:bg-[#8e1d65]"
                                    >
                                        Sign in
                                    </Button>
                                </Form>
                            </Card>
                        </div>
                    </div>
                </div>
            </Spin>
        </GuestLayout>
    );
}
