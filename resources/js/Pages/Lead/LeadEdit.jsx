import { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Input, Select, DatePicker, TimePicker, Button, Switch, message, Drawer, Avatar, Timeline } from 'antd';
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

    const [whatsappDrawer, setWhatsappDrawer] = useState(false);
    const [activityDrawer, setActivityDrawer] = useState(false);
    const [messages, setMessages] = useState([]);
    const [isTyping, setIsTyping] = useState(false);
    const [messageInput, setMessageInput] = useState('');
    const [currentStep, setCurrentStep] = useState(0);
    const [activityLogs, setActivityLogs] = useState(lead.activity_logs || []);

    // Demo conversation
    const demoConversation = [
        { id: 1, text: "hello , want to inquire about your services", sender: "client" },
        { id: 2, text: "sure , let me assist you , first let me ask you some questions to understand your requirements, may I know you name please ?", sender: "agent" },
        { id: 3, text: "Usman", sender: "client" },
        { id: 4, text: "Thanks , what service are you interested in ?", sender: "agent" },
        { id: 5, text: "Web Development", sender: "client" },
        { id: 6, text: "Sure , its better if I connect you with my business development manager as they can assist you properly. what is the best time to contact you ?", sender: "agent" },
        { id: 7, text: "anytime today after 3 pm", sender: "client" },
        { id: 8, text: "Sure will do that , I will get back to you soon", sender: "agent" },
    ];

    const handleSendMessage = () => {
        if (messageInput.trim()) {
            const newMessage = {
                id: messages.length + 1,
                text: messageInput,
                sender: 'agent'
            };
            setMessages(prev => [...prev, newMessage]);
            setMessageInput('');

            // Find the next client message in the conversation
            const nextClientMessage = demoConversation.find((msg, index) => {
                return index > currentStep && msg.sender === 'client';
            });

            if (nextClientMessage) {
                // Show typing effect after 3 seconds
                setTimeout(() => {
                    setIsTyping(true);
                    // Show message after 10 seconds
                    setTimeout(() => {
                        setIsTyping(false);
                        setMessages(prev => [...prev, nextClientMessage]);
                        setCurrentStep(prev => {
                            const nextIndex = demoConversation.findIndex(msg => msg.id === nextClientMessage.id);
                            return nextIndex + 1;
                        });
                    }, 7000); // Additional 7 seconds (total 10 seconds)
                }, 3000); // Initial 3 seconds delay for typing
            }
        }
    };

    const showWhatsappDrawer = () => {
        setWhatsappDrawer(true);
        setMessages([]);
        setCurrentStep(0);
        // Show typing after 3 seconds for initial message
        setTimeout(() => {
            setIsTyping(true);
            setTimeout(() => {
                setIsTyping(false);
                setMessages([demoConversation[0]]);
                setCurrentStep(1);
            }, 7000);
        }, 3000);
    };

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

    const closeWhatsappDrawer = () => {
        setWhatsappDrawer(false);
    };

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Handle image upload logic here
            console.log('Image selected:', file);
        }
    };

    const renderActivityTimeline = () => {
        return (
            <Timeline
                mode="left"
                items={activityLogs.map(log => ({
                    label: dayjs(log.created_at).format('MMM DD, YYYY HH:mm'),
                    children: (
                        <div>
                            <div className="font-medium">{log.activity_type.replace(/_/g, ' ').toUpperCase()}</div>
                            {log.activity_details && (
                                <div className="text-sm text-gray-500">
                                    {Object.entries(log.activity_details).map(([key, value]) => (
                                        <div key={key}>
                                            {key.replace(/_/g, ' ')}: {
                                                typeof value === 'object' 
                                                    ? `Changed from "${value.old}" to "${value.new}"`
                                                    : value
                                            }
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ),
                }))}
            />
        );
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
                                <div className="flex gap-2">
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
                                    <Button
                                        type="primary"
                                        icon={<i className="fas fa-history"></i>}
                                        onClick={() => setActivityDrawer(true)}
                                        className="ml-2"
                                    >
                                        Activity Logs
                                    </Button>
                                </div>
                            </div>
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

            {/* WhatsApp Drawer */}
            <Drawer
                title={
                    <div className="flex items-center">
                        <Avatar style={{ backgroundColor: '#87d068' }} icon={<i className="fas fa-user" />} />
                        <span className="ml-2">+923010441111</span>
                    </div>
                }
                placement="right"
                onClose={closeWhatsappDrawer}
                open={whatsappDrawer}
                width={400}
            >
                <div className="flex flex-col h-full">
                    <div className="flex-1 overflow-y-auto mb-4 space-y-4">
                        {messages.map((message) => (
                            <div
                                key={message.id}
                                className={`flex ${message.sender === 'agent' ? 'justify-start' : 'justify-end'}`}
                            >
                                <div
                                    className={`max-w-[70%] rounded-lg p-3 ${
                                        message.sender === 'agent'
                                            ? 'bg-white text-gray-800'
                                            : 'bg-green-500 text-white'
                                    }`}
                                >
                                    {message.text}
                                </div>
                            </div>
                        ))}
                        {isTyping && (
                            <div className="flex justify-end">
                                <div className="max-w-[70%] rounded-lg p-3 bg-gray-200">
                                    Typing...
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="p-4 border-t">
                        <div className="flex gap-2">
                            <Input
                                value={messageInput}
                                onChange={(e) => setMessageInput(e.target.value)}
                                onPressEnter={handleSendMessage}
                                placeholder="Type a message..."
                            />
                            <Button 
                                type="primary" 
                                onClick={handleSendMessage}
                                style={{ 
                                    backgroundColor: '#25D366',
                                    borderColor: '#25D366'
                                }}
                            >
                                Send
                            </Button>
                        </div>
                    </div>
                </div>
            </Drawer>

            {/* Activity Drawer */}
            <Drawer
                title="Lead Activity Timeline"
                placement="right"
                onClose={() => setActivityDrawer(false)}
                open={activityDrawer}
                width={500}
            >
                {renderActivityTimeline()}
            </Drawer>
        </AuthenticatedLayout>
    );
}
