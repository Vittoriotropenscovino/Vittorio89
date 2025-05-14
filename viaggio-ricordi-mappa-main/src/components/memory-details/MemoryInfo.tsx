
import React from 'react';
import { Calendar, Camera, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDropzone } from 'react-dropzone';
import { Upload } from 'lucide-react';

interface MemoryInfoProps {
  place: string;
  date: string;
  description: string;
  expanded: boolean;
  onExpandClick: () => void;
  onAddMedia: () => void;
  isAddingMedia: boolean;
  dropzoneProps: ReturnType<typeof useDropzone>;
}

const MemoryInfo: React.FC<MemoryInfoProps> = ({
  place,
  date,
  description,
  expanded,
  onExpandClick,
  onAddMedia,
  isAddingMedia,
  dropzoneProps
}) => {
  const { getRootProps, getInputProps, isDragActive } = dropzoneProps;
  
  const handleAmazonPhotosConnect = () => {
    alert("Funzionalità in arrivo: Connessione con Amazon Photos\n\nQuesto servizio ti permetterà di accedere direttamente alle tue foto di Amazon Photos usando le tue credenziali personali.\n\nLa tua privacy è importante per noi. L'accesso alle foto avverrà in modo sicuro e rispettando tutte le politiche di privacy e protezione dei dati.");
  };

  return (
    <div className="px-4 pb-4">
      {/* Memory info */}
      <div className="flex items-start space-y-2 flex-col mb-3">
        <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
          <Calendar className="h-4 w-4 mr-2" />
          <span>{date}</span>
        </div>
      </div>
      
      {!expanded && (
        <Button 
          variant="ghost" 
          className="flex items-center justify-center gap-1 text-sm w-full"
          onClick={onExpandClick}
        >
          <span>Vedi tutto</span>
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <polyline points="18 15 12 9 6 15"/>
          </svg>
        </Button>
      )}

      {expanded && (
        <>
          <div className="border-t border-gray-200 dark:border-gray-800 pt-3 mt-3">
            <p className="text-base">{description}</p>
          </div>
          
          {isAddingMedia ? (
            <div 
              {...getRootProps()} 
              className={`dropzone mt-4 ${isDragActive ? 'active' : ''}`}
            >
              <input {...getInputProps()} />
              <div className="flex flex-col items-center">
                <Upload className="h-10 w-10 text-gray-400 mb-3" />
                <p className="text-center text-gray-600 dark:text-gray-300 mb-1">
                  Trascina qui le tue foto e video
                </p>
                <p className="text-center text-gray-500 dark:text-gray-400 text-sm">
                  oppure clicca per selezionarli
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2 mt-4">
              <div className="flex justify-between gap-2">
                <Button 
                  variant="outline"
                  className="flex-1 bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700"
                  onClick={onAddMedia}
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Aggiungi foto
                </Button>
                
                <Button 
                  variant="outline"
                  className="flex-1 bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700"
                  onClick={onExpandClick}
                >
                  Chiudi dettagli
                </Button>
              </div>
              
              {/* Pulsante per accedere alle foto di Amazon Photos con messaggio sulla privacy */}
              <Button
                variant="outline"
                className="w-full mt-2 bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700"
                onClick={handleAmazonPhotosConnect}
              >
                <FolderOpen className="h-4 w-4 mr-2" />
                Collega Amazon Photos
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MemoryInfo;
