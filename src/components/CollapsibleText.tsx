import React, { useState, useEffect } from 'react';

interface CollapsibleTextProps {
  text: string;
  isGloballyVisible?: boolean;
}

export function CollapsibleText({ text, isGloballyVisible = false }: CollapsibleTextProps) {
  const [localIsVisible, setLocalIsVisible] = useState(false);
  
  // Update local state when global state changes
  useEffect(() => {
    setLocalIsVisible(isGloballyVisible);
  }, [isGloballyVisible]);

  if (!text || text.trim() === '') {
    return null;
  }

  const handleToggle = () => {
    setLocalIsVisible(!localIsVisible);
  };

  return (
    <div className="mt-1">
      <button
        onClick={handleToggle}
        className="text-xs text-gray-500 hover:text-[#203AEA] 
                 font-medium transition-colors duration-200 hover:underline
                 block mb-2"
      >
        {localIsVisible ? 'Langtext ausblenden' : 'Langtext anzeigen'}
      </button>
      
      {localIsVisible && (
        <div className="text-sm text-gray-700 leading-relaxed bg-gray-50 px-3 py-2 rounded-md 
                      mb-3 max-w-none">
          <div className="whitespace-pre-wrap break-words">
            {text}
          </div>
        </div>
      )}
    </div>
  );
}