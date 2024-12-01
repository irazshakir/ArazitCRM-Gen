import { Link, usePage, router } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import ApplicationLogo from '@/Components/ApplicationLogo';
import {
    HomeIcon,
    UserGroupIcon,
    ChartBarIcon,
    MegaphoneIcon,
    ClockIcon,
    BanknotesIcon,
    DocumentTextIcon,
    Cog6ToothIcon,
    UsersIcon,
    ChevronDownIcon,
    ChevronUpIcon,
    WrenchScrewdriverIcon,
    TruckIcon,
    BuildingOfficeIcon,
    BuildingStorefrontIcon,
    StarIcon,
    CurrencyDollarIcon,
    ClipboardDocumentListIcon,
    ChartPieIcon,
    BookOpenIcon,
} from '@heroicons/react/24/outline';

export default function Sidebar() {
    const { auth, settings } = usePage().props;
    const [openMenus, setOpenMenus] = useState(() => {
        const savedState = localStorage.getItem('sidebarOpenMenus');
        return savedState ? JSON.parse(savedState) : {};
    });

    useEffect(() => {
        localStorage.setItem('sidebarOpenMenus', JSON.stringify(openMenus));
    }, [openMenus]);

    const toggleSubmenu = (e, label) => {
        e.preventDefault();
        e.stopPropagation();
        setOpenMenus(prev => ({
            ...prev,
            [label]: !prev[label]
        }));
    };

    const isActive = (path) => {
        if (typeof path === 'string') {
            const currentRoute = route().current();
            const baseRoute = currentRoute?.split('.').slice(0, -1).join('.');
            
            return currentRoute === path || 
                   currentRoute?.startsWith(path + '.') || 
                   baseRoute === path;
        }
        return false;
    };

    const navigation = [
        { href: route('dashboard'), label: 'Dashboard', icon: HomeIcon },
        ...(auth.user.role === 'admin' ? [
            {
                href: route('leads.index'),
                label: 'Leads',
                icon: UserGroupIcon,
                baseRoute: 'leads'
            },
            { 
                href: route('accounts.index'), 
                label: 'Accounts', 
                icon: BanknotesIcon,
                baseRoute: 'accounts',
                onClick: (e) => {
                    e.preventDefault();
                    router.visit(route('accounts.index'), {
                        preserveState: false,
                        preserveScroll: false,
                        replace: false
                    });
                }
            },
            { 
                href: route('invoices.index'), 
                label: 'Invoices', 
                icon: DocumentTextIcon,
                baseRoute: 'invoices',
                onClick: (e) => {
                    e.preventDefault();
                    router.visit(route('invoices.index'), {
                        preserveState: false,
                        preserveScroll: false,
                        replace: false
                    });
                }
            },
            {
                href: route('users.index'),
                label: 'Users',
                icon: UsersIcon,
                baseRoute: 'users'
            },
            {
                label: 'Settings',
                icon: Cog6ToothIcon,
                subItems: [
                    { href: route('settings.index'), label: 'Company Settings', icon: WrenchScrewdriverIcon, baseRoute: 'settings' },
                    // { href: '#', label: 'Vendors', icon: BuildingStorefrontIcon },
                    // { href: '#', label: 'Transportation', icon: TruckIcon },
                    { href: route('umrah-packages.index'), label: 'Umrah Packages', icon: BookOpenIcon, baseRoute: 'umrah-packages' },
                    // { href: '#', label: 'Hajj Packages', icon: BookOpenIcon },
                    { href: route('hotel-rates.index'), label: 'Hotel Rates', icon: StarIcon, baseRoute: 'hotel-rates' },
                    // { href: '#', label: 'Accounts', icon: BanknotesIcon },
                ],
            },
            {
                href: route('marketing.index'),
                label: 'Marketing',
                icon: MegaphoneIcon,
                baseRoute: 'marketing'
            },
            {
                label: 'Reports',
                icon: ChartBarIcon,
                subItems: [
                    { href: route('reports.leads'), label: 'Leads Report', icon: ClipboardDocumentListIcon, baseRoute: 'reports.leads' },
                    { href: '#', label: 'Sales Report', icon: CurrencyDollarIcon },
                    { href: '#', label: 'Marketing Report', icon: ChartPieIcon },
                ],
            },
        ] : []),
        ...(auth.user.role === 'sales_consultant' ? [
            {
                href: route('sales-consultant.leads'),
                label: 'Leads',
                icon: UserGroupIcon,
            },
            {
                href: route('sales-consultant.invoices'),
                label: 'Invoices',
                icon: DocumentTextIcon,
            },
        ] : [])
    ];

    const renderNavItem = (item, index) => {
        const hasSubItems = item.subItems && item.subItems.length > 0;
        const isOpen = openMenus[item.label];
        const Icon = item.icon;
        
        const active = isActive(item.baseRoute || item.href);

        const hasActiveChild = hasSubItems && item.subItems.some(subItem => 
            isActive(subItem.baseRoute || subItem.href)
        );

        if (hasSubItems) {
            return (
                <div key={index} className="space-y-1">
                    <div>
                        <div
                            onClick={(e) => toggleSubmenu(e, item.label)}
                            className={`w-full flex items-center justify-between px-4 py-2 text-sm font-medium rounded-md cursor-pointer
                                ${isOpen || hasActiveChild
                                    ? 'bg-[#a92479] bg-opacity-10 text-[#a92479]' 
                                    : 'text-gray-600 hover:bg-[#a92479] hover:bg-opacity-10 hover:text-[#a92479]'}`}
                        >
                            <div className="flex items-center">
                                {Icon && <Icon className={`mr-3 flex-shrink-0 h-5 w-5 ${
                                    isOpen || hasActiveChild ? 'text-[#a92479]' : 'text-gray-500'
                                }`} />}
                                {item.label}
                            </div>
                            {isOpen ? (
                                <ChevronUpIcon className={`ml-2 h-4 w-4 ${
                                    hasActiveChild ? 'text-[#a92479]' : ''
                                }`} />
                            ) : (
                                <ChevronDownIcon className={`ml-2 h-4 w-4 ${
                                    hasActiveChild ? 'text-[#a92479]' : ''
                                }`} />
                            )}
                        </div>

                        <div 
                            className={`ml-4 space-y-1 mt-1 transition-all duration-200 ease-in-out ${
                                isOpen ? 'block' : 'hidden'
                            }`}
                        >
                            {item.subItems.map((subItem, subIndex) => {
                                const subItemActive = isActive(subItem.baseRoute || subItem.href);
                                return (
                                    <Link
                                        key={subIndex}
                                        href={subItem.href}
                                        className={`flex items-center pl-8 pr-4 py-2 text-sm font-medium rounded-md
                                            ${subItemActive
                                                ? 'bg-[#a92479] bg-opacity-10 text-[#a92479] font-semibold'
                                                : 'text-gray-600 hover:bg-[#a92479] hover:bg-opacity-10 hover:text-[#a92479]'}`}
                                    >
                                        {subItem.icon && <subItem.icon className={`mr-3 flex-shrink-0 h-5 w-5 ${
                                            subItemActive ? 'text-[#a92479]' : 'text-gray-500'
                                        }`} />}
                                        {subItem.label}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                </div>
            );
        } else {
            return (
                <Link
                    key={index}
                    href={item.href}
                    className={`flex items-center px-4 py-2 text-sm font-medium rounded-md
                        ${active 
                            ? 'bg-[#a92479] bg-opacity-10 text-[#a92479] font-semibold' 
                            : 'text-gray-600 hover:bg-[#a92479] hover:bg-opacity-10 hover:text-[#a92479]'}`}
                    onClick={item.onClick}
                    preserveState={false}
                    preserveScroll={false}
                >
                    {Icon && <Icon className={`mr-3 flex-shrink-0 h-5 w-5 ${
                        active ? 'text-[#a92479]' : 'text-gray-500'
                    }`} />}
                    {item.label}
                </Link>
            );
        }
    };

    return (
        <div className="flex flex-col w-64 min-h-screen bg-white border-r border-gray-200">
            <div className="flex flex-col items-center p-6 border-b border-gray-200">
                {settings?.company_logo ? (
                    <img 
                        src={`/storage/${settings.company_logo}`}
                        alt={settings?.company_name}
                        className="w-12 h-12 object-contain"
                    />
                ) : (
                    <ApplicationLogo className="w-12 h-12" />
                )}
                <h1 className="mt-4 text-xl font-semibold text-gray-900">
                    {settings?.company_name || 'Perfect Travels'}
                </h1>
            </div>
            
            <nav className="flex-1 overflow-y-auto p-4 space-y-1">
                {navigation.map((item, index) => renderNavItem(item, index))}
            </nav>
        </div>
    );
} 