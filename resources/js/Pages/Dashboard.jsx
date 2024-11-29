import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import {
    UsersIcon,
    CurrencyDollarIcon,
    ChartBarIcon,
    PhoneIcon,
} from '@heroicons/react/24/outline';

export default function Dashboard({ auth }) {
    // Example stats - you'll want to fetch these from your backend
    const stats = [
        {
            name: 'Total Leads',
            value: '0',
            icon: UsersIcon,
            change: '+4.75%',
            changeType: 'positive',
        },
        {
            name: 'Revenue',
            value: '$0.00',
            icon: CurrencyDollarIcon,
            change: '+54.02%',
            changeType: 'positive',
        },
        {
            name: 'Conversion Rate',
            value: '0%',
            icon: ChartBarIcon,
            change: '-1.39%',
            changeType: 'negative',
        },
        {
            name: 'Active Leads',
            value: '0',
            icon: PhoneIcon,
            change: '+10.18%',
            changeType: 'positive',
        },
    ];

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800">
                    Dashboard
                </h2>
            }
        >
            <Head title="Dashboard" />

            <div className="p-4 sm:p-6 lg:p-8">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    {stats.map((stat, index) => (
                        <div
                            key={index}
                            className="relative overflow-hidden bg-white rounded-lg shadow"
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
        </AuthenticatedLayout>
    );
}
