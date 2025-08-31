import { useState, useRef, useCallback } from 'react';

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

export const useSpeech = (onResult: (transcript: string) => void) => {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const startListening = useCallback(() => {
    if (!SpeechRecognitionAPI) {
      console.error("Speech Recognition not supported in this browser.");
      alert("Spracherkennung wird von diesem Browser nicht unterstützt.");
      return;
    }

    if (isListening || recognitionRef.current) {
        return;
    }
    
    setError(null);

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = 'de-DE';
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error', event.error);
      setError(event.error);
      setIsListening(false);
       recognitionRef.current = null;
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      onResult(transcript);
    };
    
    recognition.start();
    recognitionRef.current = recognition;

  }, [isListening, onResult]);

  const speak = useCallback((text: string) => {
    if (!window.speechSynthesis) {
        console.error("Speech Synthesis not supported in this browser.");
        alert("Text-to-Speech wird von diesem Browser nicht unterstützt.");
        return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'de-DE';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  }, []);

  return {
    isListening,
    startListening,
    speak,
    error,
  };
};