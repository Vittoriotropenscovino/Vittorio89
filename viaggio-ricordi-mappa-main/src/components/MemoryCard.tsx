
import React from 'react';
import { Memory } from '../types/memory';
import { MapPin, Calendar, Image } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface MemoryCardProps {
  memory: Memory;
  isSelected: boolean;
  onClick: () => void;
}

const MemoryCard: React.FC<MemoryCardProps> = ({ memory, isSelected, onClick }) => {
  const formattedDate = new Date(memory.date).toLocaleDateString('it-IT', { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  });

  // Placeholder thumbnail if none is provided
  const thumbnail = memory.thumbnail || memory.media?.[0]?.url || 'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=200&q=80';

  return (
    <Card 
      className={`transition-all duration-300 hover:shadow-lg cursor-pointer mb-3 glassmorphism border-0 ${
        isSelected ? 'scale-[1.02] ring-2 ring-travel-blue/50' : ''
      }`}
      onClick={onClick}
    >
      <CardContent className="p-3">
        <div className="flex items-start space-x-3">
          <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 shadow-md relative group">
            <img 
              src={thumbnail} 
              alt={memory.place}
              className="w-full h-full object-cover transition-all duration-500 group-hover:scale-110"
              loading="lazy"
            />
            {memory.media && memory.media.length > 1 && (
              <div className="absolute bottom-1 right-1 bg-black/50 rounded-md px-1.5 py-0.5 text-[10px] text-white font-medium">
                +{memory.media.length}
              </div>
            )}
          </div>
          
          <div className="flex-1">
            <div className="flex items-center mb-1">
              <div className="p-1 rounded-full bg-travel-blue/10 text-travel-blue mr-2">
                <MapPin className="h-4 w-4" />
              </div>
              <h3 className="font-bold text-[15px] leading-tight">{memory.place}</h3>
            </div>
            
            <div className="flex items-center text-xs text-gray-500 mb-1">
              <Calendar className="h-3 w-3 mr-1 text-gray-400" />
              {formattedDate}
            </div>
            
            <p className="text-xs line-clamp-1 text-gray-600 dark:text-gray-300">
              {memory.description}
            </p>
            
            {memory.media && memory.media.length > 0 && (
              <div className="flex items-center mt-1 text-xs text-gray-500">
                <Image className="h-3 w-3 mr-1" />
                <span>{memory.media.length} media</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MemoryCard;
