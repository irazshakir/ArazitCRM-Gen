import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Table, Button, Space, Popconfirm, message, Tag, Card } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import UserCreate from './Partials/UserCreate';
import { UserCircleIcon } from '@heroicons/react/24/outline';

export default function UserIndex({ auth, users }) {
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleDelete = async (id) => {
        try {
            await router.delete(route('users.destroy', id), {
                onSuccess: () => message.success('User deleted successfully'),
                onError: () => message.error('Failed to delete user')
            });
        } catch (error) {
            message.error('Failed to delete user');
        }
    };

    const columns = [
        {
            title: 'SR',
            key: 'index',
            render: (text, record, index) => index + 1,
        },
        {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
        },
        {
            title: 'Phone',
            dataIndex: 'phone',
            key: 'phone',
        },
        {
            title: 'Role',
            dataIndex: 'role',
            key: 'role',
            render: (role) => (
                <Tag color={role === 'admin' ? 'red' : 'blue'}>
                    {role.replace('-', ' ').toUpperCase()}
                </Tag>
            ),
        },
        {
            title: 'Status',
            dataIndex: 'is_active',
            key: 'status',
            render: (isActive) => (
                <Tag color={isActive ? 'success' : 'error'}>
                    {isActive ? 'Active' : 'Inactive'}
                </Tag>
            ),
        },
        {
            title: 'Image',
            key: 'image',
            render: (_, record) => (
                record.image ? (
                    <img
                        src={`/storage/${record.image}`}
                        alt={record.name}
                        className="h-8 w-8 rounded-full object-cover"
                    />
                ) : (
                    <UserCircleIcon className="h-8 w-8 text-gray-400" />
                )
            ),
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                <Space>
                    <Button
                        type="primary"
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => router.get(route('users.edit', record.id))}
                        style={{
                            backgroundColor: '#a92479',
                            borderColor: '#a92479',
                        }}
                    >
                        Edit
                    </Button>
                    <Popconfirm
                        title="Delete User"
                        description="Are you sure you want to delete this user?"
                        onConfirm={() => handleDelete(record.id)}
                        okText="Yes"
                        cancelText="No"
                        okButtonProps={{ danger: true }}
                    >
                        <Button danger size="small" icon={<DeleteOutlined />}>
                            Delete
                        </Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Users Management" />

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl text-gray-600">Users Management</h2>
                            <Button
                                type="primary"
                                icon={<PlusOutlined />}
                                onClick={() => setShowCreateModal(true)}
                                style={{
                                    backgroundColor: '#a92479',
                                    borderColor: '#a92479',
                                }}
                            >
                                Create User
                            </Button>
                        </div>

                        <Table
                            columns={columns}
                            dataSource={users.data}
                            rowKey="id"
                            loading={loading}
                            pagination={{
                                total: users.meta?.total || 0,
                                pageSize: users.meta?.per_page || 10,
                                current: users.meta?.current_page || 1,
                                showSizeChanger: true,
                                showTotal: (total, range) => 
                                    `${range[0]}-${range[1]} of ${total} users`,
                            }}
                        />

                        <UserCreate
                            show={showCreateModal}
                            onClose={() => setShowCreateModal(false)}
                        />
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
