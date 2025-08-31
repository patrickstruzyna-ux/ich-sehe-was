
import React from 'react';
import { GameState, Score } from '../types';
import Scoreboard from './Scoreboard';

interface ControlsPanelProps {
  gameState: GameState;
  onImageUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onConfirmSelection: () => void;
  onStartRecording: () => void;
  onYes: () => void;
  onNo: () => void;
  onNextRound: () => void;
  onReset: () => void;
  isListening: boolean;
  message: string;
  score: Score;
}

const Spinner: React.FC = () => (
  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
);

const ControlsPanel: React.FC<ControlsPanelProps> = ({
  gameState,
  onImageUpload,
  onConfirmSelection,
  onStartRecording,
  onYes,
  onNo,
  onNextRound,
  onReset,
  isListening,
  message,
  score,
}) => {
  const renderContent = () => {
    switch (gameState) {
      case GameState.START:
        return (
          <>
            <h2 className="text-2xl font-bold mb-4">Willkommen!</h2>
            <p className="mb-6 text-center">Lade ein Bild hoch, um eine Runde "Ich sehe was, was du nicht siehst" gegen die KI zu spielen.</p>
            <label htmlFor="image-upload" className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 px-4 rounded-lg cursor-pointer transition duration-300 text-center">
              Bild hochladen
            </label>
            <input id="image-upload" type="file" accept="image/*" className="hidden" onChange={onImageUpload} />
          </>
        );
      case GameState.LOADING_OBJECTS:
      case GameState.AI_PICKING:
      case GameState.AI_GUESSING:
        return (
          <div className="text-center">
             <Spinner />
             <p className="mt-4 text-lg">{message}</p>
          </div>
        );
      case GameState.USER_PICKING:
      case GameState.USER_GUESSING:
      case GameState.USER_CONFIRMING:
        return (
          <>
            <p className="text-lg font-semibold text-center mb-4">{message}</p>
            {gameState === GameState.USER_CONFIRMING && (
               <button onClick={onConfirmSelection} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg transition duration-300">
                 Auswahl bestätigen
               </button>
            )}
          </>
        );
      case GameState.USER_DESCRIBING:
        return (
          <>
             <p className="text-lg font-semibold text-center mb-4">{message}</p>
             <button onClick={onStartRecording} disabled={isListening} className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-500 text-white font-bold py-3 px-4 rounded-lg transition duration-300 flex items-center justify-center gap-2">
                {isListening ? (
                    <>
                        <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                        </span>
                        Höre zu...
                    </>
                ) : 'Hinweis aufnehmen'}
             </button>
          </>
        );
      case GameState.ROUND_OVER:
        return (
            <>
                <p className="text-xl font-bold text-center mb-4 text-cyan-400">{message}</p>
                <button onClick={onNextRound} className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 px-4 rounded-lg transition duration-300 mb-2">
                    Nächste Runde
                </button>
                 <button onClick={onReset} className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg transition duration-300">
                    Neues Spiel
                </button>
            </>
        );
      case GameState.ERROR:
           return (
            <>
                <p className="text-xl font-bold text-center mb-4 text-red-500">Fehler</p>
                <p className="text-center mb-4">{message}</p>
                 <button onClick={onReset} className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 px-4 rounded-lg transition duration-300">
                    Neu starten
                </button>
            </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg flex flex-col justify-between h-full">
      <div>
        <h1 className="text-3xl font-bold text-center mb-6">Ich sehe was...</h1>
        <div className="flex flex-col items-center justify-center bg-gray-700/50 p-6 rounded-lg min-h-[150px]">
          {renderContent()}
        </div>
      </div>
       {(gameState !== GameState.START) && <Scoreboard score={score} />}
       {gameState === GameState.AI_GUESSING && message.startsWith("Ist es") && (
         <div className="flex gap-4 mt-4">
           <button onClick={onYes} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg transition duration-300">Ja</button>
           <button onClick={onNo} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg transition duration-300">Nein</button>
         </div>
       )}
    </div>
  );
};


export default ControlsPanel;
