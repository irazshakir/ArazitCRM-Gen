import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Table, Button, Space, Popconfirm, message, Modal, Form, Input, Switch } from 'antd';

export default function ProductIndex({ auth, products }) {
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [form] = Form.useForm();

    const handleCreate = async (values) => {
        router.post(route('products.store'), values, {
            onSuccess: () => {
                setShowCreateModal(false);
                form.resetFields();
                message.success('Product created successfully');
            },
            onError: () => message.error('Failed to create product')
        });
    };

    const handleEdit = (record) => {
        setEditingProduct(record);
        setShowEditModal(true);
        form.setFieldsValue(record);
    };

    const handleUpdate = async (values) => {
        router.put(route('products.update', editingProduct.id), values, {
            onSuccess: () => {
                setShowEditModal(false);
                setEditingProduct(null);
                form.resetFields();
                message.success('Product updated successfully');
            },
            onError: () => message.error('Failed to update product')
        });
    };

    const handleDelete = async (id) => {
        router.delete(route('products.destroy', id), {
            onSuccess: () => message.success('Product deleted successfully'),
            onError: () => message.error('Failed to delete product')
        });
    };

    const columns = [
        {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
            sorter: true,
        },
        {
            title: 'Status',
            dataIndex: 'active_status',
            key: 'active_status',
            render: (status) => (
                <span className={`px-2 py-1 rounded-full text-xs ${
                    status ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                    {status ? 'Active' : 'Inactive'}
                </span>
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
                        onClick={() => handleEdit(record)}
                        style={{
                            backgroundColor: '#a92479',
                            borderColor: '#a92479'
                        }}
                    >
                        Edit
                    </Button>
                    <Popconfirm
                        title="Delete Product"
                        description="Are you sure you want to delete this product?"
                        onConfirm={() => handleDelete(record.id)}
                        okText="Yes"
                        cancelText="No"
                        okButtonProps={{ danger: true }}
                    >
                        <Button danger size="small">
                            Delete
                        </Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    const ProductForm = ({ onFinish, initialValues = {} }) => (
        <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
            initialValues={initialValues}
        >
            <Form.Item
                name="name"
                label="Name"
                rules={[{ required: true, message: 'Please input product name!' }]}
            >
                <Input />
            </Form.Item>

            <Form.Item
                name="active_status"
                label="Status"
                valuePropName="checked"
                initialValue={true}
            >
                <Switch />
            </Form.Item>
        </Form>
    );

    return (
        <AuthenticatedLayout 
            user={auth.user}
            header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Product Settings</h2>}
        >
            <Head title="Products" />

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl text-gray-600">Products</h2>
                            <Button 
                                type="primary" 
                                onClick={() => setShowCreateModal(true)}
                                style={{
                                    backgroundColor: '#a92479',
                                    borderColor: '#a92479'
                                }}
                            >
                                Add Product
                            </Button>
                        </div>

                        <Table
                            columns={columns}
                            dataSource={products.data}
                            rowKey="id"
                            pagination={{
                                total: products.meta?.total || 0,
                                pageSize: products.meta?.per_page || 10,
                                current: products.meta?.current_page || 1,
                                showSizeChanger: true,
                                showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} products`
                            }}
                            onChange={(pagination) => {
                                router.get(route('products.index'), {
                                    page: pagination.current,
                                    per_page: pagination.pageSize,
                                }, {
                                    preserveState: true,
                                    preserveScroll: true,
                                });
                            }}
                        />

                        {/* Create Modal */}
                        <Modal
                            title="Create Product"
                            open={showCreateModal}
                            onCancel={() => {
                                setShowCreateModal(false);
                                form.resetFields();
                            }}
                            onOk={() => form.submit()}
                            okButtonProps={{
                                style: {
                                    backgroundColor: '#a92479',
                                    borderColor: '#a92479'
                                }
                            }}
                        >
                            <ProductForm onFinish={handleCreate} />
                        </Modal>

                        {/* Edit Modal */}
                        <Modal
                            title="Edit Product"
                            open={showEditModal}
                            onCancel={() => {
                                setShowEditModal(false);
                                setEditingProduct(null);
                                form.resetFields();
                            }}
                            onOk={() => form.submit()}
                            okButtonProps={{
                                style: {
                                    backgroundColor: '#a92479',
                                    borderColor: '#a92479'
                                }
                            }}
                        >
                            <ProductForm 
                                onFinish={handleUpdate}
                                initialValues={editingProduct}
                            />
                        </Modal>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
