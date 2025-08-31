
import React from 'react';
import { Score } from '../types';

interface ScoreboardProps {
  score: Score;
}

const Scoreboard: React.FC<ScoreboardProps> = ({ score }) => {
  return (
    <div className="bg-gray-800 p-4 rounded-lg shadow-lg w-full">
      <h2 className="text-xl font-bold text-center mb-4 text-cyan-400">Punktestand</h2>
      <div className="flex justify-around text-lg">
        <div className="text-center">
          <p className="font-semibold">Du</p>
          <p className="text-4xl font-mono text-green-400">{score.user}</p>
        </div>
        <div className="text-center">
          <p className="font-semibold">KI</p>
          <p className="text-4xl font-mono text-red-400">{score.ai}</p>
        </div>
      </div>
    </div>
  );
};

export default Scoreboard;
