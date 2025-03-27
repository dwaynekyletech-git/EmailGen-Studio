import React, { useState, useEffect } from 'react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onExecuteCommand: (command: string, params?: any) => void;
}

// Command interface
interface Command {
  id: string;
  name: string;
  description: string;
  shortcut?: string;
  category: 'format' | 'template' | 'documentation' | 'help';
}

const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onExecuteCommand
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [commands, setCommands] = useState<Command[]>([
    // Formatting commands
    {
      id: 'format-code',
      name: 'Format Code',
      description: 'Format the HTML code for better readability',
      shortcut: '⌘+Shift+F',
      category: 'format'
    },
    {
      id: 'minify-code',
      name: 'Minify Code',
      description: 'Remove whitespace and reduce file size',
      category: 'format'
    },
    {
      id: 'validate-html',
      name: 'Validate HTML',
      description: 'Check for HTML validation errors',
      category: 'format'
    },
    
    // Template commands
    {
      id: 'add-header',
      name: 'Add Header',
      description: 'Insert a common email header template',
      category: 'template'
    },
    {
      id: 'add-footer',
      name: 'Add Footer',
      description: 'Insert a common email footer with unsubscribe link',
      category: 'template'
    },
    {
      id: 'add-button',
      name: 'Add Button',
      description: 'Insert an email-compatible button',
      category: 'template'
    },
    
    // Documentation
    {
      id: 'docs-email-best-practices',
      name: 'Email Best Practices',
      description: 'Show documentation for email HTML best practices',
      category: 'documentation'
    },
    {
      id: 'docs-sfmc-compatibility',
      name: 'SFMC Compatibility',
      description: 'Show compatibility guidelines for Salesforce Marketing Cloud',
      category: 'documentation'
    },
    
    // Help
    {
      id: 'help-responsive',
      name: 'Help: Make Responsive',
      description: 'Get assistance with making your email responsive',
      category: 'help'
    },
    {
      id: 'help-inline-css',
      name: 'Help: Inline CSS',
      description: 'Get assistance with inlining CSS',
      category: 'help'
    }
  ]);
  
  const filteredCommands = commands.filter(command => {
    const searchLower = searchTerm.toLowerCase();
    return (
      command.name.toLowerCase().includes(searchLower) ||
      command.description.toLowerCase().includes(searchLower) ||
      command.category.toLowerCase().includes(searchLower)
    );
  });
  
  // Reset selection when search changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchTerm]);
  
  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prevIndex => 
            prevIndex < filteredCommands.length - 1 ? prevIndex + 1 : prevIndex
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prevIndex => 
            prevIndex > 0 ? prevIndex - 1 : prevIndex
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            executeCommand(filteredCommands[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex, onClose]);
  
  // Focus input when palette opens
  useEffect(() => {
    if (isOpen) {
      const inputElement = document.getElementById('command-palette-input');
      if (inputElement) {
        inputElement.focus();
      }
    }
  }, [isOpen]);
  
  const executeCommand = (command: Command) => {
    onExecuteCommand(command.id);
    onClose();
    setSearchTerm('');
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center pt-[20vh]">
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl w-full max-w-xl overflow-hidden">
        <div className="p-4 border-b dark:border-zinc-700">
          <input
            id="command-palette-input"
            type="text"
            className="w-full px-3 py-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Search commands... (e.g., 'format', 'help')"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoFocus
          />
        </div>
        
        <div className="max-h-[60vh] overflow-y-auto">
          {filteredCommands.length > 0 ? (
            <div className="py-2">
              {filteredCommands.map((command, index) => (
                <div
                  key={command.id}
                  className={`px-4 py-2 cursor-pointer ${
                    index === selectedIndex
                      ? 'bg-blue-50 dark:bg-blue-900/20'
                      : 'hover:bg-zinc-50 dark:hover:bg-zinc-800'
                  }`}
                  onClick={() => executeCommand(command)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium text-sm">{command.name}</div>
                      <div className="text-xs text-zinc-500">{command.description}</div>
                    </div>
                    {command.shortcut && (
                      <div className="text-xs bg-zinc-200 dark:bg-zinc-700 px-2 py-1 rounded">
                        {command.shortcut}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center">
              <p className="text-zinc-500">No commands found matching "{searchTerm}"</p>
            </div>
          )}
        </div>
        
        <div className="p-3 bg-zinc-50 dark:bg-zinc-800 text-xs text-zinc-500 border-t dark:border-zinc-700">
          <div className="flex justify-between">
            <div>
              <span className="bg-zinc-200 dark:bg-zinc-700 px-1 rounded">↑↓</span> to navigate
              <span className="mx-2">•</span>
              <span className="bg-zinc-200 dark:bg-zinc-700 px-1 rounded">Enter</span> to select
            </div>
            <div>
              <span className="bg-zinc-200 dark:bg-zinc-700 px-1 rounded">Esc</span> to close
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette; 