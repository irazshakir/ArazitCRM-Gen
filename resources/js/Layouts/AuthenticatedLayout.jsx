import { useState } from 'react';
import { Link, router } from '@inertiajs/react';
import NavLink from '@/Components/NavLink';
import { 
    HomeIcon, 
    UserGroupIcon, 
    ChartBarIcon, 
    BanknotesIcon, 
    DocumentTextIcon,
    Cog6ToothIcon,
    ClipboardDocumentListIcon,
    CurrencyDollarIcon,
    ChartPieIcon,
    ChevronDownIcon,
    ChevronUpIcon,
    BuildingLibraryIcon,
    Bars3Icon,
    BellIcon,
    XMarkIcon,
    UserCircleIcon
} from '@heroicons/react/24/outline';
import Dropdown from '@/Components/Dropdown';

export default function AuthenticatedLayout({ user, header, children }) {
    const [showingSidebar, setShowingSidebar] = useState(false);
    const [openMenus, setOpenMenus] = useState({});

    if (!user) {
        return null;
    }

    const adminNavigation = [
        { name: 'Dashboard', href: route('dashboard'), icon: HomeIcon },
        { name: 'Leads', href: route('leads.index'), icon: UserGroupIcon },
        {
            name: 'Reports',
            icon: ChartBarIcon,
            subItems: [
                { name: 'Leads', href: route('leads.index'), icon: ClipboardDocumentListIcon },
                { name: 'Sales', href: '#', icon: CurrencyDollarIcon },
                { name: 'Marketing', href: '#', icon: ChartPieIcon },
            ],
        },
        { name: 'Accounts', href: '#', icon: BanknotesIcon },
        { 
            name: 'Invoices', 
            href: route('invoices.index'), 
            icon: DocumentTextIcon,
            onClick: (e) => {
                e.preventDefault();
                router.visit(route('invoices.index'), {
                    preserveState: false,
                    preserveScroll: false,
                    replace: false
                });
            }
        },
        { name: 'Settings', href: '#', icon: Cog6ToothIcon },
    ];

    const userNavigation = [
        { name: 'Dashboard', href: route('dashboard'), icon: HomeIcon },
        // Add other non-admin navigation items here
    ];

    const navigation = user.role === 'admin' ? adminNavigation : userNavigation;

    const toggleSubmenu = (name) => {
        setOpenMenus(prev => ({
            ...prev,
            [name]: !prev[name]
        }));
    };

    const isActive = (href) => {
        return route().current(href);
    };

    const renderNavItem = (item) => {
        if (item.adminOnly && user.role !== 'admin') {
            return null;
        }

        const hasSubItems = item.subItems && item.subItems.length > 0;
        const active = isActive(item.href);
        const Icon = item.icon;

        if (hasSubItems) {
            return (
                <div key={item.name}>
                    <button
                        onClick={() => toggleSubmenu(item.name)}
                        className={`w-full flex items-center justify-between px-4 py-2 text-sm font-medium rounded-md transition-all duration-150 ease-in-out
                            ${openMenus[item.name] ? 'bg-[#a92479] bg-opacity-10 text-[#a92479]' : 'text-gray-600 hover:bg-[#a92479] hover:bg-opacity-10 hover:text-[#a92479]'}`}
                    >
                        <div className="flex items-center">
                            <Icon className={`mr-3 h-5 w-5 ${openMenus[item.name] ? 'text-[#a92479]' : 'text-gray-400'}`} />
                            <span>{item.name}</span>
                        </div>
                        {openMenus[item.name] ? (
                            <ChevronUpIcon className="ml-2 h-4 w-4" />
                        ) : (
                            <ChevronDownIcon className="ml-2 h-4 w-4" />
                        )}
                    </button>
                    {openMenus[item.name] && (
                        <div className="mt-1 space-y-1 pl-11">
                            {item.subItems.map((subItem) => (
                                <Link
                                    key={subItem.name}
                                    href={subItem.href}
                                    className={`flex items-center px-4 py-2 text-sm rounded-md transition-colors duration-150 ease-in-out
                                        ${isActive(subItem.href) 
                                            ? 'bg-[#a92479] bg-opacity-10 text-[#a92479] font-medium' 
                                            : 'text-gray-600 hover:bg-[#a92479] hover:bg-opacity-10 hover:text-[#a92479]'}`}
                                >
                                    <subItem.icon className={`mr-3 h-5 w-5 ${isActive(subItem.href) ? 'text-[#a92479]' : 'text-gray-400'}`} />
                                    {subItem.name}
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            );
        }

        return (
            <Link
                key={item.name}
                href={item.href}
                className={`flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors duration-150 ease-in-out
                    ${active 
                        ? 'bg-[#a92479] bg-opacity-10 text-[#a92479]' 
                        : 'text-gray-600 hover:bg-[#a92479] hover:bg-opacity-10 hover:text-[#a92479]'}`}
            >
                <Icon className={`mr-3 h-5 w-5 ${active ? 'text-[#a92479]' : 'text-gray-400'}`} />
                {item.name}
            </Link>
        );
    };

    return (
        <div className="min-h-screen bg-gray-100">
            {/* Sidebar */}
            <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out ${
                showingSidebar ? 'translate-x-0' : '-translate-x-full'
            } lg:translate-x-0`}>
                {/* Logo */}
                <div className="flex h-16 items-center justify-between px-4 border-b border-gray-200">
                    <Link href="/" className="flex items-center space-x-3">
                        <img
                            src="/images/CRM-Logo.png"
                            alt="CRM Logo"
                            className="h-8 w-auto"
                        />
                        <span className="text-xl font-semibold text-gray-900">ArazitCRM</span>
                    </Link>
                    <button
                        onClick={() => setShowingSidebar(false)}
                        className="lg:hidden rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500"
                    >
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 space-y-1 px-2 py-4">
                    {navigation.map((item) => renderNavItem(item))}
                </nav>
            </div>

            {/* Main Content */}
            <div className="lg:pl-64 flex flex-col min-h-screen">
                {/* Top Bar */}
                <div className="sticky top-0 z-40 bg-white border-b border-gray-200">
                    <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
                        {/* Mobile menu button */}
                        <button
                            onClick={() => setShowingSidebar(true)}
                            className="lg:hidden rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500"
                        >
                            <Bars3Icon className="h-6 w-6" />
                        </button>

                        {/* Right side buttons */}
                        <div className="ml-auto flex items-center space-x-4">
                            <button className="p-1 rounded-full text-gray-400 hover:text-gray-500">
                                <BellIcon className="h-6 w-6" />
                            </button>
                            
                            <Dropdown>
                                <Dropdown.Trigger>
                                    <button className="flex items-center space-x-3 text-sm focus:outline-none">
                                        <UserCircleIcon className="h-8 w-8 text-gray-400" />
                                        <span className="hidden md:inline-block font-medium text-gray-700">
                                            {user?.name || 'User'}
                                        </span>
                                    </button>
                                </Dropdown.Trigger>

                                <Dropdown.Content>
                                    <Dropdown.Link href={route('profile.edit')}>Profile</Dropdown.Link>
                                    <Dropdown.Link href={route('logout')} method="post" as="button">
                                        Log Out
                                    </Dropdown.Link>
                                </Dropdown.Content>
                            </Dropdown>
                        </div>
                    </div>
                </div>

                {/* Page Heading */}
                {header && (
                    <header className="bg-white shadow">
                        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                            {header}
                        </div>
                    </header>
                )}

                {/* Page Content */}
                <main className="flex-1">
                    <div className="py-6">
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                            {children}
                        </div>
                    </div>
                </main>
            </div>

            {/* Mobile sidebar backdrop */}
            {showingSidebar && (
                <div
                    className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
                    onClick={() => setShowingSidebar(false)}
                />
            )}
        </div>
    );
}