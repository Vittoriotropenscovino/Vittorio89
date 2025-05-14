
import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { MapPin, Calendar, Image, X } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { MediaItem } from '../types/memory';

interface AddMemoryFormProps {
  onAddMemory: (place: string, description: string, date: string, media: File[]) => void;
  loading: boolean;
}

const AddMemoryForm: React.FC<AddMemoryFormProps> = ({ onAddMemory, loading }) => {
  const [place, setPlace] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const { toast } = useToast();

  const { getRootProps, getInputProps } = useDropzone({
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png'],
      'video/*': ['.mp4', '.mov']
    },
    onDrop: acceptedFiles => {
      // Create previews
      const newPreviews = acceptedFiles.map(file => URL.createObjectURL(file));
      setPreviews(prev => [...prev, ...newPreviews]);
      
      // Store files
      setUploadedFiles(prev => [...prev, ...acceptedFiles]);
    }
  });

  const removeFile = (index: number) => {
    // Revoke object URL to avoid memory leaks
    URL.revokeObjectURL(previews[index]);
    
    // Remove from both arrays
    setPreviews(prev => prev.filter((_, i) => i !== index));
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!place.trim()) {
      toast({
        title: "Inserisci un luogo",
        description: "Per favore inserisci il nome del luogo",
        variant: "destructive"
      });
      return;
    }
    
    onAddMemory(place, description, date, uploadedFiles);
    
    // Clear form
    setPlace('');
    setDescription('');
    setDate(new Date().toISOString().split('T')[0]);
    
    // Revoke all object URLs
    previews.forEach(preview => URL.revokeObjectURL(preview));
    setPreviews([]);
    setUploadedFiles([]);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full">
      <div className="text-2xl font-bold mb-4 flex items-center justify-center p-2 border-b">
        Aggiungi un ricordo
      </div>
      
      <div className="flex-1 overflow-auto px-4">
        <div className="space-y-4">
          <div>
            <Label htmlFor="place" className="flex items-center">
              <MapPin className="mr-1 h-4 w-4 text-travel-blue" />
              Luogo
            </Label>
            <Input
              id="place"
              value={place}
              onChange={(e) => setPlace(e.target.value)}
              placeholder="Dove sei stato?"
              className="mt-1"
            />
          </div>
          
          <div>
            <Label htmlFor="description">Descrizione</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Raccontaci il tuo ricordo..."
              className="mt-1 min-h-[100px]"
            />
          </div>
          
          <div>
            <Label htmlFor="date" className="flex items-center">
              <Calendar className="mr-1 h-4 w-4 text-travel-blue" />
              Data
            </Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1"
            />
          </div>
          
          <div>
            <Label className="flex items-center mb-2">
              <Image className="mr-1 h-4 w-4 text-travel-blue" />
              Foto e Video
            </Label>
            
            <div {...getRootProps()} className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
              <input {...getInputProps()} />
              <div className="flex flex-col items-center">
                <Image className="h-12 w-12 text-gray-400 mb-2" />
                <p className="text-center text-sm text-gray-600 dark:text-gray-300">
                  Trascina qui le tue foto e video o clicca per selezionarli
                </p>
              </div>
            </div>
            
            {previews.length > 0 && (
              <div className="mt-4 grid grid-cols-3 gap-2">
                {previews.map((preview, index) => (
                  <div key={index} className="relative rounded-md overflow-hidden aspect-square">
                    <img
                      src={preview}
                      alt={`Upload preview ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="absolute top-1 right-1 bg-black/60 rounded-full p-1"
                    >
                      <X className="h-3 w-3 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="p-4 mt-4 border-t">
        <Button 
          type="submit" 
          className="w-full bg-travel-blue hover:bg-travel-navy"
          disabled={loading}
        >
          {loading ? "Ricerca in corso..." : "Aggiungi ricordo"}
        </Button>
      </div>
    </form>
  );
};

export default AddMemoryForm;
