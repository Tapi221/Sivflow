import React, { useState, useRef } from 'react';
import { Button } from '@/Components/ui/button';
import { Play, Pause, Volume2, ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AudioPlayerProps {
  urls: string[];
}

export function AudioPlayer({ urls }: AudioPlayerProps) {
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const audioRefs = useRef<(HTMLAudioElement | null)[]>([]);

  const togglePlay = (index: number) => {
    if (playingIndex === index) {
      audioRefs.current[index]?.pause();
      setPlayingIndex(null);
    } else {
      if (playingIndex !== null) {
        audioRefs.current[playingIndex]?.pause();
      }
      audioRefs.current[index]?.play();
      setPlayingIndex(index);
    }
  };

  if (!urls || urls.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-3 justify-center">
      {urls.map((url, index) => (
        <div key={index}>
          <audio
            ref={(el) => { audioRefs.current[index] = el; }}
            src={url}
            onEnded={() => setPlayingIndex(null)}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
                e.stopPropagation();
                togglePlay(index);
            }}
            className="gap-1"
          >
            {playingIndex === index ? (
              <Pause className="w-3 h-3" />
            ) : (
              <Play className="w-3 h-3" />
            )}
            <Volume2 className="w-3 h-3" />
          </Button>
        </div>
      ))}
    </div>
  );
}

interface ImageGalleryProps {
  urls: string[];
  onFullscreenChange?: (isFullscreen: boolean) => void;
}

export function ImageGallery({ urls, onFullscreenChange }: ImageGalleryProps) {
  const [fullscreenIndex, setFullscreenIndex] = useState<number | null>(null);
  const [failedImages, setFailedImages] = useState(new Set());

  const handleImageError = (index: number) => {
    setFailedImages(prev => new Set(prev).add(index));
    console.error(`Image load failed at index ${index}:`, urls[index]);
  };

  if (!urls || urls.length === 0) return null;

  return (
    <>
      <div className="grid gap-2 mt-3 w-full">
        {urls.map((url, index) => (
           !failedImages.has(index) ? (
            <img
                key={index}
                src={url}
                alt={`Image ${index + 1}`}
                className="w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity object-contain bg-slate-50 min-h-[200px] max-h-[500px]"
                onClick={(e) => {
                e.stopPropagation();
                setFullscreenIndex(index);
                onFullscreenChange?.(true);
                }}
                onError={() => handleImageError(index)}
            />
           ) : (
             <div key={index} className="w-full h-48 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 flex-col gap-2">
               <ImageIcon className="w-8 h-8 text-slate-300" />
               <span className="text-xs">画像の読み込みに失敗しました</span>
             </div>
           )
        ))}
      </div>

      {fullscreenIndex !== null && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
          onClick={(e) => {
            e.stopPropagation(); 
            setFullscreenIndex(null);
            onFullscreenChange?.(false);
          }}
        >
           <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 left-4 text-white hover:bg-white/20"
            onClick={(e) => {
              e.stopPropagation();
              setFullscreenIndex(Math.max(0, fullscreenIndex - 1));
            }}
            disabled={fullscreenIndex === 0}
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>

          <img
            src={urls[fullscreenIndex]}
            alt="Fullscreen"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />

           <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 text-white hover:bg-white/20"
            onClick={(e) => {
              e.stopPropagation();
              setFullscreenIndex(Math.min(urls.length - 1, fullscreenIndex + 1));
            }}
            disabled={fullscreenIndex === urls.length - 1}
          >
            <ChevronRight className="w-6 h-6" />
          </Button>
        </div>
      )}
    </>
  );
}
