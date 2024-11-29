import React from 'react';

export default function Pagination({ meta, links, onPageChange }) {
    return (
        <div className="flex items-center justify-between px-4 py-3 sm:px-6">
            <div className="flex flex-1 justify-between sm:hidden">
                <button
                    onClick={() => onPageChange(meta.current_page - 1)}
                    disabled={!links.prev}
                    className={`relative inline-flex items-center rounded-md px-4 py-2 text-sm font-medium 
                        ${!links.prev 
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                            : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                >
                    Previous
                </button>
                <button
                    onClick={() => onPageChange(meta.current_page + 1)}
                    disabled={!links.next}
                    className={`relative inline-flex items-center rounded-md px-4 py-2 text-sm font-medium 
                        ${!links.next 
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                            : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                >
                    Next
                </button>
            </div>
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <div>
                    <p className="text-sm text-gray-700">
                        Showing <span className="font-medium">{meta.from}</span> to{' '}
                        <span className="font-medium">{meta.to}</span> of{' '}
                        <span className="font-medium">{meta.total}</span> results
                    </p>
                </div>
                <div>
                    <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm">
                        {meta.links.map((link, index) => (
                            <button
                                key={index}
                                onClick={() => {
                                    if (!link.url || link.active) return;
                                    onPageChange(link.label);
                                }}
                                disabled={!link.url || link.active}
                                className={`relative inline-flex items-center px-4 py-2 text-sm font-medium
                                    ${index === 0 ? 'rounded-l-md' : ''} 
                                    ${index === meta.links.length - 1 ? 'rounded-r-md' : ''}
                                    ${link.active 
                                        ? 'z-10 bg-indigo-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600' 
                                        : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:outline-offset-0'}
                                    ${!link.url ? 'cursor-not-allowed bg-gray-100' : ''}`}
                                dangerouslySetInnerHTML={{ __html: link.label }}
                            />
                        ))}
                    </nav>
                </div>
            </div>
        </div>
    );
} 