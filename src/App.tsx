
import React, { useState, useCallback, useEffect } from 'react';
import { GameState, GameObject, Score } from './types';
import { useSpeech } from './hooks/useSpeech';
import { useCamera } from './hooks/useCamera';
import * as geminiService from './services/geminiService';
import { generateMaskColors } from './utils/colors';
import InteractiveImageViewer from './components/InteractiveImageViewer';
import ControlsPanel from './components/ControlsPanel';
import FrameSelector from './components/FrameSelector';

const INITIAL_SCORE: Score = { user: 0, ai: 0 };
const I_SPY_PREFIX = "ich sehe was was du nicht siehst und das ist";

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.START);
  const [score, setScore] = useState<Score>(INITIAL_SCORE);
  const [image, setImage] = useState<string | null>(null);
  const [objects, setObjects] = useState<GameObject[]>([]);
  const [message, setMessage] = useState<string>('');
  const [userSelection, setUserSelection] = useState<GameObject | null>(null);
  const [aiSelection, setAiSelection] = useState<GameObject | null>(null);
  const [aiGuesses, setAiGuesses] = useState<GameObject[]>([]);
  const [attemptCount, setAttemptCount] = useState<number>(0);
  const [isPlayerTurnToPick, setIsPlayerTurnToPick] = useState(true);
  const [showFrameSelector, setShowFrameSelector] = useState(false);
  const [pendingImageData, setPendingImageData] = useState<string | null>(null);
  const [displayMode, setDisplayMode] = useState<'polygon' | 'segmentation'>('polygon');

  const handleSpeechResult = useCallback((transcript: string) => {
    let cleanedTranscript = transcript.toLowerCase().trim();
    if (cleanedTranscript.startsWith(I_SPY_PREFIX)) {
      cleanedTranscript = cleanedTranscript.substring(I_SPY_PREFIX.length).trim();
    }
    setMessage(`Dein Hinweis: "${cleanedTranscript}". KI überlegt...`);
    setGameState(GameState.AI_GUESSING);
    
    if (image && userSelection) {
      geminiService.guessObjectsFromDescription(image, cleanedTranscript)
        .then(guessedObjects => {
            if (guessedObjects.length === 0) {
              setGameState(GameState.ROUND_OVER);
              setMessage(`Die KI konnte dein Objekt "${userSelection.label}" nicht erraten.`);
              speak("Schade, ich habe es nicht gefunden.");
              setScore(prev => ({...prev, user: prev.user + 10 }));
              return;
            }

            const mappedGuesses = guessedObjects.map((g, i) => ({
                ...g,
                id: `guess-${i}`,
                color: '#FFD70080' // Special color for guesses
            }));
          setAiGuesses(mappedGuesses);
          setAttemptCount(1);
        })
        .catch(err => {
            console.error(err);
            setGameState(GameState.ERROR);
            setMessage("Die KI konnte keine Objekte erraten. Versuche es erneut.");
        });
    }
  }, [image, userSelection]);

  const { isListening, startListening: startSpeechRecognition, speak, error: speechError } = useSpeech(handleSpeechResult);
  const { takePicture, selectFromGallery, requestPermissions, isLoading: cameraLoading, error: cameraError } = useCamera();
  
  const resetGame = () => {
    setGameState(GameState.START);
    setScore(INITIAL_SCORE);
    setImage(null);
    setObjects([]);
    setUserSelection(null);
    setAiSelection(null);
    setAiGuesses([]);
    setIsPlayerTurnToPick(true);
    setMessage('');
  };

  const processImage = async (imageData: string) => {
    setGameState(GameState.LOADING_OBJECTS);
    setMessage('Objekte werden erkannt...');
    setImage(imageData);
    
    try {
      const detected = await geminiService.detectObjects(imageData);
      const colors = generateMaskColors(detected.length);
      const gameObjects = detected.map((obj, index) => ({
        ...obj,
        id: `obj-${index}`,
        color: colors[index],
      }));
      
      if(gameObjects.length === 0){
          setGameState(GameState.ERROR);
          setMessage("Keine Objekte im Bild erkannt. Bitte versuche es mit einem anderen Bild.");
          setImage(null);
          return;
      }

      setObjects(gameObjects);
      startNewRound();
    } catch (error) {
      console.error("Error detecting objects:", error);
      setGameState(GameState.ERROR);
      setMessage("Objekterkennung fehlgeschlagen. Bitte versuche es erneut.");
    }
  };

  const handleFrameSelected = async (croppedImageData: string) => {
    setShowFrameSelector(false);
    setPendingImageData(null);
    await processImage(croppedImageData);
  };

  const handleFrameSelectorCancel = () => {
    setShowFrameSelector(false);
    setPendingImageData(null);
    setMessage('Bildauswahl abgebrochen. Lade ein neues Bild hoch oder nutze die Kamera.');
  };

  const handleCameraCapture = useCallback(async () => {
    try {
      setMessage('Kamera wird geöffnet...');
      
      // Request permissions first
      const hasPermissions = await requestPermissions();
      if (!hasPermissions) {
        setMessage('Kamera-Berechtigung erforderlich');
        return;
      }

      // Take picture with higher resolution for frame selection
      const imageData = await takePicture({
        quality: 90,
        width: 1920,
        height: 1440,
        allowEditing: false
      });
      
      if (imageData) {
        setPendingImageData(imageData);
        setShowFrameSelector(true);
        setMessage('Wähle den optimalen Bildausschnitt für die Objekterkennung.');
      }
    } catch (error) {
      console.error('Camera capture error:', error);
      setGameState(GameState.ERROR);
      setMessage('Fehler beim Aufnehmen des Bildes. Bitte versuche es erneut.');
    }
  }, [takePicture, requestPermissions]);

  const handleImageUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setMessage('Bild wird geladen...');
      
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageData = e.target?.result as string;
        if (imageData) {
          setPendingImageData(imageData);
          setShowFrameSelector(true);
          setMessage('Wähle den optimalen Bildausschnitt für die Objekterkennung.');
        }
      };
      reader.readAsDataURL(file);
      
    } catch (error) {
      console.error('Image upload error:', error);
      setGameState(GameState.ERROR);
      setMessage('Fehler beim Verarbeiten des Bildes. Bitte versuche es erneut.');
    }
    
    // Reset input
    event.target.value = '';
  }, []);



  const calculatePoints = (attempts: number): number => {
    if (attempts === 1) return 10;
    if (attempts === 2) return 8;
    if (attempts === 3) return 6;
    if (attempts === 4) return 4;
    if (attempts >= 5) return 2;
    return 0;
  };

  const handleMaskClick = (objectId: string) => {
    const clickedObject = objects.find(o => o.id === objectId);
    if (!clickedObject) return;
    
    if (gameState === GameState.USER_PICKING) {
      setUserSelection(clickedObject);
      setGameState(GameState.USER_CONFIRMING);
      setMessage(`Du hast "${clickedObject.label}" ausgewählt. Bestätigen?`);
    } else if (gameState === GameState.USER_CONFIRMING) {
      // Allow changing selection while confirming
      setUserSelection(clickedObject);
      setMessage(`Du hast "${clickedObject.label}" ausgewählt. Bestätigen?`);
    } else if (gameState === GameState.USER_GUESSING && aiSelection) {
      setAttemptCount(prev => prev + 1);
      if (clickedObject.id === aiSelection.id) {
        // User guessed correctly
        const points = calculatePoints(attemptCount + 1);
        setScore(prev => ({ ...prev, user: prev.user + points }));
        setGameState(GameState.ROUND_OVER);
        setMessage(`Richtig! Das war "${aiSelection.label}". Du erhältst ${points} Punkte.`);
        speak(`Richtig! Das war es. Du bekommst ${points} Punkte.`);
      } else {
        // User guessed incorrectly
        setMessage(`Das ist "${clickedObject.label}". Leider falsch. Versuch es nochmal!`);
        speak("Leider falsch.");
      }
    }
  };
  
  const handleConfirmSelection = () => {
    if(userSelection) {
        setGameState(GameState.USER_DESCRIBING);
        setMessage('Nimm deinen Hinweis auf: "Ich sehe was, was du nicht siehst und das ist..."');
    }
  };
  
  const handleReviseSelection = () => {
    setUserSelection(null);
    setGameState(GameState.USER_PICKING);
    setMessage('Du bist dran! Wähle ein Objekt aus dem Bild aus.');
  };
  
  const handleStartRecording = () => {
    // When the user retries recording, reset the message to the original prompt.
    // This clears any previous error messages like "no-speech".
    setMessage('Nimm deinen Hinweis auf: "Ich sehe was, was du nicht siehst und das ist..."');
    startSpeechRecognition();
  };

  const startNewRound = useCallback(() => {
    setUserSelection(null);
    setAiSelection(null);
    setAiGuesses([]);
    setAttemptCount(0);
    
    if (isPlayerTurnToPick) {
      setGameState(GameState.USER_PICKING);
      setMessage("Du bist dran! Wähle ein Objekt aus dem Bild aus.");
    } else {
      setGameState(GameState.AI_PICKING);
      setMessage("Die KI wählt ein Objekt aus...");
    }
  }, [isPlayerTurnToPick]);
  
  const handleNextRound = () => {
      setIsPlayerTurnToPick(prev => !prev);
  }

  useEffect(() => {
      if(image) {
          startNewRound();
      }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlayerTurnToPick, image]);

  useEffect(() => {
    if (speechError) {
      // The useSpeech hook now provides user-friendly German error messages
      setMessage(speechError);
      
      // Only set error state for critical errors that prevent the game from continuing
      if (speechError.includes('Mikrofon-Zugriff verweigert') || 
          speechError.includes('nicht unterstützt') ||
          speechError.includes('nicht verfügbar')) {
        setGameState(GameState.ERROR);
      }
    }
  }, [speechError]);


  const handleAiGuess = useCallback(() => {
    if (aiGuesses.length > 0 && userSelection) {
      const currentGuess = aiGuesses[0];
      const originalObject = objects.find(o => o.label.toLowerCase() === currentGuess.label.toLowerCase());

      if (originalObject) {
          setAiGuesses(prev => [{...originalObject, id: prev[0].id, color: prev[0].color}, ...prev.slice(1)]);
          setMessage(`Ist es "${originalObject.label}"?`);
          speak(`Ich rate mal. Ist es: ${originalObject.label}?`);
      } else {
           // AI guessed an object not in the original list, or label mismatch. Skip it.
           setAiGuesses(prev => prev.slice(1));
      }
    } else if (userSelection) {
      // AI ran out of guesses
      setGameState(GameState.ROUND_OVER);
      setMessage(`Die KI konnte dein Objekt "${userSelection.label}" nicht erraten.`);
      speak("Schade, ich habe es nicht gefunden.");
      setScore(prev => ({...prev, user: prev.user + 10 })); // User gets points if AI fails
    }
  }, [aiGuesses, speak, userSelection, objects]);
  
  // AI Guessing Logic
  useEffect(() => {
    if (gameState === GameState.AI_GUESSING && aiGuesses.length > 0) {
        handleAiGuess();
    }
  }, [gameState, aiGuesses, handleAiGuess]);
  
  // AI Picking Logic
  useEffect(() => {
      if (gameState === GameState.AI_PICKING && objects.length > 0 && image) {
          const randomIndex = Math.floor(Math.random() * objects.length);
          const selection = objects[randomIndex];
          setAiSelection(selection);

          geminiService.generateDescriptionForObject(image, selection)
            .then(description => {
                const fullClue = `Ich sehe was, was du nicht siehst, und das ist ${description}`;
                setMessage(fullClue);
                speak(fullClue);
                setGameState(GameState.USER_GUESSING);
                setAttemptCount(0);
            })
            .catch(err => {
                console.error(err);
                setGameState(GameState.ERROR);
                setMessage("Die KI konnte keine Beschreibung erstellen. Versuche es erneut.");
            });
      }
  }, [gameState, objects, image, speak]);

  const handleYes = () => {
    const points = calculatePoints(attemptCount);
    setScore(prev => ({ ...prev, ai: prev.ai + points }));
    setGameState(GameState.ROUND_OVER);
    const successMessage = `Die KI hat es im ${attemptCount}. Versuch erraten und ${points} Punkte bekommen!`;
    setMessage(successMessage);
    speak("Juhu! Ich hab's erraten.");
  };

  const handleNo = () => {
    setAttemptCount(prev => prev + 1);
    setAiGuesses(prev => prev.slice(1)); // Remove the wrong guess and trigger the next one
  };
  
  const getHighlightedIds = () => {
      if(gameState === GameState.AI_GUESSING && aiGuesses.length > 0) {
        const guess = aiGuesses[0];
        // Find original object by label to highlight the correct mask
        const originalObject = objects.find(o => o.label.toLowerCase() === guess.label.toLowerCase());
        return originalObject ? [originalObject.id] : [];
      }
      return [];
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col p-4 font-sans">
        <header className="w-full text-center mb-4 pt-safe">
            <h1 className="text-4xl font-bold text-cyan-400 tracking-wider">I Spy AI</h1>
            <p className="text-gray-400">Das klassische Spiel, neu erfunden mit Gemini</p>
        </header>
        <main className="flex-grow grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-120px-env(safe-area-inset-top))]">
            <div className="lg:col-span-2 bg-gray-900/50 rounded-lg flex items-center justify-center p-2">
                {image ? (
                    <InteractiveImageViewer
                        imageUrl={image}
                        objects={objects}
                        onMaskClick={handleMaskClick}
                        disabled={![GameState.USER_PICKING, GameState.USER_GUESSING, GameState.USER_CONFIRMING].includes(gameState)}
                        selectedObjectId={userSelection?.id || aiSelection?.id}
                        highlightedObjectIds={getHighlightedIds()}
                        displayMode={displayMode}
                        revealOnHover={true}
                        onReviseSelection={gameState === GameState.USER_CONFIRMING ? handleReviseSelection : undefined}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-800 rounded-lg">
                        <p className="text-gray-500">Bitte lade ein Bild hoch, um zu beginnen.</p>
                    </div>
                )}
            </div>
            <div className="lg:col-span-1 h-full">
                <ControlsPanel
                    gameState={gameState}
                    onImageUpload={handleImageUpload}
                    onCameraCapture={handleCameraCapture}
                    onConfirmSelection={handleConfirmSelection}
                    onStartRecording={handleStartRecording}
                    onYes={handleYes}
                    onNo={handleNo}
                    onNextRound={handleNextRound}
                    onReset={resetGame}
                    isListening={isListening}
                    message={message}
                    score={score}
                    displayMode={displayMode}
                    onDisplayModeChange={setDisplayMode}
                />
            </div>
        </main>
        
        {showFrameSelector && pendingImageData && (
           <FrameSelector
             imageData={pendingImageData}
             onFrameSelected={handleFrameSelected}
             onCancel={handleFrameSelectorCancel}
             isVisible={showFrameSelector}
           />
         )}
    </div>
  );
};

export default App;
