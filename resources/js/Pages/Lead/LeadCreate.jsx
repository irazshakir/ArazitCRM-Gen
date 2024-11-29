import { useState } from 'react';
import { Modal, Input, Select, DatePicker, TimePicker, Button, message, Upload } from 'antd';
import { router } from '@inertiajs/react';
import dayjs from 'dayjs';
import { InboxOutlined } from '@ant-design/icons';

export default function LeadCreate({ show, onClose, users, leadConstants }) {
    const [naturalInput, setNaturalInput] = useState('');
    const [formMode, setFormMode] = useState('quick'); // 'quick', 'natural', or 'bulk'
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
    });

    const handleNaturalInput = () => {
        try {
            const data = {
                lead_source: 'Facebook', // Default value
                lead_status: 'Query',    // Default value
                lead_active_status: true // Default value
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
                if (user) data.assigned_user_id = user.id;
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

            // Followup extraction - Updated to handle time properly
            const followupMatch = text.match(/followup_date:\s*(\d{4}-\d{2}-\d{2})\s*time\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i);
            if (followupMatch) {
                data.followup_date = followupMatch[1];
                data.followup_hour = followupMatch[2].toString(); // Convert to string
                data.followup_minute = followupMatch[3].toString(); // Convert to string
                data.followup_period = followupMatch[4].toUpperCase();
            }

            // Initial remarks extraction
            const remarksMatch = text.match(/remarks:\s*([^,]+)/);
            if (remarksMatch) data.initial_remarks = remarksMatch[1].trim();

            handleSubmit(data);
        } catch (error) {
            message.error('Could not parse input. Please check the format.');
        }
    };

    const handleSubmit = (data = form) => {
        router.post(route('leads.store'), data, {
            onSuccess: () => {
                message.success('Lead created successfully');
                onClose();
            },
            onError: (errors) => {
                message.error(Object.values(errors)[0]);
            }
        });
    };

    const handleBulkUpload = (file) => {
        const formData = new FormData();
        formData.append('file', file);

        router.post(route('leads.bulk-upload'), formData, {
            onSuccess: () => {
                message.success('Leads uploaded successfully');
                onClose();
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
                    <Button 
                        type={formMode === 'bulk' ? 'primary' : 'default'}
                        onClick={() => setFormMode('bulk')}
                        style={{
                            backgroundColor: formMode === 'bulk' ? '#a92479' : 'white',
                            borderColor: '#a92479',
                            color: formMode === 'bulk' ? 'white' : '#a92479'
                        }}
                    >
                        Bulk Upload
                    </Button>
                </div>

                {formMode === 'natural' ? (
                    <div className="space-y-4">
                        <div className="text-sm text-gray-500">
                            Example: name: John Doe, phone: 923088551111, assigned_user: araz, 
                            source: Facebook, followup_date: 2024-11-30 time 4:00 PM, 
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
                ) : formMode === 'bulk' ? (
                    <div className="space-y-4">
                        <div className="text-sm text-gray-500">
                            Upload an Excel file with lead information. 
                            <a 
                                href={route('leads.template-download')} 
                                className="text-[#a92479] hover:underline ml-2"
                            >
                                Download Template
                            </a>
                        </div>
                        <Upload.Dragger
                            name="file"
                            accept=".xlsx,.xls,.csv"
                            beforeUpload={(file) => {
                                handleBulkUpload(file);
                                return false;
                            }}
                            maxCount={1}
                        >
                            <p className="ant-upload-drag-icon">
                                <InboxOutlined />
                            </p>
                            <p className="ant-upload-text">Click or drag file to this area to upload</p>
                            <p className="ant-upload-hint">
                                Support for single Excel file upload only
                            </p>
                        </Upload.Dragger>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="border-b border-gray-200">
                            <Input
                                placeholder="Name"
                                value={form.name}
                                onChange={e => setForm({ ...form, name: e.target.value })}
                                bordered={false}
                                className="py-2"
                            />
                        </div>

                        <div className="border-b border-gray-200">
                            <Input
                                placeholder="Phone"
                                value={form.phone}
                                onChange={e => setForm({ ...form, phone: e.target.value })}
                                bordered={false}
                                className="py-2"
                            />
                        </div>

                        <div className="border-b border-gray-200">
                            <Select
                                placeholder="Assign To"
                                value={form.assigned_user_id}
                                onChange={value => setForm({ ...form, assigned_user_id: value })}
                                className="w-full"
                                bordered={false}
                                options={users.map(user => ({ label: user.name, value: user.id }))}
                            />
                        </div>

                        <div className="border-b border-gray-200">
                            <Select
                                placeholder="Source"
                                value={form.lead_source}
                                onChange={value => setForm({ ...form, lead_source: value })}
                                className="w-full"
                                bordered={false}
                                options={leadConstants.SOURCES.map(source => ({ label: source, value: source }))}
                            />
                        </div>

                        <div className="flex space-x-4">
                            <DatePicker
                                placeholder="Followup Date"
                                onChange={(date) => setForm({ ...form, followup_date: date ? date.format('YYYY-MM-DD') : '' })}
                                className="flex-1"
                                bordered={false}
                            />
                            <TimePicker
                                format="h:mm A"
                                use12Hours
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
                                className="flex-1"
                                bordered={false}
                            />
                        </div>

                        <div className="border-b border-gray-200">
                            <Input.TextArea
                                placeholder="Initial Remarks"
                                value={form.initial_remarks}
                                onChange={e => setForm({ ...form, initial_remarks: e.target.value })}
                                bordered={false}
                                className="py-2"
                                autoSize={{ minRows: 2, maxRows: 4 }}
                            />
                        </div>

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
