import { useState } from 'react';
import { Upload, Button, List, Avatar, Tooltip, Modal, Input, message } from 'antd';
import { FileOutlined, UploadOutlined, DeleteOutlined, DownloadOutlined } from '@ant-design/icons';
import { router } from '@inertiajs/react';
import dayjs from 'dayjs';

const { TextArea } = Input;

export default function LeadDocuments({ documents = [], modelId, modelType }) {
    const [uploading, setUploading] = useState(false);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [fileList, setFileList] = useState([]);
    const [description, setDescription] = useState('');

    const handleUpload = () => {
        if (fileList.length === 0) {
            message.error('Please select a file to upload');
            return;
        }

        setUploading(true);
        const formData = new FormData();
        formData.append('file', fileList[0]);
        formData.append('lead_id', modelId);
        formData.append('description', description);
        formData.append('document_type', fileList[0].type);

        router.post(route('lead-documents.store'), formData, {
            onSuccess: () => {
                setFileList([]);
                setDescription('');
                setShowUploadModal(false);
                setUploading(false);
                message.success('Document uploaded successfully');
            },
            onError: () => {
                setUploading(false);
                message.error('Failed to upload document');
            }
        });
    };

    const handleDelete = (documentId) => {
        router.delete(route('lead-documents.destroy', documentId), {
            onSuccess: () => {
                message.success('Document deleted successfully');
            },
            onError: () => {
                message.error('Failed to delete document');
            }
        });
    };

    const handleDownload = (document) => {
        window.open(route('lead-documents.download', document.id), '_blank');
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-700">Documents</h3>
                <Button 
                    type="primary"
                    onClick={() => setShowUploadModal(true)}
                    icon={<UploadOutlined />}
                    style={{
                        backgroundColor: '#a92479',
                        borderColor: '#a92479'
                    }}
                >
                    Upload Document
                </Button>
            </div>

            <List
                dataSource={documents}
                renderItem={document => (
                    <List.Item
                        actions={[
                            <Tooltip title="Download">
                                <Button
                                    type="text"
                                    icon={<DownloadOutlined />}
                                    onClick={() => handleDownload(document)}
                                />
                            </Tooltip>,
                            <Tooltip title="Delete">
                                <Button
                                    type="text"
                                    danger
                                    icon={<DeleteOutlined />}
                                    onClick={() => handleDelete(document.id)}
                                />
                            </Tooltip>
                        ]}
                    >
                        <List.Item.Meta
                            avatar={
                                <Avatar 
                                    icon={<FileOutlined />}
                                    style={{ backgroundColor: '#a92479' }}
                                />
                            }
                            title={
                                <div className="flex justify-between">
                                    <span>{document.document_name}</span>
                                    <Tooltip title={dayjs(document.created_at).format('YYYY-MM-DD HH:mm:ss')}>
                                        <span className="text-gray-500 text-sm">
                                            {dayjs(document.created_at).fromNow()}
                                        </span>
                                    </Tooltip>
                                </div>
                            }
                            description={
                                <div>
                                    <p className="text-gray-500">{document.description}</p>
                                    <p className="text-gray-400 text-xs">Uploaded by: {document.user.name}</p>
                                </div>
                            }
                        />
                    </List.Item>
                )}
            />

            <Modal
                title="Upload Document"
                open={showUploadModal}
                onCancel={() => {
                    setShowUploadModal(false);
                    setFileList([]);
                    setDescription('');
                }}
                footer={[
                    <Button key="cancel" onClick={() => setShowUploadModal(false)}>
                        Cancel
                    </Button>,
                    <Button
                        key="upload"
                        type="primary"
                        loading={uploading}
                        onClick={handleUpload}
                        style={{
                            backgroundColor: '#a92479',
                            borderColor: '#a92479'
                        }}
                    >
                        Upload
                    </Button>
                ]}
            >
                <div className="space-y-4">
                    <Upload
                        beforeUpload={(file) => {
                            setFileList([file]);
                            return false;
                        }}
                        fileList={fileList}
                        onRemove={() => setFileList([])}
                        maxCount={1}
                    >
                        <Button icon={<UploadOutlined />}>Select File</Button>
                    </Upload>

                    <TextArea
                        placeholder="Document description"
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        rows={4}
                        variant="borderless"
                        className="border-b border-gray-200"
                    />
                </div>
            </Modal>
        </div>
    );
} 