import { Link } from '@inertiajs/react';

export default function NavLink({
    active = false,
    className = '',
    children,
    ...props
}) {
    return (
        <Link
            {...props}
            className={`w-full flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors duration-150 ease-in-out ${
                active
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            } ${className}`}
        >
            {children}
        </Link>
    );
}
