"use client";
import React, { useState, useEffect, useRef } from 'react';

interface VoiceSearchProps {
  onSearch: (query: string) => void;
  className?: string;
}

const VoiceSearch: React.FC<VoiceSearchProps> = ({ 
  onSearch, 
  className = "" 
}) => {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Check if speech recognition is supported
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setIsSupported(true);
      recognitionRef.current = new SpeechRecognition();
      
      // Configure recognition settings
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';
      recognitionRef.current.maxAlternatives = 1;

      // Event handlers
      recognitionRef.current.onstart = () => {
        console.log('Voice recognition started');
        setIsListening(true);
        setError(null);
        
        // Set a timeout to automatically stop listening after 10 seconds
        timeoutRef.current = setTimeout(() => {
          if (recognitionRef.current) {
            recognitionRef.current.stop();
          }
        }, 10000);
      };

      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        // If we have a final transcript, process it
        if (finalTranscript) {
          console.log('Voice search query:', finalTranscript);
          onSearch(finalTranscript.trim());
          stopListening();
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Voice recognition error:', event.error);
        setIsListening(false);
        
        if (event.error === 'no-speech') {
          setError('No speech detected. Please try again.');
        } else if (event.error === 'audio-capture') {
          setError('Microphone access denied. Please allow microphone access.');
        } else if (event.error === 'not-allowed') {
          setError('Microphone access denied. Please allow microphone access.');
        } else {
          setError('Voice recognition error. Please try again.');
        }
        
        // Clear timeout
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      };

      recognitionRef.current.onend = () => {
        console.log('Voice recognition ended');
        setIsListening(false);
        
        // Clear the timeout
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      };
    } else {
      setIsSupported(false);
      setError('Voice search is not supported in this browser');
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [onSearch]);

  const startListening = () => {
    if (!isSupported) {
      setError('Voice search is not supported in this browser');
      return;
    }

    try {
      setError(null);
      
      // Stop any existing recognition session
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      
      // Start new recognition session
      recognitionRef.current?.start();
    } catch (err) {
      console.error('Error starting voice recognition:', err);
      setError('Failed to start voice recognition');
    }
  };

  const stopListening = () => {
    try {
      // Clear the timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      // Stop recognition
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    } catch (err) {
      console.error('Error stopping voice recognition:', err);
    }
  };

  const handleMicClick = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleMicClick();
    }
  };

  if (!isSupported) {
    return null; // Don't render anything if not supported
  }

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={handleMicClick}
         onKeyPress={handleKeyPress}
         className={`
           flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200
           ${isListening 
             ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' 
             : 'bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-800'
           }
           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
         `}
        title={isListening ? 'Stop listening' : 'Start voice search'}
         disabled={!isSupported}
      >
        {isListening ? (
           // Animated microphone icon when listening
          <div className="relative">
             <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
               <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
               <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
            </svg>
             {/* Pulsing animation */}
             <div className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-75"></div>
          </div>
        ) : (
           // Static microphone icon when not listening
           <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
             <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
             <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
          </svg>
        )}
      </button>

      {/* Error tooltip */}
      {error && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-red-500 text-white text-sm rounded-lg shadow-lg z-50 whitespace-nowrap">
          {error}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-red-500"></div>
        </div>
      )}

      {/* Listening indicator */}
      {isListening && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-blue-500 text-white text-sm rounded-lg shadow-lg z-50 whitespace-nowrap">
          Listening... Speak now
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-blue-500"></div>
        </div>
      )}
    </div>
  );
};

export default VoiceSearch;
