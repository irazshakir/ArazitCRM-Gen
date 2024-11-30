import { useState } from 'react';
import { Modal, Form, Input, Select, Switch, message, Upload } from 'antd';
import { router } from '@inertiajs/react';
import { PlusOutlined } from '@ant-design/icons';

export default function UserCreate({ show, onClose }) {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [fileList, setFileList] = useState([]);

    const handleSubmit = async (values) => {
        setLoading(true);
        const formData = new FormData();
        
        Object.keys(values).forEach(key => {
            if (key === 'image' && fileList[0]?.originFileObj) {
                formData.append('image', fileList[0].originFileObj);
            } else if (key === 'is_active') {
                formData.append('is_active', values.is_active ? '1' : '0');
            } else {
                formData.append(key, values[key]);
            }
        });

        try {
            await router.post(route('users.store'), formData, {
                onSuccess: () => {
                    message.success('User created successfully');
                    form.resetFields();
                    setFileList([]);
                    onClose();
                },
                onError: (errors) => {
                    Object.keys(errors).forEach(key => {
                        message.error(errors[key]);
                    });
                }
            });
        } catch (error) {
            message.error('Failed to create user');
        } finally {
            setLoading(false);
        }
    };

    const uploadButton = (
        <div>
            <PlusOutlined />
            <div style={{ marginTop: 8 }}>Upload</div>
        </div>
    );

    return (
        <Modal
            title="Create New User"
            open={show}
            onCancel={onClose}
            okText="Create"
            confirmLoading={loading}
            onOk={() => form.submit()}
            width={600}
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
                    is_active: true,
                    role: 'sales-consultant'
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
                        beforeUpload={() => false} // Prevent automatic upload
                    >
                        {fileList.length >= 1 ? null : uploadButton}
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
                    name="password"
                    label="Password"
                    rules={[{ required: true, message: 'Please enter password' }]}
                >
                    <Input.Password />
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
                    <Switch 
                        checkedChildren={<span style={{ color: '#fff' }}>Active</span>}
                        unCheckedChildren={<span style={{ color: '#fff' }}>Inactive</span>}
                        style={{ 
                            backgroundColor: '#f3f4f6',
                            minWidth: '80px'
                        }}
                        className={`${form.getFieldValue('is_active') ? 'bg-green-500' : 'bg-red-500'}`}
                    />
                </Form.Item>
            </Form>
        </Modal>
    );
} 