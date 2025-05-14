
import React, { useState } from 'react';
import { Memory } from '../types/memory';
import { Button } from '@/components/ui/button';
import { useDropzone } from 'react-dropzone';
import { useToast } from '@/components/ui/use-toast';
import MemoryHeader from './memory-details/MemoryHeader';
import MemoryCarousel from './memory-details/MemoryCarousel';
import MemoryGrid from './memory-details/MemoryGrid';
import MemoryInfo from './memory-details/MemoryInfo';
import MediaFullscreen from './memory-details/MediaFullscreen';

interface MemoryDetailsProps {
  memory: Memory;
  onClose: () => void;
  onAddMedia?: (memoryId: string, files: File[]) => void;
}

const MemoryDetails: React.FC<MemoryDetailsProps> = ({ memory, onClose, onAddMedia }) => {
  const [expanded, setExpanded] = useState(false);
  const [isAddingMedia, setIsAddingMedia] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  // Set default view mode to grid as requested
  const [viewMode, setViewMode] = useState<'carousel' | 'grid'>('grid');
  const [fullscreenView, setFullscreenView] = useState(false);
  const { toast } = useToast();
  
  const formattedDate = new Date(memory.date).toLocaleDateString('it-IT', { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  });

  const placeholderMedia = [
    { id: '1', type: 'image' as const, url: 'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1286&q=80' },
    { id: '2', type: 'image' as const, url: 'https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1283&q=80' },
    { id: '3', type: 'image' as const, url: 'https://images.unsplash.com/photo-1515542622106-78bda8ba0e5b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80' }
  ];

  const mediaItems = memory.media || placeholderMedia;

  const dropzoneConfig = useDropzone({
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif'],
      'video/*': ['.mp4', '.mov', '.avi']
    },
    onDrop: (acceptedFiles) => {
      if (onAddMedia) {
        onAddMedia(memory.id, acceptedFiles);
        setIsAddingMedia(false);
        toast({
          title: "Media aggiunto",
          description: `${acceptedFiles.length} file caricati con successo`
        });
      }
    }
  });

  const handleExpandClick = () => {
    setExpanded(!expanded);
  };

  const toggleViewMode = () => {
    setViewMode(viewMode === 'carousel' ? 'grid' : 'carousel');
  };

  const handleGridItemClick = (index: number) => {
    setActiveIndex(index);
    // Open fullscreen view directly when clicking on a grid item
    setFullscreenView(true);
  };
  
  const handleCarouselFullscreen = (index: number) => {
    setActiveIndex(index);
    setFullscreenView(true);
  };

  return (
    <div className={`memory-bottom-sheet ${expanded ? 'h-[80vh]' : 'h-auto'}`}>
      {/* Header with drag handle */}
      <MemoryHeader place={memory.place} onClose={onClose} />
      
      <div className={`overflow-y-auto ${expanded ? 'max-h-[calc(80vh-5rem)]' : 'max-h-[60vh]'}`}>
        {/* Media content (carousel or grid) */}
        <div className="px-4 pb-2">
          {viewMode === 'carousel' ? (
            <MemoryCarousel 
              mediaItems={mediaItems} 
              activeIndex={activeIndex}
              onIndexChange={setActiveIndex}
              place={memory.place}
              onFullscreenView={handleCarouselFullscreen}
            />
          ) : (
            <MemoryGrid 
              mediaItems={mediaItems} 
              onItemClick={handleGridItemClick} 
            />
          )}
          
          {/* View mode toggle */}
          <div className="flex justify-end mt-1">
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs px-2 py-1 h-auto"
              onClick={toggleViewMode}
            >
              {viewMode === 'grid' ? 'Carousel' : 'Grid'}
            </Button>
          </div>
        </div>

        {/* Memory info section */}
        <MemoryInfo 
          place={memory.place}
          date={formattedDate}
          description={memory.description}
          expanded={expanded}
          onExpandClick={handleExpandClick}
          onAddMedia={() => setIsAddingMedia(true)}
          isAddingMedia={isAddingMedia}
          dropzoneProps={dropzoneConfig}
        />
      </div>
      
      {/* Fullscreen media view */}
      {fullscreenView && (
        <MediaFullscreen 
          mediaItems={mediaItems}
          initialIndex={activeIndex}
          onClose={() => setFullscreenView(false)}
        />
      )}
    </div>
  );
};

export default MemoryDetails;
