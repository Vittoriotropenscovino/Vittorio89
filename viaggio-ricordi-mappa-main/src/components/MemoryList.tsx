
import React from 'react';
import { Memory } from '../types/memory';
import MemoryCard from './MemoryCard';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search } from 'lucide-react';

interface MemoryListProps {
  memories: Memory[];
  selectedMemory: Memory | null;
  onSelectMemory: (memory: Memory) => void;
}

const MemoryList: React.FC<MemoryListProps> = ({ 
  memories, 
  selectedMemory, 
  onSelectMemory 
}) => {
  return (
    <div className="p-4 h-full flex flex-col">
      <div className="mb-4">
        <h2 className="text-xl font-bold mb-3 text-center">I miei ricordi</h2>
        <div className="relative">
          <input
            type="text"
            placeholder="Cerca un luogo..."
            className="w-full bg-white/40 dark:bg-black/40 backdrop-blur-sm border-0 rounded-full py-2 pl-10 pr-4 focus:ring-2 focus:ring-travel-blue focus:outline-none"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
        </div>
      </div>
      
      {memories.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-white/30 dark:bg-slate-800/30 rounded-lg">
          <p className="text-gray-600 dark:text-gray-300">Nessun ricordo ancora aggiunto.</p>
          <p className="text-gray-600 dark:text-gray-300">Aggiungi il tuo primo ricordo di viaggio!</p>
        </div>
      ) : (
        <ScrollArea className="flex-1 pr-2">
          <div className="space-y-3">
            {memories.map((memory) => (
              <MemoryCard 
                key={memory.id} 
                memory={memory} 
                isSelected={selectedMemory?.id === memory.id}
                onClick={() => onSelectMemory(memory)}
              />
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
};

export default MemoryList;
