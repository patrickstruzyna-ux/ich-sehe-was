
import { useState, useCallback, useRef } from 'react';

// Minimal type definitions for the Web Speech API to satisfy TypeScript
interface SpeechRecognitionAlternative {
  readonly transcript: string;
}

interface SpeechRecognitionResult {
  readonly [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionResultList {
  readonly [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent extends Event {
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
}

interface SpeechRecognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  start(): void;
  stop(): void;
}

interface SpeechRecognitionStatic {
  new (): SpeechRecognition;
}

// Add SpeechRecognition to the window object to fix TS errors
declare global {
  interface Window {
    SpeechRecognition: SpeechRecognitionStatic;
    webkitSpeechRecognition: SpeechRecognitionStatic;
  }
}


// Polyfill for browser compatibility, aliased to avoid shadowing the type
const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;

export const useSpeech = () => {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string>('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const startListening = useCallback(() => {
    if (isListening) return;

    try {
      setError(null);
      setIsListening(true);
      setTranscript('');

      // Use Web Speech API
      if (!SpeechRecognitionAPI) {
        throw new Error('Speech recognition not supported in this browser');
      }

      const recognition = new SpeechRecognitionAPI();
      recognitionRef.current = recognition;

      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'de-DE';

      recognition.onstart = () => {
        console.log('Web speech recognition started');
      };

      recognition.onend = () => {
        console.log('Web speech recognition ended');
        setIsListening(false);
      };

      recognition.onerror = (event) => {
        console.error('Web speech recognition error:', event.error);
        let errorMessage = 'Spracherkennungsfehler';
        
        switch (event.error) {
          case 'network':
            errorMessage = 'Netzwerkfehler bei der Spracherkennung. Bitte überprüfen Sie Ihre Internetverbindung.';
            break;
          case 'not-allowed':
            errorMessage = 'Mikrofon-Zugriff verweigert. Bitte erlauben Sie den Mikrofon-Zugriff.';
            break;
          case 'no-speech':
            errorMessage = 'Keine Sprache erkannt. Bitte sprechen Sie deutlicher.';
            break;
          case 'audio-capture':
            errorMessage = 'Mikrofon nicht verfügbar oder defekt.';
            break;
          case 'service-not-allowed':
            errorMessage = 'Spracherkennungsdienst nicht verfügbar.';
            break;
          default:
            errorMessage = `Spracherkennungsfehler: ${event.error}`;
        }
        
        setError(errorMessage);
        setIsListening(false);
      };

      recognition.onresult = (event) => {
        const results = Array.from(event.results);
        const transcript = results
          .map((result) => result[0]?.transcript || '')
          .join('');
        setTranscript(transcript);
      };

      recognition.start();
    } catch (err) {
      console.error('Error starting speech recognition:', err);
      setError(err instanceof Error ? err.message : 'Fehler beim Starten der Spracherkennung.');
      setIsListening(false);
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  }, []);

  const speak = useCallback((text: string) => {
    // Text-to-Speech works the same on both platforms using Web Speech API
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'de-DE';
      utterance.rate = 0.9;
      utterance.pitch = 1;
      window.speechSynthesis.speak(utterance);
    } else {
      console.warn('Speech synthesis not supported');
    }
  }, []);

  return {
    isListening,
    startListening,
    stopListening,
    speak,
    error,
    transcript
  };
};
