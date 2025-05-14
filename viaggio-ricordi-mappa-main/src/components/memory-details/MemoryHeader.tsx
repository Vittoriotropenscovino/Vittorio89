
import React from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MemoryHeaderProps {
  place: string;
  onClose: () => void;
}

const MemoryHeader: React.FC<MemoryHeaderProps> = ({ place, onClose }) => {
  return (
    <div className="flex flex-col items-center pt-2 pb-1">
      <div className="w-12 h-1 bg-gray-300 dark:bg-gray-700 rounded-full mb-2"></div>
      <div className="flex justify-between items-center w-full px-4 pb-2">
        <h2 className="text-xl font-bold">{place}</h2>
        <Button 
          variant="ghost" 
          size="icon" 
          className="rounded-full hover:bg-gray-100 dark:hover:bg-gray-800" 
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};

export default MemoryHeader;
