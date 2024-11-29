import { useState } from 'react';
import { List, Avatar, Form, Button, Input, Tooltip } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { router } from '@inertiajs/react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const { TextArea } = Input;

export default function LeadNotes({ notes, modelId, modelType }) {
    const [submitting, setSubmitting] = useState(false);
    const [value, setValue] = useState('');

    const handleSubmit = () => {
        if (!value) return;

        setSubmitting(true);
        router.post(route('lead-notes.store'), {
            note: value,
            lead_id: modelId,
            model_type: modelType
        }, {
            onSuccess: () => {
                setValue('');
                setSubmitting(false);
            },
            onError: () => {
                setSubmitting(false);
            }
        });
    };

    return (
        <div>
            {/* Add Note Form */}
            <Form className="mb-4">
                <Form.Item>
                    <TextArea 
                        rows={4} 
                        onChange={e => setValue(e.target.value)} 
                        value={value}
                        placeholder="Add a note..."
                        variant="borderless"
                    />
                </Form.Item>
                <Form.Item>
                    <Button 
                        htmlType="submit" 
                        loading={submitting} 
                        onClick={handleSubmit}
                        type="primary"
                        style={{
                            backgroundColor: '#a92479',
                            borderColor: '#a92479'
                        }}
                    >
                        Add Note
                    </Button>
                </Form.Item>
            </Form>

            {/* Notes List */}
            <List
                className="comment-list"
                header={`${notes.length} notes`}
                itemLayout="horizontal"
                dataSource={notes}
                renderItem={note => (
                    <List.Item>
                        <List.Item.Meta
                            avatar={
                                <Avatar 
                                    icon={<UserOutlined />} 
                                    style={{ backgroundColor: '#a92479' }}
                                />
                            }
                            title={
                                <div className="flex justify-between">
                                    <span>{note.user.name}</span>
                                    <Tooltip title={dayjs(note.created_at).format('YYYY-MM-DD HH:mm:ss')}>
                                        <span className="text-gray-500 text-sm">
                                            {dayjs(note.created_at).fromNow()}
                                        </span>
                                    </Tooltip>
                                </div>
                            }
                            description={note.note}
                        />
                    </List.Item>
                )}
            />
        </div>
    );
} 