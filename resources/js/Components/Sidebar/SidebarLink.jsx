import { Link } from '@inertiajs/react';
import { useState } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

export default function SidebarLink({ href, icon: Icon, label, active, subItems = [] }) {
    const [isOpen, setIsOpen] = useState(false);
    const hasSubItems = subItems.length > 0;

    return (
        <div className="w-full">
            <Link
                href={hasSubItems ? '#' : href}
                onClick={() => hasSubItems && setIsOpen(!isOpen)}
                className={`flex items-center w-full px-4 py-2.5 text-sm transition-colors duration-200 ${
                    active 
                        ? 'bg-[#a92479] bg-opacity-10 text-[#a92479] font-semibold' 
                        : 'text-gray-600 hover:bg-[#a92479] hover:bg-opacity-10 hover:text-[#a92479]'
                }`}
            >
                {Icon && (
                    <Icon className={`w-5 h-5 mr-3 ${active ? 'text-[#a92479]' : 'text-gray-500'}`} />
                )}
                <span className="flex-1">{label}</span>
                {hasSubItems && (
                    <ChevronDownIcon 
                        className={`w-4 h-4 transition-transform duration-200 ${
                            isOpen ? 'transform rotate-180' : ''
                        } ${active ? 'text-[#a92479]' : 'text-gray-500'}`}
                    />
                )}
            </Link>
            
            {hasSubItems && isOpen && (
                <div className="ml-4 mt-1 space-y-1">
                    {subItems.map((item, index) => (
                        <Link
                            key={index}
                            href={item.href}
                            className={`flex items-center px-4 py-2 text-sm ${
                                item.active
                                    ? 'bg-[#a92479] bg-opacity-10 text-[#a92479] font-semibold'
                                    : 'text-gray-600 hover:bg-[#a92479] hover:bg-opacity-10 hover:text-[#a92479]'
                            }`}
                        >
                            {item.icon && (
                                <item.icon className={`w-4 h-4 mr-3 ${
                                    item.active ? 'text-[#a92479]' : 'text-gray-500'
                                }`} />
                            )}
                            {item.label}
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
} 