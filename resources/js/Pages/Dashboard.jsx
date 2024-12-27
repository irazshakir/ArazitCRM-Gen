import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import { Link } from '@inertiajs/react';
import {
    UsersIcon,
    UserGroupIcon,
    ChartBarSquareIcon,
    ClockIcon,
} from '@heroicons/react/24/outline';
import { Modal, Table, Button } from 'antd';
import { useState, useEffect } from 'react';
import axios from 'axios';

export default function Dashboard({ auth, stats }) {
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [modalTitle, setModalTitle] = useState('');
    const [leadsData, setLeadsData] = useState([]);
    const [loading, setLoading] = useState(false);

    const isAdmin = auth.user.role === 'admin';
    
    const getModalTitle = (type) => {
        switch (type) {
            case 'active':
                return 'Active Leads';
            case 'followup':
                return 'Followup Required';
            case 'total':
            default:
                return 'Total Leads';
        }
    };

    const getStatusDisplay = (record) => {
        let statusColor = 'blue';
        if (record.lead_status === 'Won') {
            statusColor = 'green';
        } else if (record.lead_status === 'Lost') {
            statusColor = 'red';
        }

        return (
            <div>
                <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${statusColor}-100 text-${statusColor}-800`}>
                    {record.lead_status}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                    Created: {record.created_at}
                </div>
            </div>
        );
    };

    const getFollowupDisplay = (record) => {
        if (!record.followup_date) return 'Not set';
        
        return (
            <div>
                <div className={record.overdue_followup ? 'text-red-600' : ''}>
                    {record.followup_date}
                </div>
                {record.overdue_followup && (
                    <div className="text-xs text-red-500 mt-1">Overdue</div>
                )}
            </div>
        );
    };

    const columns = [
        {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
            render: (text, record) => (
                <div>
                    <div>{text}</div>
                    <div className="text-xs text-gray-500">{record.email}</div>
                </div>
            ),
        },
        {
            title: 'Phone',
            dataIndex: 'phone',
            key: 'phone',
        },
        {
            title: 'City',
            dataIndex: 'city',
            key: 'city',
        },
        {
            title: 'Source',
            dataIndex: 'lead_source',
            key: 'lead_source',
        },
        {
            title: 'Assigned User',
            dataIndex: ['assigned_user', 'name'],
            key: 'assigned_user',
            render: (text, record) => record.assigned_user?.name || 'Unassigned',
        },
        {
            title: 'Status',
            key: 'status',
            render: (_, record) => getStatusDisplay(record),
        },
        {
            title: 'Followup',
            dataIndex: 'followup_date',
            key: 'followup_date',
            render: (_, record) => getFollowupDisplay(record),
        },
        {
            title: 'Action',
            key: 'action',
            render: (_, record) => (
                <Link href={route('leads.edit', record.id)} className="text-blue-600 hover:text-blue-800">
                    Edit
                </Link>
            ),
        },
    ];

    const fetchLeads = async (type) => {
        setLoading(true);
        try {
            const response = await axios.get(route('dashboard.leads', { type }));
            setLeadsData(response.data);
        } catch (error) {
            console.error('Error fetching leads:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCardClick = (type) => {
        setModalTitle(getModalTitle(type));
        fetchLeads(type);
        setIsModalVisible(true);
    };
    
    const dashboardStats = [
        {
            name: isAdmin ? 'Total Leads' : 'My Total Leads',
            value: stats.totalLeads,
            icon: UsersIcon,
            change: '+4.75%',
            changeType: 'positive',
            type: 'total'
        },
        {
            name: isAdmin ? 'Active Leads' : 'My Active Leads',
            value: stats.activeLeads,
            icon: UserGroupIcon,
            change: '+10.18%',
            changeType: 'positive',
            type: 'active'
        },
        {
            name: isAdmin ? 'Overall Conversion Rate' : 'My Conversion Rate',
            value: `${stats.conversionRatio}%`,
            icon: ChartBarSquareIcon,
            change: '-1.39%',
            changeType: 'negative',
            type: 'conversion'
        },
        {
            name: isAdmin ? 'Followup Required' : 'My Followups Required',
            value: stats.followupRequired,
            icon: ClockIcon,
            change: '+54.02%',
            changeType: 'positive',
            type: 'followup'
        },
    ];

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800">
                    {isAdmin ? 'Dashboard' : 'My Dashboard'}
                </h2>
            }
        >
            <Head title={isAdmin ? 'Dashboard' : 'My Dashboard'} />

            <div className="p-4 sm:p-6 lg:p-8">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    {dashboardStats.map((stat, index) => (
                        <div
                            key={index}
                            className={`relative overflow-hidden bg-white rounded-lg shadow ${
                                stat.type !== 'conversion' ? 'cursor-pointer hover:bg-gray-50' : ''
                            }`}
                            onClick={() => stat.type !== 'conversion' && handleCardClick(stat.type)}
                        >
                            <div className="p-5">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0">
                                        <stat.icon className="w-6 h-6 text-gray-400" aria-hidden="true" />
                                    </div>
                                    <div className="flex-1 w-0 ml-5">
                                        <dl>
                                            <dt className="text-sm font-medium text-gray-500 truncate">
                                                {stat.name}
                                            </dt>
                                            <dd className="flex items-baseline">
                                                <div className="text-2xl font-semibold text-gray-900">
                                                    {stat.value}
                                                </div>
                                                <div className={`ml-2 flex items-baseline text-sm font-semibold ${
                                                    stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                                                }`}>
                                                    {stat.change}
                                                </div>
                                            </dd>
                                        </dl>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Recent Activity Section */}
                <div className="mt-8">
                    <div className="overflow-hidden bg-white rounded-lg shadow">
                        <div className="p-6">
                            <h3 className="text-lg font-medium leading-6 text-gray-900">
                                Recent Activity
                            </h3>
                            <div className="mt-6">
                                <div className="flex items-center justify-center p-8 text-gray-500">
                                    No recent activity to display
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <Modal
                title={modalTitle}
                open={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                footer={null}
                width={1000}
            >
                <Table
                    columns={columns}
                    dataSource={leadsData}
                    loading={loading}
                    rowKey="id"
                    pagination={{ pageSize: 10 }}
                />
            </Modal>
        </AuthenticatedLayout>
    );
}
