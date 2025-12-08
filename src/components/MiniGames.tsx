// Mini Games Component - Interactive challenges (riddles, math, memory games)

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  X,
  Brain,
  Sparkles,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Trophy,
  Zap,
  Play,
  Eye,
  EyeOff,
} from 'lucide-react';
import type { MiniGameData, ActiveChallenge } from '../lib/unifiedChallengeSystem';

interface MiniGamesProps {
  challenge: ActiveChallenge;
  onComplete: (score: number) => void;
  onClose: () => void;
}

export const MiniGames: React.FC<MiniGamesProps> = ({ challenge, onComplete, onClose }) => {
  const gameType = challenge.miniGameType;
  const gameData = challenge.miniGameData;

  if (!gameType || !gameData) {
    return (
      <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-gray-950 border border-gray-800 rounded-2xl p-6 text-center">
          <p className="text-gray-400">Game data not available</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 bg-gray-800 rounded-lg">Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-gray-950 border border-gray-800 rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-gradient-to-r from-purple-900/30 to-cyan-900/30">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{challenge.icon}</span>
            <div>
              <h3 className="text-lg font-medium text-white">{challenge.title}</h3>
              <p className="text-sm text-gray-400">{challenge.description}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg bg-gray-900/70 border border-gray-700 hover:bg-gray-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Game Content */}
        <div className="p-6">
          {gameType === 'riddle' && <RiddleGame data={gameData} onComplete={onComplete} />}
          {gameType === 'math_series' && <MathSeriesGame data={gameData} onComplete={onComplete} />}
          {gameType === 'color_sequence' && <ColorSequenceGame data={gameData} onComplete={onComplete} />}
          {gameType === 'card_memory' && <CardMemoryGame data={gameData} onComplete={onComplete} />}
        </div>

        {/* XP Reward */}
        <div className="px-6 pb-4">
          <div className="flex items-center justify-center gap-2 text-sm text-purple-300">
            <Sparkles className="w-4 h-4" />
            <span>+{challenge.xpReward} XP on completion</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// RIDDLE GAME
// ============================================================================

interface RiddleGameProps {
  data: MiniGameData;
  onComplete: (score: number) => void;
}

const RiddleGame: React.FC<RiddleGameProps> = ({ data, onComplete }) => {
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [attempts, setAttempts] = useState(0);

  const handleSelect = (index: number) => {
    if (revealed) return;
    setSelected(index);
    setAttempts(prev => prev + 1);
    setRevealed(true);

    const isCorrect = index === data.correctAnswer;
    setTimeout(() => {
      if (isCorrect) {
        const score = Math.max(100 - (attempts * 20), 40); // Score decreases with attempts
        onComplete(score);
      }
    }, 1500);
  };

  const handleRetry = () => {
    setSelected(null);
    setRevealed(false);
  };

  const isCorrect = selected === data.correctAnswer;

  return (
    <div className="space-y-6">
      <div className="p-4 bg-gray-900/50 rounded-xl border border-gray-800">
        <div className="flex items-start gap-3">
          <Brain className="w-6 h-6 text-purple-400 mt-1 flex-shrink-0" />
          <p className="text-lg text-gray-200 leading-relaxed">{data.question}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {data.options?.map((option, index) => (
          <button
            key={index}
            onClick={() => handleSelect(index)}
            disabled={revealed}
            className={`p-4 rounded-xl border text-left transition-all ${
              revealed && index === data.correctAnswer
                ? 'bg-emerald-900/30 border-emerald-500/50 text-emerald-300'
                : revealed && index === selected && !isCorrect
                ? 'bg-red-900/30 border-red-500/50 text-red-300'
                : selected === index
                ? 'bg-purple-900/30 border-purple-500/50 text-purple-300'
                : 'bg-gray-900/50 border-gray-700 hover:border-gray-600 text-gray-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-sm font-medium">
                {String.fromCharCode(65 + index)}
              </span>
              <span>{option}</span>
              {revealed && index === data.correctAnswer && <CheckCircle2 className="w-5 h-5 text-emerald-400 ml-auto" />}
              {revealed && index === selected && !isCorrect && <XCircle className="w-5 h-5 text-red-400 ml-auto" />}
            </div>
          </button>
        ))}
      </div>

      {revealed && !isCorrect && (
        <button
          onClick={handleRetry}
          className="w-full py-3 rounded-xl bg-purple-600/20 border border-purple-500/50 text-purple-300 flex items-center justify-center gap-2 hover:bg-purple-600/30 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          Try Again
        </button>
      )}

      {revealed && isCorrect && (
        <div className="text-center p-4 bg-emerald-900/20 rounded-xl border border-emerald-500/30">
          <Trophy className="w-8 h-8 text-amber-400 mx-auto mb-2" />
          <p className="text-emerald-300 font-medium">Correct!</p>
          <p className="text-sm text-gray-400 mt-1">Challenge completed</p>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// MATH SERIES GAME
// ============================================================================

interface MathSeriesGameProps {
  data: MiniGameData;
  onComplete: (score: number) => void;
}

const MathSeriesGame: React.FC<MathSeriesGameProps> = ({ data, onComplete }) => {
  const [answer, setAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [attempts, setAttempts] = useState(0);

  const handleSubmit = () => {
    const userAnswer = parseFloat(answer);
    setAttempts(prev => prev + 1);
    setSubmitted(true);

    if (userAnswer === data.answer) {
      const score = Math.max(100 - (attempts * 15), 50);
      setTimeout(() => onComplete(score), 1500);
    }
  };

  const handleRetry = () => {
    setAnswer('');
    setSubmitted(false);
  };

  const isCorrect = parseFloat(answer) === data.answer;

  return (
    <div className="space-y-6">
      <div className="p-4 bg-gray-900/50 rounded-xl border border-gray-800">
        <p className="text-sm text-gray-400 mb-3">Find the next number in the sequence:</p>
        <div className="flex items-center gap-3 flex-wrap">
          {data.series?.map((num, index) => (
            <div key={index} className="px-4 py-2 bg-gray-800 rounded-lg text-xl font-mono text-cyan-300">
              {num}
            </div>
          ))}
          <div className="px-4 py-2 bg-purple-900/30 border-2 border-dashed border-purple-500/50 rounded-lg text-xl font-mono text-purple-300">
            ?
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <input
          type="number"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Your answer..."
          disabled={submitted && isCorrect}
          className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white text-center text-xl font-mono focus:border-purple-500 focus:outline-none"
          onKeyDown={(e) => e.key === 'Enter' && !submitted && handleSubmit()}
        />

        {!submitted ? (
          <button
            onClick={handleSubmit}
            disabled={!answer}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-purple-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Submit Answer
          </button>
        ) : isCorrect ? (
          <div className="text-center p-4 bg-emerald-900/20 rounded-xl border border-emerald-500/30">
            <Trophy className="w-8 h-8 text-amber-400 mx-auto mb-2" />
            <p className="text-emerald-300 font-medium">Correct! The answer is {data.answer}</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-center p-3 bg-red-900/20 rounded-xl border border-red-500/30">
              <p className="text-red-300">Not quite right. Try again!</p>
            </div>
            <button
              onClick={handleRetry}
              className="w-full py-3 rounded-xl bg-purple-600/20 border border-purple-500/50 text-purple-300 flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// COLOR SEQUENCE GAME
// ============================================================================

interface ColorSequenceGameProps {
  data: MiniGameData;
  onComplete: (score: number) => void;
}

const ColorSequenceGame: React.FC<ColorSequenceGameProps> = ({ data, onComplete }) => {
  const [phase, setPhase] = useState<'watch' | 'input' | 'result'>('watch');
  const [showIndex, setShowIndex] = useState(0);
  const [userSequence, setUserSequence] = useState<string[]>([]);
  const [isCorrect, setIsCorrect] = useState(false);

  const colors = ['#EF4444', '#F59E0B', '#22C55E', '#3B82F6', '#8B5CF6', '#EC4899'];
  const sequence = data.sequence || [];

  useEffect(() => {
    if (phase === 'watch') {
      const timer = setInterval(() => {
        setShowIndex(prev => {
          if (prev >= sequence.length) {
            clearInterval(timer);
            setTimeout(() => {
              setPhase('input');
              setShowIndex(-1);
            }, 500);
            return prev;
          }
          return prev + 1;
        });
      }, 800);

      return () => clearInterval(timer);
    }
  }, [phase, sequence.length]);

  const handleColorClick = (color: string) => {
    if (phase !== 'input') return;

    const newSequence = [...userSequence, color];
    setUserSequence(newSequence);

    // Check if sequence is complete
    if (newSequence.length === sequence.length) {
      const correct = newSequence.every((c, i) => c === sequence[i]);
      setIsCorrect(correct);
      setPhase('result');

      if (correct) {
        const score = 100;
        setTimeout(() => onComplete(score), 1500);
      }
    }
  };

  const handleRestart = () => {
    setPhase('watch');
    setShowIndex(0);
    setUserSequence([]);
    setIsCorrect(false);
  };

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <div className="text-center">
        {phase === 'watch' && (
          <div className="flex items-center justify-center gap-2 text-cyan-300">
            <Eye className="w-5 h-5" />
            <span>Watch the sequence carefully...</span>
          </div>
        )}
        {phase === 'input' && (
          <div className="flex items-center justify-center gap-2 text-purple-300">
            <Zap className="w-5 h-5" />
            <span>Now repeat the sequence!</span>
          </div>
        )}
      </div>

      {/* Display Area */}
      <div className="flex justify-center">
        <div
          className={`w-32 h-32 rounded-2xl border-4 transition-all duration-300 ${
            phase === 'watch' && showIndex < sequence.length
              ? 'border-white/50'
              : 'border-gray-700'
          }`}
          style={{
            backgroundColor: phase === 'watch' && showIndex < sequence.length
              ? sequence[showIndex]
              : '#1f2937',
          }}
        />
      </div>

      {/* Progress Indicators */}
      <div className="flex justify-center gap-2">
        {sequence.map((_, index) => (
          <div
            key={index}
            className={`w-3 h-3 rounded-full transition-all ${
              phase === 'watch' && index < showIndex
                ? 'bg-cyan-500'
                : phase === 'input' && index < userSequence.length
                ? userSequence[index] === sequence[index] ? 'bg-emerald-500' : 'bg-red-500'
                : 'bg-gray-700'
            }`}
          />
        ))}
      </div>

      {/* Color Buttons */}
      {phase === 'input' && (
        <div className="grid grid-cols-3 gap-3">
          {colors.map(color => (
            <button
              key={color}
              onClick={() => handleColorClick(color)}
              className="h-16 rounded-xl border-2 border-gray-700 hover:border-white/50 transition-all active:scale-95"
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      )}

      {/* Result */}
      {phase === 'result' && (
        <div className={`text-center p-4 rounded-xl border ${
          isCorrect
            ? 'bg-emerald-900/20 border-emerald-500/30'
            : 'bg-red-900/20 border-red-500/30'
        }`}>
          {isCorrect ? (
            <>
              <Trophy className="w-8 h-8 text-amber-400 mx-auto mb-2" />
              <p className="text-emerald-300 font-medium">Perfect sequence!</p>
            </>
          ) : (
            <>
              <XCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
              <p className="text-red-300 font-medium">Wrong sequence</p>
              <button
                onClick={handleRestart}
                className="mt-3 px-4 py-2 rounded-lg bg-purple-600/20 border border-purple-500/50 text-purple-300 flex items-center gap-2 mx-auto"
              >
                <RotateCcw className="w-4 h-4" />
                Try Again
              </button>
            </>
          )}
        </div>
      )}

      {phase === 'watch' && (
        <p className="text-center text-sm text-gray-500">
          Sequence {Math.min(showIndex + 1, sequence.length)} of {sequence.length}
        </p>
      )}
    </div>
  );
};

// ============================================================================
// CARD MEMORY GAME
// ============================================================================

interface CardMemoryGameProps {
  data: MiniGameData;
  onComplete: (score: number) => void;
}

interface MemoryCard {
  id: number;
  symbol: string;
  isFlipped: boolean;
  isMatched: boolean;
}

const CardMemoryGame: React.FC<CardMemoryGameProps> = ({ data, onComplete }) => {
  const pairs = data.pairs || 6;
  const symbols = data.cardSymbols || ['🌟', '🔥', '💎', '🌙', '⚡', '🎯'];

  const [cards, setCards] = useState<MemoryCard[]>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [matches, setMatches] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const lockRef = useRef(false);

  // Initialize cards
  useEffect(() => {
    const cardSymbols = symbols.slice(0, pairs);
    const cardPairs = [...cardSymbols, ...cardSymbols]
      .sort(() => Math.random() - 0.5)
      .map((symbol, index) => ({
        id: index,
        symbol,
        isFlipped: true, // Show all cards initially
        isMatched: false,
      }));

    setCards(cardPairs);

    // Hide cards after preview
    const timer = setTimeout(() => {
      setCards(prev => prev.map(card => ({ ...card, isFlipped: false })));
      setShowPreview(false);
      setGameStarted(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, [pairs, symbols]);

  const handleCardClick = useCallback((cardId: number) => {
    if (!gameStarted || lockRef.current) return;

    const card = cards.find(c => c.id === cardId);
    if (!card || card.isFlipped || card.isMatched) return;

    const newFlipped = [...flippedCards, cardId];
    setFlippedCards(newFlipped);
    setCards(prev => prev.map(c => c.id === cardId ? { ...c, isFlipped: true } : c));

    if (newFlipped.length === 2) {
      lockRef.current = true;
      setMoves(prev => prev + 1);

      const [first, second] = newFlipped;
      const firstCard = cards.find(c => c.id === first);
      const secondCard = cards.find(c => c.id === second);

      if (firstCard?.symbol === secondCard?.symbol) {
        // Match found
        setTimeout(() => {
          setCards(prev => prev.map(c =>
            c.id === first || c.id === second ? { ...c, isMatched: true } : c
          ));
          setMatches(prev => {
            const newMatches = prev + 1;
            if (newMatches === pairs) {
              // Game complete
              const baseScore = 100;
              const movePenalty = Math.max(0, (moves - pairs) * 5);
              const score = Math.max(baseScore - movePenalty, 50);
              setTimeout(() => onComplete(score), 500);
            }
            return newMatches;
          });
          setFlippedCards([]);
          lockRef.current = false;
        }, 500);
      } else {
        // No match
        setTimeout(() => {
          setCards(prev => prev.map(c =>
            c.id === first || c.id === second ? { ...c, isFlipped: false } : c
          ));
          setFlippedCards([]);
          lockRef.current = false;
        }, 1000);
      }
    }
  }, [cards, flippedCards, gameStarted, moves, pairs, onComplete]);

  const handleRestart = () => {
    setMoves(0);
    setMatches(0);
    setFlippedCards([]);
    setShowPreview(true);
    setGameStarted(false);
    lockRef.current = false;

    const cardSymbols = symbols.slice(0, pairs);
    const cardPairs = [...cardSymbols, ...cardSymbols]
      .sort(() => Math.random() - 0.5)
      .map((symbol, index) => ({
        id: index,
        symbol,
        isFlipped: true,
        isMatched: false,
      }));

    setCards(cardPairs);

    setTimeout(() => {
      setCards(prev => prev.map(card => ({ ...card, isFlipped: false })));
      setShowPreview(false);
      setGameStarted(true);
    }, 3000);
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="flex justify-between items-center px-2">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Play className="w-4 h-4" />
            <span>Moves: {moves}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-purple-300">
            <Sparkles className="w-4 h-4" />
            <span>Matches: {matches}/{pairs}</span>
          </div>
        </div>
        <button
          onClick={handleRestart}
          className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700"
          title="Restart"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Preview Message */}
      {showPreview && (
        <div className="text-center p-3 bg-cyan-900/20 rounded-xl border border-cyan-500/30">
          <div className="flex items-center justify-center gap-2 text-cyan-300">
            <Eye className="w-5 h-5" />
            <span>Memorize the cards!</span>
          </div>
        </div>
      )}

      {/* Card Grid */}
      <div className="grid grid-cols-4 gap-2">
        {cards.map(card => (
          <button
            key={card.id}
            onClick={() => handleCardClick(card.id)}
            disabled={!gameStarted || card.isFlipped || card.isMatched}
            className={`aspect-square rounded-xl text-2xl transition-all transform ${
              card.isFlipped || card.isMatched
                ? 'bg-gradient-to-br from-purple-600/30 to-cyan-600/30 border-purple-500/50 scale-100'
                : 'bg-gray-800 border-gray-700 hover:border-gray-600 hover:scale-105'
            } border-2 ${
              card.isMatched ? 'opacity-60' : ''
            }`}
          >
            {(card.isFlipped || card.isMatched) && (
              <span className="block">{card.symbol}</span>
            )}
            {!card.isFlipped && !card.isMatched && (
              <EyeOff className="w-5 h-5 mx-auto text-gray-600" />
            )}
          </button>
        ))}
      </div>

      {/* Completion */}
      {matches === pairs && (
        <div className="text-center p-4 bg-emerald-900/20 rounded-xl border border-emerald-500/30">
          <Trophy className="w-8 h-8 text-amber-400 mx-auto mb-2" />
          <p className="text-emerald-300 font-medium">All pairs found!</p>
          <p className="text-sm text-gray-400 mt-1">Completed in {moves} moves</p>
        </div>
      )}
    </div>
  );
};

export default MiniGames;
