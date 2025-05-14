
import React from 'react';
import { Video } from 'lucide-react';
import { MediaItem } from '@/types/memory';

interface MemoryGridProps {
  mediaItems: MediaItem[];
  onItemClick: (index: number) => void;
}

const MemoryGrid: React.FC<MemoryGridProps> = ({ mediaItems, onItemClick }) => {
  return (
    <div className="instagram-grid">
      {mediaItems.map((media, index) => (
        <div 
          key={media.id} 
          className="media-item cursor-pointer"
          onClick={() => onItemClick(index)}
        >
          {media.type === 'video' ? (
            <>
              <video
                src={media.url}
                poster={media.thumbnail}
                className="h-full w-full object-cover"
              />
              <div className="absolute top-1 right-1 bg-black/50 backdrop-blur-sm p-1 rounded-md">
                <Video className="h-3 w-3 text-white" />
              </div>
            </>
          ) : (
            <img
              src={media.url}
              alt={`Memory photo`}
              className="h-full w-full object-cover"
            />
          )}
          <div className="media-item-overlay"></div>
        </div>
      ))}
    </div>
  );
};

export default MemoryGrid;
