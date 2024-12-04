import { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Input, Select, DatePicker, TimePicker, Button, Switch, message } from 'antd';
import dayjs from 'dayjs';
import LeadNotes from '@/Components/LeadNotes';
import LeadDocuments from '@/Components/LeadDocuments';

export default function LeadEdit({ auth, lead, users, leadConstants, products = [] }) {
    const [form, setForm] = useState({
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        city: lead.city,
        lead_status: lead.lead_status,
        lead_source: lead.lead_source,
        initial_remarks: lead.initial_remarks,
        assigned_user_id: lead.assigned_user_id,
        followup_date: lead.followup_date ? dayjs(lead.followup_date) : null,
        followup_hour: lead.followup_hour || null,
        followup_minute: lead.followup_minute || null,
        followup_period: lead.followup_period || null,
        lead_active_status: lead.lead_active_status,
        product_id: lead.product_id || null,
    });

    const getTimeValue = () => {
        if (!form.followup_hour || !form.followup_minute || !form.followup_period) {
            return null;
        }

        const hour = parseInt(form.followup_hour);
        const minute = parseInt(form.followup_minute);
        const period = form.followup_period;

        let hour24 = hour;
        if (period === 'PM' && hour !== 12) {
            hour24 = hour + 12;
        } else if (period === 'AM' && hour === 12) {
            hour24 = 0;
        }

        return dayjs().hour(hour24).minute(minute);
    };

    const handleSubmit = () => {
        const formData = { ...form };
        
        if (formData.followup_date) {
            formData.followup_date = formData.followup_date.format('YYYY-MM-DD');
        }

        formData.followup_hour = formData.followup_hour?.toString() || null;
        formData.followup_minute = formData.followup_minute?.toString() || null;
        formData.followup_period = formData.followup_period || null;

        router.put(route('leads.update', lead.id), formData, {
            onSuccess: () => {
                message.success('Lead updated successfully');
            },
            onError: (errors) => {
                message.error(Object.values(errors)[0]);
            }
        });
    };

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Edit Lead" />

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="flex gap-6">
                        {/* Main Lead Edit Form */}
                        <div className="w-1/3 bg-white overflow-hidden shadow-sm sm:rounded-lg p-6">
                            <h2 className="text-2xl font-semibold text-gray-800 mb-6">Edit Lead</h2>

                            <div className="grid grid-cols-4 gap-2">
                                {/* Left Column - Lead Information */}
                                <div className="col-span-8 md:col-span-4">
                                    {/* General Info Section */}
                                    <div className="mb-8">
                                        <h3 className="text-lg font-medium text-gray-700 mb-4">General Information</h3>
                                        <div className="space-y-4">
                                            <div className="border-b border-gray-200">
                                                <Input
                                                    placeholder="Name"
                                                    value={form.name}
                                                    onChange={e => setForm({ ...form, name: e.target.value })}
                                                    variant="borderless"
                                                    className="py-2 mb-2"
                                                />
                                            </div>

                                            <div className="border-b border-gray-200">
                                                <Input
                                                    placeholder="Email"
                                                    value={form.email}
                                                    onChange={e => setForm({ ...form, email: e.target.value })}
                                                    variant="borderless"
                                                    className="py-2 mb-2"
                                                />
                                            </div>

                                            <div className="border-b border-gray-200">
                                                <Input
                                                    placeholder="Phone"
                                                    value={form.phone}
                                                    onChange={e => setForm({ ...form, phone: e.target.value })}
                                                    variant="borderless"
                                                    className="py-2 mb-2"
                                                />
                                            </div>
                                            <div className="border-b border-gray-200">
                                                <Select
                                                    placeholder="Select Product"
                                                    value={form.product_id}
                                                    onChange={value => setForm({ ...form, product_id: value })}
                                                    className="w-full py-2 mb-2"
                                                    variant="borderless"
                                                    options={Array.isArray(products) ? products.map(product => ({ 
                                                        label: product.name, 
                                                        value: product.id 
                                                    })) : []}
                                                    allowClear
                                                />
                                            </div>

                                            <div className="border-b border-gray-200">
                                                <Select
                                                    placeholder="City"
                                                    value={form.city}
                                                    onChange={value => setForm({ ...form, city: value })}
                                                    className="w-full py-2 mb-2"
                                                    variant="borderless"
                                                    options={leadConstants.CITIES.map(city => ({ label: city, value: city }))}
                                                />
                                            </div>

                                            <div className="border-b border-gray-200">
                                                <Select
                                                    placeholder="Lead Status"
                                                    value={form.lead_status}
                                                    onChange={value => setForm({ ...form, lead_status: value })}
                                                    className="w-full py-2 mb-2"
                                                    variant="borderless"
                                                    options={leadConstants.STATUSES.map(status => ({ label: status, value: status }))}
                                                />
                                            </div>

                                            <div className="border-b border-gray-200">
                                                <Select
                                                    placeholder="Lead Source"
                                                    value={form.lead_source}
                                                    onChange={value => setForm({ ...form, lead_source: value })}
                                                    className="w-full py-2 mb-2"
                                                    variant="borderless"
                                                    options={leadConstants.SOURCES.map(source => ({ label: source, value: source }))}
                                                />
                                            </div>

                                            <div className="border-b border-gray-200">
                                                <Input.TextArea
                                                    placeholder="Initial Remarks"
                                                    value={form.initial_remarks}
                                                    onChange={e => setForm({ ...form, initial_remarks: e.target.value })}
                                                    variant="borderless"
                                                    className="py-2"
                                                    autoSize={{ minRows: 2, maxRows: 4 }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Lead Info Section */}
                                    <div>
                                        <h3 className="text-lg font-medium text-gray-700 mb-4 py-4">Lead Information</h3>
                                        <div className="space-y-4">
                                            <div className="border-b border-gray-200">
                                                <Select
                                                    placeholder="Assign To"
                                                    value={form.assigned_user_id}
                                                    onChange={value => setForm({ ...form, assigned_user_id: value })}
                                                    className="w-full py-2 mb-2"
                                                    variant="borderless"
                                                    options={users.map(user => ({ label: user.name, value: user.id }))}
                                                />
                                            </div>

                                            <div className="flex space-x-4">
                                                <DatePicker
                                                    placeholder="Followup Date"
                                                    value={form.followup_date}
                                                    onChange={(date) => setForm({ ...form, followup_date: date })}
                                                    className="flex-1 mb-2"
                                                    variant="borderless"
                                                />
                                                <TimePicker
                                                    format="h:mm A"
                                                    use12Hours
                                                    value={getTimeValue()}
                                                    onChange={(time) => {
                                                        if (time) {
                                                            const newForm = {
                                                                ...form,
                                                                followup_hour: time.format('h'),
                                                                followup_minute: time.format('mm'),
                                                                followup_period: time.format('A')
                                                            };
                                                            setForm(newForm);
                                                        } else {
                                                            setForm({
                                                                ...form,
                                                                followup_hour: null,
                                                                followup_minute: null,
                                                                followup_period: null
                                                            });
                                                        }
                                                    }}
                                                    className="flex-1 mb-2"
                                                    variant="borderless"
                                                />
                                            </div>

                                            <div className="flex items-center justify-between border-b border-gray-200 py-2">
                                                <span className="text-gray-600">Active Status</span>
                                                <Switch
                                                    checked={form.lead_active_status}
                                                    onChange={checked => setForm({ ...form, lead_active_status: checked })}
                                                    style={{ 
                                                        backgroundColor: form.lead_active_status ? '#10B981' : '#EF4444'
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                   

                                    <div className="mt-8">
                                        <Button 
                                            type="primary" 
                                            onClick={handleSubmit}
                                            style={{
                                                backgroundColor: '#a92479',
                                                borderColor: '#a92479'
                                            }}
                                        >
                                            Update Lead
                                        </Button>
                                    </div>
                                </div>

                            </div>
                        </div>

                        {/* Notes and Documents Section */}
                        <div className="flex-1 space-y-6">
                            {/* Notes Section */}
                            <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg p-6">
                                <h3 className="text-lg font-medium text-gray-700 mb-4">Lead Notes</h3>
                                <LeadNotes 
                                    notes={lead.notes || []} 
                                    modelId={lead.id}
                                    modelType="lead"
                                />
                            </div>

                            {/* Documents Section */}
                            <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg p-6">
                                <LeadDocuments 
                                    documents={lead.documents || []} 
                                    modelId={lead.id}
                                    modelType="lead"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
