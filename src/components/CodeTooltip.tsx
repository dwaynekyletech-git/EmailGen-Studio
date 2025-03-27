import React from 'react';

interface CodeTooltipProps {
  title: string;
  description: string;
  code?: string;
  position: { x: number; y: number };
  onClose: () => void;
  type?: 'info' | 'warning' | 'error' | 'tip';
  darkMode?: boolean;
}

const CodeTooltip: React.FC<CodeTooltipProps> = ({
  title,
  description,
  code,
  position,
  onClose,
  type = 'info',
  darkMode = false
}) => {
  // Determine background color based on type
  const getBgColor = (): string => {
    if (darkMode) {
      return type === 'error'
        ? 'bg-red-900/30'
        : type === 'warning'
        ? 'bg-yellow-900/30'
        : type === 'tip'
        ? 'bg-green-900/30'
        : 'bg-blue-900/30';
    } else {
      return type === 'error'
        ? 'bg-red-50'
        : type === 'warning'
        ? 'bg-yellow-50'
        : type === 'tip'
        ? 'bg-green-50'
        : 'bg-blue-50';
    }
  };

  // Determine icon based on type
  const getIcon = (): JSX.Element => {
    const className = "h-5 w-5";
    
    switch (type) {
      case 'error':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      case 'warning':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      case 'tip':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        );
      default: // info
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };
  
  // Calculate tooltip position with offsets to ensure it stays in view
  const getPosition = () => {
    // Basic positioning from the cursor
    let left = position.x + 10;
    let top = position.y + 10;
    
    // Adjust for screen edges (with basic calculations)
    // Assuming a tooltip width of approx. 300px and height of 200px
    const tooltipWidth = 300;
    const tooltipHeight = 200;
    const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1024;
    const screenHeight = typeof window !== 'undefined' ? window.innerHeight : 768;
    
    // Adjust horizontal position if it would go off-screen
    if (left + tooltipWidth > screenWidth - 20) {
      left = position.x - tooltipWidth - 10;
    }
    
    // Adjust vertical position if it would go off-screen
    if (top + tooltipHeight > screenHeight - 20) {
      top = position.y - tooltipHeight - 10;
    }
    
    return { left, top };
  };
  
  const tooltipPosition = getPosition();

  return (
    <div 
      className={`absolute z-40 shadow-lg rounded-md ${getBgColor()} p-4 w-[300px] pointer-events-auto`}
      style={{
        left: tooltipPosition.left,
        top: tooltipPosition.top
      }}
    >
      <div className="flex items-start">
        <div className={`mr-3 ${
          type === 'error' 
            ? 'text-red-600 dark:text-red-400' 
            : type === 'warning' 
            ? 'text-yellow-600 dark:text-yellow-400' 
            : type === 'tip' 
            ? 'text-green-600 dark:text-green-400' 
            : 'text-blue-600 dark:text-blue-400'
        }`}>
          {getIcon()}
        </div>
        <div className="flex-grow">
          <h3 className={`font-medium text-sm ${darkMode ? 'text-white' : 'text-zinc-900'}`}>
            {title}
          </h3>
          <p className={`text-xs mt-1 ${darkMode ? 'text-zinc-300' : 'text-zinc-600'}`}>
            {description}
          </p>
          {code && (
            <pre className={`mt-2 text-xs ${darkMode ? 'bg-zinc-800' : 'bg-white'} p-2 rounded overflow-x-auto`}>
              <code>{code}</code>
            </pre>
          )}
        </div>
        <button
          onClick={onClose}
          className={`text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 ml-2 -mt-1`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default CodeTooltip; 