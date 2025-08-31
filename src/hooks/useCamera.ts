import { useState, useCallback } from 'react';
import { Camera, CameraResultType, CameraSource, Photo } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';

export interface CameraOptions {
  quality?: number;
  allowEditing?: boolean;
  resultType?: CameraResultType;
  source?: CameraSource;
  width?: number;
  height?: number;
}

export const useCamera = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const takePicture = useCallback(async (options: CameraOptions = {}) => {
    setIsLoading(true);
    setError(null);

    try {
      // Check if running on native platform
      if (!Capacitor.isNativePlatform()) {
        // Fallback to web file input for web/PWA
        return new Promise<string>((resolve, reject) => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'image/*';
          input.capture = 'environment'; // Use rear camera on mobile browsers
          
          input.onchange = (event) => {
            const file = (event.target as HTMLInputElement).files?.[0];
            if (file) {
              const reader = new FileReader();
              reader.onload = () => {
                resolve(reader.result as string);
              };
              reader.onerror = () => {
                reject(new Error('Fehler beim Lesen der Datei'));
              };
              reader.readAsDataURL(file);
            } else {
              reject(new Error('Keine Datei ausgewählt'));
            }
          };
          
          input.click();
        });
      }

      // Native camera functionality
      const defaultOptions: CameraOptions = {
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
        width: 1920,
        height: 1080,
        ...options
      };

      const image: Photo = await Camera.getPhoto(defaultOptions);
      
      if (!image.dataUrl) {
        throw new Error('Kein Bild erhalten');
      }

      return image.dataUrl;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unbekannter Fehler beim Aufnehmen des Bildes';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const selectFromGallery = useCallback(async (options: CameraOptions = {}) => {
    setIsLoading(true);
    setError(null);

    try {
      // Check if running on native platform
      if (!Capacitor.isNativePlatform()) {
        // Fallback to web file input
        return new Promise<string>((resolve, reject) => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'image/*';
          
          input.onchange = (event) => {
            const file = (event.target as HTMLInputElement).files?.[0];
            if (file) {
              const reader = new FileReader();
              reader.onload = () => {
                resolve(reader.result as string);
              };
              reader.onerror = () => {
                reject(new Error('Fehler beim Lesen der Datei'));
              };
              reader.readAsDataURL(file);
            } else {
              reject(new Error('Keine Datei ausgewählt'));
            }
          };
          
          input.click();
        });
      }

      const defaultOptions: CameraOptions = {
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Photos,
        ...options
      };

      const image: Photo = await Camera.getPhoto(defaultOptions);
      
      if (!image.dataUrl) {
        throw new Error('Kein Bild erhalten');
      }

      return image.dataUrl;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unbekannter Fehler beim Auswählen des Bildes';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const requestPermissions = useCallback(async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        const permissions = await Camera.requestPermissions();
        return permissions.camera === 'granted' && permissions.photos === 'granted';
      }
      return true; // Web doesn't need explicit permissions
    } catch (err) {
      setError('Fehler beim Anfordern der Kamera-Berechtigungen');
      return false;
    }
  }, []);

  return {
    takePicture,
    selectFromGallery,
    requestPermissions,
    isLoading,
    error
  };
};