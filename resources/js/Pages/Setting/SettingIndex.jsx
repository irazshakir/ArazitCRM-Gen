import { useForm, Head } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Form, Input, Button, Upload, Card, message } from 'antd';
import { UploadOutlined } from '@ant-design/icons';

export default function SettingIndex({ auth, setting }) {
    const { data, setData, post, put, processing, errors } = useForm({
        company_name: setting.company_name || '',
        company_phone: setting.company_phone || '',
        company_email: setting.company_email || '',
        company_address: setting.company_address || '',
        company_logo: null,
    });

    const submit = (e) => {
        e.preventDefault();
        
        if (setting.id) {
            put(route('settings.update', setting.id), {
                preserveScroll: true,
                onSuccess: () => message.success('Settings updated successfully'),
            });
        } else {
            post(route('settings.store'), {
                preserveScroll: true,
                onSuccess: () => message.success('Settings saved successfully'),
            });
        }
    };

    const uploadProps = {
        beforeUpload: (file) => {
            const isImage = file.type.startsWith('image/');
            if (!isImage) {
                message.error('You can only upload image files!');
                return false;
            }
            setData('company_logo', file);
            return false;
        },
        maxCount: 1,
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">General Settings</h2>}
        >
            <Head title="Settings" />

            <div className="py-12">
                <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
                    <Card className="shadow-sm">
                        <Form
                            layout="vertical"
                            onSubmitCapture={submit}
                            initialValues={data}
                            className="space-y-4"
                        >
                            <Form.Item
                                label="Company Name"
                                validateStatus={errors.company_name ? 'error' : ''}
                                help={errors.company_name}
                            >
                                <Input
                                    value={data.company_name}
                                    onChange={(e) => setData('company_name', e.target.value)}
                                />
                            </Form.Item>

                            <Form.Item
                                label="Company Email"
                                validateStatus={errors.company_email ? 'error' : ''}
                                help={errors.company_email}
                            >
                                <Input
                                    type="email"
                                    value={data.company_email}
                                    onChange={(e) => setData('company_email', e.target.value)}
                                />
                            </Form.Item>

                            <Form.Item
                                label="Company Phone"
                                validateStatus={errors.company_phone ? 'error' : ''}
                                help={errors.company_phone}
                            >
                                <Input
                                    value={data.company_phone}
                                    onChange={(e) => setData('company_phone', e.target.value)}
                                />
                            </Form.Item>

                            <Form.Item
                                label="Company Address"
                                validateStatus={errors.company_address ? 'error' : ''}
                                help={errors.company_address}
                            >
                                <Input.TextArea
                                    rows={4}
                                    value={data.company_address}
                                    onChange={(e) => setData('company_address', e.target.value)}
                                />
                            </Form.Item>

                            <Form.Item
                                label="Company Logo"
                                validateStatus={errors.company_logo ? 'error' : ''}
                                help={errors.company_logo}
                            >
                                <Upload {...uploadProps} listType="picture">
                                    <Button icon={<UploadOutlined />}>Click to Upload</Button>
                                </Upload>
                                {setting.company_logo && (
                                    <div className="mt-2">
                                        <img
                                            src={`/storage/${setting.company_logo}`}
                                            alt="Company Logo"
                                            className="h-20 w-auto object-contain"
                                        />
                                    </div>
                                )}
                            </Form.Item>

                            <Form.Item className="mb-0">
                                <Button
                                    type="primary"
                                    htmlType="submit"
                                    loading={processing}
                                    className="w-1/3 mt-6 bg-[#a92479]"
                                >
                                    {setting.id ? 'Update Settings' : 'Save Settings'}
                                </Button>
                            </Form.Item>
                        </Form>
                    </Card>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
