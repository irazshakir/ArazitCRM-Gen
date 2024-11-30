import { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Card, Form, Input, Select, Switch, Button, message, Upload } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { UserCircleIcon } from '@heroicons/react/24/outline';

export default function UserEdit({ auth, user }) {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [fileList, setFileList] = useState([]);
    const [showPasswordFields, setShowPasswordFields] = useState(false);

    const handleSubmit = async (values) => {
        setLoading(true);
        const formData = new FormData();
        
        // Handle regular fields
        formData.append('name', values.name);
        formData.append('email', values.email);
        formData.append('phone', values.phone || '');
        formData.append('role', values.role);
        formData.append('is_active', values.is_active ? '1' : '0');

        // Handle password if changed
        if (showPasswordFields && values.password) {
            formData.append('password', values.password);
            formData.append('password_confirmation', values.password_confirmation);
        }

        // Handle image if uploaded
        if (fileList[0]?.originFileObj) {
            formData.append('image', fileList[0].originFileObj);
        }

        // Add _method field for PUT request
        formData.append('_method', 'PUT');

        try {
            await router.post(route('users.update', user.id), formData, {
                forceFormData: true,
                onSuccess: () => {
                    message.success('User updated successfully');
                    router.get(route('users.index'));
                },
                onError: (errors) => {
                    Object.keys(errors).forEach(key => {
                        message.error(errors[key]);
                    });
                }
            });
        } catch (error) {
            message.error('Failed to update user');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Edit User" />

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <Card title="Edit User">
                        <Form
                            form={form}
                            layout="vertical"
                            onFinish={handleSubmit}
                            initialValues={{
                                name: user.name,
                                email: user.email,
                                phone: user.phone,
                                role: user.role,
                                is_active: user.is_active
                            }}
                        >
                            <Form.Item
                                name="image"
                                label="Profile Image"
                            >
                                <Upload
                                    name="image"
                                    listType="picture-card"
                                    fileList={fileList}
                                    onPreview={() => {}}
                                    onChange={({ fileList: newFileList }) => setFileList(newFileList)}
                                    beforeUpload={() => false}
                                    maxCount={1}
                                >
                                    {fileList.length >= 1 ? null : (
                                        <div>
                                            {user.image ? (
                                                <img
                                                    src={`/storage/${user.image}`}
                                                    alt={user.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div>
                                                    <PlusOutlined />
                                                    <div style={{ marginTop: 8 }}>Upload</div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </Upload>
                            </Form.Item>

                            <Form.Item
                                name="name"
                                label="Name"
                                rules={[{ required: true, message: 'Please enter name' }]}
                            >
                                <Input />
                            </Form.Item>

                            <Form.Item
                                name="email"
                                label="Email"
                                rules={[
                                    { required: true, message: 'Please enter email' },
                                    { type: 'email', message: 'Please enter valid email' }
                                ]}
                            >
                                <Input />
                            </Form.Item>

                            <Form.Item
                                name="phone"
                                label="Phone"
                            >
                                <Input />
                            </Form.Item>

                            <Form.Item
                                name="role"
                                label="Role"
                                rules={[{ required: true, message: 'Please select role' }]}
                            >
                                <Select>
                                    <Select.Option value="admin">Admin</Select.Option>
                                    <Select.Option value="manager">Manager</Select.Option>
                                    <Select.Option value="sales-consultant">Sales Consultant</Select.Option>
                                    <Select.Option value="support-agent">Support Agent</Select.Option>
                                    <Select.Option value="accountant">Accountant</Select.Option>
                                </Select>
                            </Form.Item>

                            <Form.Item
                                name="is_active"
                                label="Status"
                                valuePropName="checked"
                            >
                                <Switch />
                            </Form.Item>

                            <Form.Item>
                                <Button
                                    type="default"
                                    onClick={() => setShowPasswordFields(!showPasswordFields)}
                                    className="mb-4"
                                >
                                    {showPasswordFields ? 'Cancel Password Change' : 'Change Password'}
                                </Button>
                            </Form.Item>

                            {showPasswordFields && (
                                <>
                                    <Form.Item
                                        name="password"
                                        label="New Password"
                                        rules={[
                                            { required: true, message: 'Please enter new password' },
                                            { min: 8, message: 'Password must be at least 8 characters' }
                                        ]}
                                    >
                                        <Input.Password />
                                    </Form.Item>

                                    <Form.Item
                                        name="password_confirmation"
                                        label="Confirm Password"
                                        dependencies={['password']}
                                        rules={[
                                            { required: true, message: 'Please confirm password' },
                                            ({ getFieldValue }) => ({
                                                validator(_, value) {
                                                    if (!value || getFieldValue('password') === value) {
                                                        return Promise.resolve();
                                                    }
                                                    return Promise.reject('Passwords do not match');
                                                },
                                            }),
                                        ]}
                                    >
                                        <Input.Password />
                                    </Form.Item>
                                </>
                            )}

                            <Form.Item>
                                <Button
                                    type="primary"
                                    htmlType="submit"
                                    loading={loading}
                                    style={{
                                        backgroundColor: '#a92479',
                                        borderColor: '#a92479',
                                    }}
                                >
                                    Update User
                                </Button>
                            </Form.Item>
                        </Form>
                    </Card>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
