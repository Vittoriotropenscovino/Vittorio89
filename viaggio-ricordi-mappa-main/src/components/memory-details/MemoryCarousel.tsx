
import React, { useCallback } from 'react';
import { Video } from 'lucide-react';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { MediaItem } from '@/types/memory';
import { type UseEmblaCarouselType } from 'embla-carousel-react';

interface MemoryCarouselProps {
  mediaItems: MediaItem[];
  activeIndex: number;
  onIndexChange: (index: number) => void;
  place: string;
  onFullscreenView?: (index: number) => void;
}

const MemoryCarousel: React.FC<MemoryCarouselProps> = ({ 
  mediaItems, 
  activeIndex, 
  onIndexChange,
  place,
  onFullscreenView
}) => {
  // Instead of directly using the embla carousel hook, we'll just use the shadcn/ui Carousel
  // that already uses embla carousel internally
  const [api, setApi] = React.useState<UseEmblaCarouselType[1] | null>(null);
  
  // Create a proper handler for the Carousel component
  const handleSelectSlide = useCallback((index: number) => {
    onIndexChange(index);
  }, [onIndexChange]);

  // Handle API initialization
  React.useEffect(() => {
    if (!api) return;
    
    const onSelect = () => {
      const currentIndex = api.selectedScrollSnap();
      onIndexChange(currentIndex);
    };

    api.on('select', onSelect);
    
    // Initial selection
    onSelect();

    return () => {
      api.off('select', onSelect);
    };
  }, [api, onIndexChange]);

  // Handle click on media item to view fullscreen
  const handleMediaClick = (index: number) => {
    if (onFullscreenView) {
      onFullscreenView(index);
    }
  };

  return (
    <>
      <Carousel 
        className="w-full"
        setApi={setApi}
      >
        <CarouselContent>
          {mediaItems.map((media, index) => (
            <CarouselItem key={media.id} className="basis-full pl-0">
              <div 
                className="overflow-hidden rounded-xl aspect-video relative group cursor-pointer"
                onClick={() => handleMediaClick(index)}
              >
                {media.type === 'video' ? (
                  <video
                    src={media.url}
                    poster={media.thumbnail}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <img
                    src={media.url}
                    alt={`${place} photo`}
                    className="h-full w-full object-cover transition-all duration-500 group-hover:scale-105"
                  />
                )}
                {media.type === 'video' && (
                  <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-sm p-1 rounded-md">
                    <Video className="h-4 w-4 text-white" />
                  </div>
                )}
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="left-1 bg-white/70 dark:bg-black/70 backdrop-blur-md border-0" />
        <CarouselNext className="right-1 bg-white/70 dark:bg-black/70 backdrop-blur-md border-0" />
      </Carousel>
      
      {/* Carousel indicators */}
      {mediaItems.length > 1 && (
        <div className="flex justify-center space-x-1 mt-2">
          {mediaItems.map((_, index) => (
            <div 
              key={index} 
              className={`w-1.5 h-1.5 rounded-full ${index === activeIndex ? 'bg-travel-blue' : 'bg-gray-300 dark:bg-gray-700'}`}
            ></div>
          ))}
        </div>
      )}
    </>
  );
};

export default MemoryCarousel;
