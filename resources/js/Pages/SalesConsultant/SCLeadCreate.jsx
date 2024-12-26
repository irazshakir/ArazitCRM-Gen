import { useState } from 'react';
import { Modal, Input, Select, DatePicker, TimePicker, Button, message } from 'antd';
import { router } from '@inertiajs/react';
import dayjs from 'dayjs';

export default function SCLeadCreate({ show, onClose, leadConstants, products = [], users = [] }) {
    const [naturalInput, setNaturalInput] = useState('');
    const [formMode, setFormMode] = useState('quick'); // 'quick' or 'natural'
    const [form, setForm] = useState({
        name: '',
        phone: '',
        assigned_user_id: '',
        lead_source: 'Facebook',
        lead_status: 'Query',
        followup_date: '',
        followup_hour: '',
        followup_minute: '',
        followup_period: 'PM',
        lead_active_status: true,
        initial_remarks: '',
        product_id: '',
    });

    const handleNaturalInput = () => {
        try {
            const data = {
                lead_source: 'Facebook', // Default value
                lead_status: 'Query',    // Default value
                lead_active_status: true, // Default value
                product_id: '',
            };
            const text = naturalInput.toLowerCase();

            // Name extraction
            const nameMatch = text.match(/name:\s*([^,]+)/);
            if (nameMatch) data.name = nameMatch[1].trim();

            // Phone extraction
            const phoneMatch = text.match(/phone:\s*([^,]+)/);
            if (phoneMatch) data.phone = phoneMatch[1].trim();

            // Assigned user extraction
            const userMatch = text.match(/assigned_user:\s*([^,]+)/);
            if (userMatch) {
                const userName = userMatch[1].trim();
                const user = users.find(u => u.name.toLowerCase() === userName.toLowerCase());
                if (user) {
                    data.assigned_user_id = user.id;
                } else {
                    message.warning(`User "${userName}" not found. Lead will not be assigned.`);
                }
            }

            // Source extraction
            const sourceMatch = text.match(/source:\s*([^,]+)/i);
            if (sourceMatch) {
                const source = sourceMatch[1].trim();
                const matchedSource = leadConstants.SOURCES.find(
                    s => s.toLowerCase() === source.toLowerCase()
                );
                if (matchedSource) {
                    data.lead_source = matchedSource;
                }
            }

            // Followup extraction
            const followupMatch = text.match(/followup_date:\s*(\d{4}-\d{2}-\d{2})\s*time\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i);
            if (followupMatch) {
                data.followup_date = followupMatch[1];
                data.followup_hour = followupMatch[2].toString();
                data.followup_minute = followupMatch[3].toString();
                data.followup_period = followupMatch[4].toUpperCase();
            }

            // Initial remarks extraction
            const remarksMatch = text.match(/remarks:\s*([^,]+)/);
            if (remarksMatch) data.initial_remarks = remarksMatch[1].trim();

            // Product extraction
            const productMatch = text.match(/product:\s*([^,]+)/);
            if (productMatch) {
                const productName = productMatch[1].trim();
                const product = products.find(p => 
                    p.name.toLowerCase() === productName.toLowerCase()
                );
                if (product) {
                    data.product_id = product.id;
                } else {
                    message.warning(`Product "${productName}" not found. Product will not be assigned.`);
                }
            }

            handleSubmit(data);
        } catch (error) {
            message.error('Could not parse input. Please check the format.');
        }
    };

    const handleSubmit = (data = form) => {
        router.post(route('sales-consultant.leads.store'), data, {
            onSuccess: () => {
                message.success('Lead created successfully');
                onClose();
                // Reset form
                setForm({
                    name: '',
                    phone: '',
                    assigned_user_id: '',
                    lead_source: 'Facebook',
                    lead_status: 'Query',
                    followup_date: '',
                    followup_hour: '',
                    followup_minute: '',
                    followup_period: 'PM',
                    lead_active_status: true,
                    initial_remarks: '',
                    product_id: '',
                });
                setNaturalInput('');
            },
            onError: (errors) => {
                message.error(Object.values(errors)[0]);
            }
        });
    };

    return (
        <Modal
            title="Create New Lead"
            open={show}
            onCancel={onClose}
            footer={null}
            width={600}
        >
            <div className="space-y-6">
                {/* Mode Toggle */}
                <div className="flex justify-center space-x-4 mb-6">
                    <Button 
                        type={formMode === 'quick' ? 'primary' : 'default'}
                        onClick={() => setFormMode('quick')}
                        style={{
                            backgroundColor: formMode === 'quick' ? '#a92479' : 'white',
                            borderColor: '#a92479',
                            color: formMode === 'quick' ? 'white' : '#a92479'
                        }}
                    >
                        Quick Form
                    </Button>
                    <Button 
                        type={formMode === 'natural' ? 'primary' : 'default'}
                        onClick={() => setFormMode('natural')}
                        style={{
                            backgroundColor: formMode === 'natural' ? '#a92479' : 'white',
                            borderColor: '#a92479',
                            color: formMode === 'natural' ? 'white' : '#a92479'
                        }}
                    >
                        Natural Input
                    </Button>
                </div>

                {formMode === 'natural' ? (
                    <div className="space-y-4">
                        <div className="text-sm text-gray-500">
                            Example: name: John Doe, phone: 923088551111, assigned_user: John Smith, source: Facebook, 
                            product: Visit Visa, followup_date: 2024-11-30 time 4:00 PM, 
                            remarks: Customer interested in web development
                        </div>
                        <Input.TextArea
                            rows={4}
                            value={naturalInput}
                            onChange={(e) => setNaturalInput(e.target.value)}
                            placeholder="Enter lead details in natural language..."
                            className="border-b border-gray-300 focus:border-indigo-500"
                        />
                        <Button 
                            type="primary" 
                            block 
                            onClick={handleNaturalInput}
                            style={{
                                backgroundColor: '#a92479',
                                borderColor: '#a92479'
                            }}
                        >
                            Create Lead
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <Input
                            placeholder="Name"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                        />
                        <Input
                            placeholder="Phone"
                            value={form.phone}
                            onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        />
                        <Select
                            style={{ width: '100%' }}
                            placeholder="Assign To"
                            value={form.assigned_user_id}
                            onChange={(value) => setForm({ ...form, assigned_user_id: value })}
                            options={users.map(user => ({
                                value: user.id,
                                label: user.name
                            }))}
                        />
                        <Select
                            style={{ width: '100%' }}
                            placeholder="Lead Source"
                            value={form.lead_source}
                            onChange={(value) => setForm({ ...form, lead_source: value })}
                            options={leadConstants.SOURCES.map(source => ({
                                value: source,
                                label: source
                            }))}
                        />
                        {products.length > 0 && (
                            <Select
                                style={{ width: '100%' }}
                                placeholder="Product"
                                value={form.product_id}
                                onChange={(value) => setForm({ ...form, product_id: value })}
                                options={products.map(product => ({
                                    value: product.id,
                                    label: product.name
                                }))}
                            />
                        )}
                        <div className="grid grid-cols-2 gap-4">
                            <DatePicker
                                style={{ width: '100%' }}
                                placeholder="Followup Date"
                                onChange={(date) => setForm({
                                    ...form,
                                    followup_date: date ? date.format('YYYY-MM-DD') : ''
                                })}
                            />
                            <TimePicker
                                style={{ width: '100%' }}
                                placeholder="Followup Time"
                                use12Hours
                                format="h:mm A"
                                onChange={(time) => {
                                    if (time) {
                                        setForm({
                                            ...form,
                                            followup_hour: time.format('h'),
                                            followup_minute: time.format('mm'),
                                            followup_period: time.format('A')
                                        });
                                    }
                                }}
                            />
                        </div>
                        <Input.TextArea
                            rows={4}
                            placeholder="Initial Remarks"
                            value={form.initial_remarks}
                            onChange={(e) => setForm({ ...form, initial_remarks: e.target.value })}
                        />
                        <Button 
                            type="primary" 
                            block 
                            onClick={() => handleSubmit()}
                            style={{
                                backgroundColor: '#a92479',
                                borderColor: '#a92479'
                            }}
                        >
                            Create Lead
                        </Button>
                    </div>
                )}
            </div>
        </Modal>
    );
}