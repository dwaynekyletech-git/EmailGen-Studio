import React from 'react';

interface CodeTooltipProps {
  title: string;
  description: string;
  code?: string;
  position: { x: number; y: number };
  onClose: () => void;
  onApply?: (code: string) => void;
  type?: 'info' | 'warning' | 'error' | 'tip';
  darkMode?: boolean;
}

const CodeTooltip: React.FC<CodeTooltipProps> = ({
  title,
  description,
  code,
  position,
  onClose,
  onApply,
  type = 'info',
  darkMode = false
}) => {
  // Get color based on type
  const getTypeColor = () => {
    switch (type) {
      case 'error':
        return 'border-red-500 bg-red-50 dark:bg-red-900/30';
      case 'warning':
        return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/30';
      case 'tip':
        return 'border-green-500 bg-green-50 dark:bg-green-900/30';
      case 'info':
      default:
        return 'border-blue-500 bg-blue-50 dark:bg-blue-900/30';
    }
  };

  return (
    <div 
      className={`rounded-md border-l-4 p-3 ${getTypeColor()} ${darkMode ? 'dark' : ''}`}
      style={{
        position: 'absolute',
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 1000,
        maxWidth: '300px',
        minWidth: '200px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
      }}
    >
      <div className="flex items-start">
        <div className="flex-1">
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">{title}</h3>
          <p className="mt-1 text-xs text-gray-700 dark:text-gray-300">{description}</p>
          
          {code && (
            <pre className="mt-2 text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-x-auto">
              <code>{code}</code>
            </pre>
          )}
        </div>
        
        <button 
          onClick={onClose}
          className="ml-2 text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      {code && onApply && (
        <div className="mt-3 flex justify-end">
          <button
            onClick={() => onApply(code)}
            className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
};

export default CodeTooltip; 