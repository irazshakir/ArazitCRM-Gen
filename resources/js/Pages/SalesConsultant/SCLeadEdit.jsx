import { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Input, Select, DatePicker, TimePicker, Button, Switch, message, Drawer, Avatar } from 'antd';
import dayjs from 'dayjs';
import LeadNotes from '@/Components/LeadNotes';
import LeadDocuments from '@/Components/LeadDocuments';

export default function SCLeadEdit({ auth, lead, users, leadConstants, products = [] }) {
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
        lead_active_status: String(lead.lead_active_status) === 'true',
        product_id: lead.product_id || null,
    });

    const [whatsappDrawer, setWhatsappDrawer] = useState(false);
    const [messages, setMessages] = useState([
        { id: 1, text: "Hello! How can I help you today?", sender: "user", time: "09:00" },
        { id: 2, text: "I'm interested in your services", sender: "client", time: "09:05" },
    ]);
    const [messageInput, setMessageInput] = useState('');

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

        // Convert boolean to string 'true'/'false' for PostgreSQL
        formData.lead_active_status = formData.lead_active_status ? 'true' : 'false';

        formData.followup_hour = formData.followup_hour?.toString() || null;
        formData.followup_minute = formData.followup_minute?.toString() || null;
        formData.followup_period = formData.followup_period || null;

        router.put(route('sales-consultant.leads.update', lead.id), formData, {
            onSuccess: () => {
                message.success('Lead updated successfully');
            },
            onError: (errors) => {
                message.error(Object.values(errors)[0]);
            },
            preserveState: true
        });
    };

    const showWhatsappDrawer = () => {
        setWhatsappDrawer(true);
    };

    const closeWhatsappDrawer = () => {
        setWhatsappDrawer(false);
    };

    const handleSendMessage = () => {
        if (messageInput.trim()) {
            const newMessage = {
                id: messages.length + 1,
                text: messageInput,
                sender: 'user',
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
            setMessages([...messages, newMessage]);
            setMessageInput('');
        }
    };

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Handle image upload logic here
            console.log('Image selected:', file);
        }
    };

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Edit Lead" />

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="flex gap-6">
                        {/* Main Lead Edit Form */}
                        <div className="w-1/3 bg-white overflow-hidden shadow-sm sm:rounded-lg p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-semibold text-gray-800">Edit Lead</h2>
                                <Button 
                                    type="primary" 
                                    onClick={showWhatsappDrawer}
                                    style={{ 
                                        backgroundColor: '#25D366',
                                        borderColor: '#25D366'
                                    }}
                                    icon={
                                        <svg viewBox="0 0 24 24" width="16" height="16" style={{ marginRight: '8px' }}>
                                            <path fill="currentColor" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                                        </svg>
                                    }
                                >
                                    WhatsApp
                                </Button>
                            </div>

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
                                                    placeholder="Product"
                                                    value={form.product_id}
                                                    onChange={value => setForm({ ...form, product_id: value })}
                                                    className="w-full py-2 mb-2"
                                                    variant="borderless"
                                                    options={products.map(product => ({ label: product.name, value: product.id }))}
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
                                                    className="flex-1"
                                                    variant="borderless"
                                                />
                                            </div>

                                            <div className="flex items-center justify-between pt-4">
                                                <span className="text-gray-700">Active Status</span>
                                                <Switch
                                                    checked={form.lead_active_status}
                                                    onChange={(checked) => setForm({ ...form, lead_active_status: checked })}
                                                    style={{ backgroundColor: form.lead_active_status ? '#a92479' : undefined }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Submit Button */}
                                    <div className="mt-8">
                                        <Button
                                            type="primary"
                                            onClick={handleSubmit}
                                            className="w-full"
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

            {/* WhatsApp Drawer */}
            <Drawer
                title={
                    <div className="flex items-center gap-3">
                        <Avatar style={{ backgroundColor: '#25D366' }}>
                            {lead.name ? lead.name.charAt(0).toUpperCase() : 'U'}
                        </Avatar>
                        <div>
                            <div className="font-semibold">{lead.name}</div>
                            <div className="text-sm text-gray-500">{lead.phone}</div>
                        </div>
                    </div>
                }
                placement="right"
                width={400}
                onClose={closeWhatsappDrawer}
                open={whatsappDrawer}
                bodyStyle={{ padding: '0', height: 'calc(100% - 55px)' }}
            >
                <div className="flex flex-col h-full">
                    {/* Chat Messages */}
                    <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
                        {messages.map((message) => (
                            <div
                                key={message.id}
                                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'} mb-4`}
                            >
                                <div
                                    className={`max-w-[70%] rounded-lg p-3 ${
                                        message.sender === 'user'
                                            ? 'bg-[#25D366] text-white'
                                            : 'bg-white shadow-sm'
                                    }`}
                                >
                                    <div className="text-sm">{message.text}</div>
                                    <div className={`text-xs mt-1 ${
                                        message.sender === 'user' ? 'text-gray-100' : 'text-gray-500'
                                    }`}>
                                        {message.time}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Message Input */}
                    <div className="p-4 border-t">
                        <div className="flex items-end gap-2">
                            <div className="relative">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    className="hidden"
                                    id="image-upload"
                                />
                                <label 
                                    htmlFor="image-upload"
                                    className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100 cursor-pointer transition-colors"
                                >
                                    <svg viewBox="0 0 24 24" width="24" height="24" className="text-gray-500">
                                        <path 
                                            fill="currentColor" 
                                            d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"
                                        />
                                    </svg>
                                </label>
                            </div>
                            <Input.TextArea
                                value={messageInput}
                                onChange={(e) => setMessageInput(e.target.value)}
                                placeholder="Type a message"
                                autoSize={{ minRows: 1, maxRows: 4 }}
                                className="flex-1"
                                onPressEnter={(e) => {
                                    if (!e.shiftKey) {
                                        e.preventDefault();
                                        handleSendMessage();
                                    }
                                }}
                            />
                            <Button
                                type="primary"
                                onClick={handleSendMessage}
                                style={{ backgroundColor: '#25D366', borderColor: '#25D366' }}
                                icon={
                                    <svg viewBox="0 0 24 24" width="24" height="24">
                                        <path
                                            fill="currentColor"
                                            d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"
                                        />
                                    </svg>
                                }
                            />
                        </div>
                    </div>
                </div>
            </Drawer>
        </AuthenticatedLayout>
    );
}