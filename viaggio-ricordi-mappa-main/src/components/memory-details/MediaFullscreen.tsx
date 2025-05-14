
import React from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MediaItem } from '@/types/memory';

interface MediaFullscreenProps {
  mediaItems: MediaItem[];
  initialIndex: number;
  onClose: () => void;
}

const MediaFullscreen: React.FC<MediaFullscreenProps> = ({
  mediaItems,
  initialIndex,
  onClose
}) => {
  const [currentIndex, setCurrentIndex] = React.useState(initialIndex);
  
  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : mediaItems.length - 1));
  };
  
  const handleNext = () => {
    setCurrentIndex((prev) => (prev < mediaItems.length - 1 ? prev + 1 : 0));
  };
  
  const currentMedia = mediaItems[currentIndex];

  // Keyboard navigation
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') handleNext();
      else if (e.key === 'ArrowLeft') handlePrevious();
      else if (e.key === 'Escape') onClose();
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex]);

  return (
    <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
      {/* Close button */}
      <Button 
        variant="ghost" 
        size="icon" 
        className="absolute top-4 right-4 text-white z-10 rounded-full"
        onClick={onClose}
      >
        <X className="h-6 w-6" />
      </Button>
      
      {/* Media content */}
      <div className="w-full h-full flex items-center justify-center p-4">
        {currentMedia.type === 'video' ? (
          <video
            src={currentMedia.url}
            controls
            autoPlay
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <img 
            src={currentMedia.url} 
            alt="Fullscreen view" 
            className="max-h-full max-w-full object-contain"
          />
        )}
      </div>
      
      {/* Navigation arrows */}
      <div className="absolute inset-x-0 top-1/2 transform -translate-y-1/2 flex justify-between px-4">
        <Button 
          variant="ghost" 
          size="icon" 
          className="rounded-full bg-black/30 text-white hover:bg-black/50"
          onClick={handlePrevious}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
            <path d="m15 18-6-6 6-6"/>
          </svg>
        </Button>
        
        <Button 
          variant="ghost" 
          size="icon" 
          className="rounded-full bg-black/30 text-white hover:bg-black/50"
          onClick={handleNext}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
            <path d="m9 18 6-6-6-6"/>
          </svg>
        </Button>
      </div>
      
      {/* Counter */}
      <div className="absolute bottom-4 inset-x-0 text-center text-white">
        {currentIndex + 1} / {mediaItems.length}
      </div>
    </div>
  );
};

export default MediaFullscreen;
