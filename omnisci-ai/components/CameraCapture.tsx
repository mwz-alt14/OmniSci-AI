import React, { useRef, useState, useEffect } from 'react';

interface CameraCaptureProps {
  onCapture: (imageData: string) => void;
  onClose: () => void;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string>('');
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    const startCamera = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' } // Prefer back camera
        });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        console.error("Camera access denied:", err);
        setError("Unable to access camera. Please check permissions.");
      }
    };

    startCamera();

    return () => {
      // Cleanup stream on unmount
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []); // Run once on mount

  const handleCapture = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        
        // Convert to base64
        // We reduce quality slightly to 0.8 to ensure payloads aren't massive
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8); 
        onCapture(dataUrl);
        onClose();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center animate-fade-in">
      <div className="absolute top-4 right-4 z-10 pt-safe pr-4">
        <button onClick={onClose} className="w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center backdrop-blur-md active:scale-90 transition-transform">
          <i className="fa-solid fa-xmark"></i>
        </button>
      </div>
      
      {error ? (
        <div className="text-white text-center p-6">
          <div className="text-4xl mb-4 text-red-500"><i className="fa-solid fa-video-slash"></i></div>
          <p>{error}</p>
          <button onClick={onClose} className="mt-6 px-6 py-2 bg-slate-800 rounded-lg text-sm">Close</button>
        </div>
      ) : (
        <>
          <div className="relative w-full h-full max-w-lg flex items-center bg-black">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              className="w-full h-full object-cover md:object-contain"
            />
          </div>
          
          <div className="absolute bottom-8 left-0 right-0 flex justify-center pb-safe mb-4">
            <button 
              onClick={handleCapture}
              className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center bg-transparent active:bg-white/20 transition-all hover:scale-105 active:scale-95"
            >
              <div className="w-16 h-16 rounded-full bg-white"></div>
            </button>
          </div>
        </>
      )}
    </div>
  );
};