import React, { useState, useEffect } from 'react';
import Map from '../components/Map';
import { Memory, MediaItem } from '../types/memory';
import { Plus, MapPin, Layers, X } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import AddMemoryForm from '../components/AddMemoryForm';
import MemoryDetails from '../components/MemoryDetails';
import MemoryList from '../components/MemoryList';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

// Sample images for demo purposes
const sampleImages = [
  'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1515542622106-78bda8ba0e5b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1533105079780-92b9be482077?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1534445538923-ab7e9c01d85c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80'
];

// Generate random media array for each memory
const generateRandomMedia = (count: number = 3) => {
  return Array.from({ length: count }, (_, i) => ({
    id: `media-${Date.now()}-${i}`,
    type: 'image' as const,
    url: sampleImages[Math.floor(Math.random() * sampleImages.length)]
  }));
};

const Index = () => {
  const [memories, setMemories] = useState<Memory[]>(() => {
    const saved = localStorage.getItem('travel-memories');
    if (saved) {
      const parsedMemories = JSON.parse(saved);
      // Add sample media to existing memories if they don't have any
      return parsedMemories.map((memory: Memory) => ({
        ...memory,
        media: memory.media || generateRandomMedia(Math.floor(Math.random() * 4) + 1),
        thumbnail: memory.thumbnail || (memory.media?.[0]?.url || sampleImages[0])
      }));
    }
    return [];
  });
  
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [loading, setLoading] = useState(false);
  const [isListOpen, setIsListOpen] = useState(false);
  const [isAddingMemory, setIsAddingMemory] = useState(false);
  const { toast } = useToast();
  
  useEffect(() => {
    localStorage.setItem('travel-memories', JSON.stringify(memories));
  }, [memories]);
  
  // Function to geocode a place name to coordinates
  const geocodePlace = async (place: string): Promise<[number, number] | null> => {
    try {
      setLoading(true);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(place)}&format=json&limit=1`
      );
      
      const data = await response.json();
      
      if (data && data.length > 0) {
        return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
      }
      
      return null;
    } catch (error) {
      console.error("Geocoding error:", error);
      return null;
    } finally {
      setLoading(false);
    }
  };
  
  // Convert File objects to data URLs for storage
  const processFiles = async (files: File[]): Promise<MediaItem[]> => {
    const processFile = (file: File): Promise<MediaItem> => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const type = file.type.startsWith('image/') ? 'image' : 'video';
          resolve({
            id: `media-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: type,
            url: reader.result as string,
          });
        };
        reader.readAsDataURL(file);
      });
    };
    
    return Promise.all(files.map(processFile));
  };
  
  const handleAddMemory = async (place: string, description: string, date: string, files: File[]) => {
    const coordinates = await geocodePlace(place);
    
    if (!coordinates) {
      toast({
        title: "Luogo non trovato",
        description: "Non siamo riusciti a trovare questo luogo. Prova con un altro nome.",
        variant: "destructive"
      });
      return;
    }
    
    const [lat, lng] = coordinates;
    
    let mediaItems: MediaItem[] = [];
    if (files.length > 0) {
      // Process uploaded files
      mediaItems = await processFiles(files);
    } else {
      // Or use random placeholder media
      mediaItems = generateRandomMedia(Math.floor(Math.random() * 4) + 1);
    }
    
    const newMemory: Memory = {
      id: `memory-${Date.now()}`,
      place,
      description,
      date,
      location: { lat, lng },
      media: mediaItems,
      thumbnail: mediaItems[0]?.url
    };
    
    setMemories((prev) => [...prev, newMemory]);
    setSelectedMemory(newMemory);
    setIsAddingMemory(false);
    
    toast({
      title: "Ricordo aggiunto!",
      description: `${place} è stato aggiunto alla tua mappa.`,
    });
  };

  const handleAddMemoryMedia = async (memoryId: string, files: File[]) => {
    if (files.length === 0) return;
    
    const newMediaItems = await processFiles(files);
    
    setMemories(prev => prev.map(memory => {
      if (memory.id === memoryId) {
        const updatedMedia = [...(memory.media || []), ...newMediaItems];
        return {
          ...memory,
          media: updatedMedia,
          thumbnail: memory.thumbnail || updatedMedia[0]?.url
        };
      }
      return memory;
    }));
  };

  const closeMemoryDetails = () => {
    setSelectedMemory(null);
  };
  
  return (
    <div className="h-screen w-full flex flex-col overflow-hidden bg-background font-inter">
      {/* Full-screen map */}
      <div className="relative w-full h-full">
        <Map 
          memories={memories} 
          selectedMemory={selectedMemory}
          onSelectMemory={setSelectedMemory}
        />
        
        {/* Top app bar */}
        <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-10">
          <div className="glass rounded-full px-4 py-2 shadow-lg flex items-center">
            <MapPin className="text-travel-blue mr-2 h-5 w-5" />
            <h1 className="text-xl font-semibold">Viaggio Ricordi</h1>
          </div>
          
          <Button 
            onClick={() => setIsListOpen(!isListOpen)}
            variant="outline" 
            size="icon"
            className="rounded-full glass border-0 shadow-lg"
          >
            {isListOpen ? <X className="h-5 w-5" /> : <Layers className="h-5 w-5" />}
          </Button>
        </div>
        
        {/* Memories list (side panel) */}
        <div className={`absolute top-16 bottom-24 right-4 w-80 transition-all duration-300 transform ${isListOpen ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'} z-10`}>
          <div className="h-full glassmorphism rounded-2xl shadow-lg overflow-hidden">
            <MemoryList 
              memories={memories} 
              selectedMemory={selectedMemory}
              onSelectMemory={setSelectedMemory}
            />
          </div>
        </div>
        
        {/* Memory details (bottom sheet) */}
        {selectedMemory && (
          <div className="absolute inset-x-0 bottom-0 z-20">
            <MemoryDetails 
              memory={selectedMemory} 
              onClose={closeMemoryDetails}
              onAddMedia={handleAddMemoryMedia}
            />
          </div>
        )}
        
        {/* Instagram-style FAB button */}
        <button 
          className="add-memory-fab animate-pulse-subtle"
          onClick={() => setIsAddingMemory(true)}
        >
          <Plus className="h-7 w-7" />
        </button>
        
        {/* Add memory modal */}
        {isAddingMemory && (
          <div className="instagram-modal" onClick={() => setIsAddingMemory(false)}>
            <div className="instagram-modal-content animate-scale-in" onClick={(e) => e.stopPropagation()}>
              <div className="instagram-modal-header">
                <h2 className="text-xl font-bold">Aggiungi ricordo</h2>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="rounded-full" 
                  onClick={() => setIsAddingMemory(false)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <div className="instagram-modal-body">
                <AddMemoryForm onAddMemory={handleAddMemory} loading={loading} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
