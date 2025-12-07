/**
 * DJ Tab Component
 *
 * A music mixing and playlist management interface that replaces the frequency modulator.
 * Integrates with the music library to provide:
 * - Quick access to playlists
 * - AI-powered mood-based recommendations
 * - Cross-fader simulation between emotional categories
 * - Real-time metric influence from music choices
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  X,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Music,
  Disc3,
  Sparkles,
  Shuffle,
  ListMusic,
  Wand2,
  TrendingUp,
  Heart,
  Zap,
  Sun,
  Moon,
  Target,
  Plus,
  Check,
  ChevronDown,
  FolderPlus,
} from 'lucide-react';
import type { DeltaHVState } from '../lib/deltaHVEngine';
import type { MusicTrack, EmotionalCategoryId } from '../lib/musicLibrary';
import { musicLibrary, EMOTIONAL_CATEGORIES } from '../lib/musicLibrary';
import { storyShuffleEngine, type Playlist } from '../lib/storyShuffleEngine';

interface DJTabProps {
  deltaHV: DeltaHVState | null;
  onClose: () => void;
}

interface MoodPreset {
  id: string;
  name: string;
  icon: React.ReactNode;
  categories: EmotionalCategoryId[];
  description: string;
}

const MOOD_PRESETS: MoodPreset[] = [
  {
    id: 'energize',
    name: 'Energize',
    icon: <Zap className="w-5 h-5" />,
    categories: ['ENERGY', 'JOY', 'COURAGE'],
    description: 'High energy, uplifting tracks'
  },
  {
    id: 'focus',
    name: 'Deep Focus',
    icon: <Target className="w-5 h-5" />,
    categories: ['FOCUS', 'CALM'],
    description: 'Concentration and flow state'
  },
  {
    id: 'chill',
    name: 'Chill',
    icon: <Moon className="w-5 h-5" />,
    categories: ['CALM', 'RELEASE', 'GRATITUDE'],
    description: 'Relaxation and unwinding'
  },
  {
    id: 'uplift',
    name: 'Uplift',
    icon: <Sun className="w-5 h-5" />,
    categories: ['JOY', 'LOVE', 'GRATITUDE', 'WONDER'],
    description: 'Positive emotions and joy'
  },
  {
    id: 'process',
    name: 'Process',
    icon: <Heart className="w-5 h-5" />,
    categories: ['MELANCHOLY', 'RELEASE'],
    description: 'Emotional processing and healing'
  },
];

export const DJTab: React.FC<DJTabProps> = ({ deltaHV, onClose }) => {
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<MusicTrack | null>(null);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [moodIntensity, setMoodIntensity] = useState(50);
  const [, setQueue] = useState<string[]>([]);

  // Playlist management state
  const [addToPlaylistTrack, setAddToPlaylistTrack] = useState<MusicTrack | null>(null);
  const [showPlaylistDropdown, setShowPlaylistDropdown] = useState(false);
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistEmoji, setNewPlaylistEmoji] = useState('🎵');
  const [selectedPlaylistForEdit, setSelectedPlaylistForEdit] = useState<Playlist | null>(null);

  // Load tracks and playlists
  useEffect(() => {
    const loadData = async () => {
      await musicLibrary.initialize();
      const allTracks = await musicLibrary.getAllTracks();
      setTracks(allTracks);
      setPlaylists(storyShuffleEngine.getPlaylists());
    };
    loadData();

    // Subscribe to updates
    const unsub1 = musicLibrary.subscribe(async () => {
      const allTracks = await musicLibrary.getAllTracks();
      setTracks(allTracks);
    });

    const unsub2 = storyShuffleEngine.subscribe(() => {
      setPlaylists(storyShuffleEngine.getPlaylists());
    });

    // Subscribe to playback state
    const unsubPlayback = musicLibrary.subscribeToPlayback((state) => {
      setIsPlaying(state.isPlaying);
      if (state.trackId) {
        musicLibrary.getTrack(state.trackId).then(track => {
          if (track) setCurrentTrack(track);
        });
      }
    });

    return () => {
      unsub1();
      unsub2();
      unsubPlayback();
    };
  }, []);

  // Filter tracks by mood
  const moodTracks = useMemo(() => {
    if (!selectedMood) return tracks;
    const preset = MOOD_PRESETS.find(p => p.id === selectedMood);
    if (!preset) return tracks;
    return tracks.filter(t => preset.categories.includes(t.categoryId));
  }, [tracks, selectedMood]);

  // Play a track
  const playTrack = useCallback(async (track: MusicTrack) => {
    await musicLibrary.playTrack(track.id, track.categoryId);
    setCurrentTrack(track);
  }, []);

  // Play/pause toggle
  const togglePlay = useCallback(async () => {
    if (musicLibrary.isCurrentlyPlaying()) {
      musicLibrary.pausePlayback();
    } else {
      await musicLibrary.resumePlayback();
    }
  }, []);

  // Generate AI playlist
  const generateAIPlaylist = useCallback(async (moodId: string) => {
    if (!deltaHV) return;
    const purposeMap: Record<string, 'balance' | 'boost' | 'calm' | 'focus' | 'heal' | 'energize'> = {
      energize: 'energize',
      focus: 'focus',
      chill: 'calm',
      uplift: 'boost',
      process: 'heal',
    };
    const purpose = purposeMap[moodId] || 'balance';
    const playlist = await storyShuffleEngine.generateCoherencePlaylist(deltaHV, purpose);
    setQueue(playlist.trackIds);
  }, [deltaHV]);

  // Shuffle mood tracks
  const shuffleMood = useCallback(async () => {
    if (!deltaHV || moodTracks.length === 0) return;
    const shuffled = await storyShuffleEngine.generateHilbertShuffle(moodTracks, deltaHV);
    setQueue(shuffled);
    if (shuffled.length > 0) {
      const firstTrack = tracks.find(t => t.id === shuffled[0]);
      if (firstTrack) await playTrack(firstTrack);
    }
  }, [deltaHV, moodTracks, tracks, playTrack]);

  // Get recommended mood based on DeltaHV
  const recommendedMood = useMemo(() => {
    if (!deltaHV) return 'focus';
    const { frictionCoefficient, harmonicStability, resonanceCoupling } = deltaHV;

    if (frictionCoefficient > 60) return 'chill';
    if (harmonicStability < 40) return 'focus';
    if (resonanceCoupling < 40) return 'uplift';
    if (deltaHV.fieldState === 'coherent') return 'energize';
    return 'focus';
  }, [deltaHV]);

  // Get metric influence
  const metricInfluence = useMemo(() => {
    return storyShuffleEngine.getMetricInfluenceFromMusic();
  }, []);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Add track to playlist
  const addTrackToPlaylist = useCallback((playlistId: string, track: MusicTrack) => {
    storyShuffleEngine.addToPlaylist(playlistId, track.id);
    setAddToPlaylistTrack(null);
    setShowPlaylistDropdown(false);
  }, []);

  // Create new playlist with optional initial track
  const createNewPlaylist = useCallback((initialTrack?: MusicTrack) => {
    if (!newPlaylistName.trim()) return;
    const playlist = storyShuffleEngine.createPlaylist(newPlaylistName.trim(), undefined, newPlaylistEmoji);
    if (initialTrack) {
      storyShuffleEngine.addToPlaylist(playlist.id, initialTrack.id);
    }
    setNewPlaylistName('');
    setNewPlaylistEmoji('🎵');
    setShowCreatePlaylist(false);
    setAddToPlaylistTrack(null);
    setShowPlaylistDropdown(false);
  }, [newPlaylistName, newPlaylistEmoji]);

  // Remove track from playlist
  const removeTrackFromPlaylist = useCallback((playlistId: string, trackId: string) => {
    storyShuffleEngine.removeFromPlaylist(playlistId, trackId);
  }, []);

  // Check if track is in playlist
  const isTrackInPlaylist = useCallback((playlistId: string, trackId: string): boolean => {
    const playlist = playlists.find(p => p.id === playlistId);
    return playlist?.trackIds.includes(trackId) || false;
  }, [playlists]);

  // Get user playlists (non-system)
  const userPlaylists = useMemo(() => {
    return playlists.filter(p => !p.isSystem);
  }, [playlists]);

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <button onClick={onClose} className="p-2 rounded-lg bg-gray-900/70 border border-gray-800 hover:bg-gray-800">
          <X className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-3">
          <Disc3 className={`w-8 h-8 text-purple-400 ${isPlaying ? 'animate-spin' : ''}`} />
          <span className="text-xl font-light text-white">DJ Mode</span>
        </div>
        <div className="w-10" />
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Current Track Display */}
        <div className="bg-gradient-to-br from-purple-900/30 to-cyan-900/30 rounded-2xl p-6 mb-6 border border-purple-500/20">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-gradient-to-br from-purple-600 to-cyan-600 rounded-xl flex items-center justify-center">
              {currentTrack ? (
                <span className="text-4xl">{EMOTIONAL_CATEGORIES[currentTrack.categoryId]?.icon}</span>
              ) : (
                <Music className="w-10 h-10 text-white/50" />
              )}
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-medium text-white">
                {currentTrack?.name || 'No track playing'}
              </h3>
              <p className="text-sm text-gray-400">
                {currentTrack ? EMOTIONAL_CATEGORIES[currentTrack.categoryId]?.name : 'Select a mood or track'}
              </p>
            </div>
          </div>

          {/* Transport Controls */}
          <div className="flex items-center justify-center gap-4 mt-6">
            <button className="p-2 rounded-full bg-gray-800 hover:bg-gray-700 transition-colors">
              <SkipBack className="w-6 h-6" />
            </button>
            <button
              onClick={togglePlay}
              className="p-4 rounded-full bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 transition-colors"
            >
              {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8" />}
            </button>
            <button className="p-2 rounded-full bg-gray-800 hover:bg-gray-700 transition-colors">
              <SkipForward className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Mood Presets */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Mood Selector</h3>
            {deltaHV && (
              <span className="text-xs text-cyan-400">Recommended: {MOOD_PRESETS.find(p => p.id === recommendedMood)?.name}</span>
            )}
          </div>
          <div className="grid grid-cols-5 gap-2">
            {MOOD_PRESETS.map(preset => (
              <button
                key={preset.id}
                onClick={() => setSelectedMood(selectedMood === preset.id ? null : preset.id)}
                className={`p-3 rounded-xl flex flex-col items-center gap-1 transition-all ${
                  selectedMood === preset.id
                    ? 'bg-purple-600/30 border-2 border-purple-400'
                    : preset.id === recommendedMood
                    ? 'bg-cyan-900/30 border border-cyan-500/30 hover:border-cyan-400/50'
                    : 'bg-gray-900/50 border border-gray-800 hover:border-gray-700'
                }`}
              >
                <span className={selectedMood === preset.id ? 'text-purple-300' : 'text-gray-400'}>
                  {preset.icon}
                </span>
                <span className={`text-xs ${selectedMood === preset.id ? 'text-purple-300' : 'text-gray-400'}`}>
                  {preset.name}
                </span>
              </button>
            ))}
          </div>
          {selectedMood && (
            <p className="text-xs text-gray-500 mt-2 text-center">
              {MOOD_PRESETS.find(p => p.id === selectedMood)?.description}
            </p>
          )}
        </div>

        {/* Mood Intensity / Action Buttons */}
        {selectedMood && (
          <div className="mb-6 p-4 bg-gray-900/50 rounded-xl border border-gray-800">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-400">Mood Intensity</span>
              <span className="text-sm text-purple-300">{moodIntensity}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={moodIntensity}
              onChange={(e) => setMoodIntensity(parseInt(e.target.value))}
              className="w-full accent-purple-500"
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={shuffleMood}
                className="flex-1 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-sm font-medium flex items-center justify-center gap-2"
              >
                <Shuffle className="w-4 h-4" />
                Shuffle {MOOD_PRESETS.find(p => p.id === selectedMood)?.name}
              </button>
              <button
                onClick={() => generateAIPlaylist(selectedMood)}
                className="flex-1 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-sm font-medium flex items-center justify-center gap-2"
              >
                <Wand2 className="w-4 h-4" />
                AI Playlist
              </button>
            </div>
          </div>
        )}

        {/* Metric Influence Display */}
        <div className="mb-6 p-4 bg-gray-900/50 rounded-xl border border-gray-800">
          <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Music Influence on Metrics
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <div className="flex-1">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-500">Symbolic</span>
                  <span className="text-purple-300">{metricInfluence.symbolic.value}%</span>
                </div>
                <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 rounded-full" style={{ width: `${metricInfluence.symbolic.value}%` }} />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-cyan-400" />
              <div className="flex-1">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-500">Resonance</span>
                  <span className="text-cyan-300">{metricInfluence.resonance.value}%</span>
                </div>
                <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${metricInfluence.resonance.value}%` }} />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <div className="flex-1">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-500">Friction</span>
                  <span className="text-amber-300">{metricInfluence.friction.value}%</span>
                </div>
                <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: `${metricInfluence.friction.value}%` }} />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4 text-pink-400" />
              <div className="flex-1">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-500">Stability</span>
                  <span className="text-pink-300">{metricInfluence.stability.value}%</span>
                </div>
                <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full bg-pink-500 rounded-full" style={{ width: `${metricInfluence.stability.value}%` }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Playlists */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <ListMusic className="w-4 h-4" />
            Quick Access Playlists
          </h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {playlists.slice(0, 6).map(playlist => (
              <button
                key={playlist.id}
                onClick={async () => {
                  if (playlist.trackIds.length > 0) {
                    const firstTrack = tracks.find(t => t.id === playlist.trackIds[0]);
                    if (firstTrack) {
                      setQueue(playlist.trackIds);
                      await playTrack(firstTrack);
                    }
                  }
                }}
                className="w-full flex items-center gap-3 p-3 rounded-lg bg-gray-900/50 hover:bg-gray-800/50 transition-colors text-left"
              >
                <span className="text-2xl">{playlist.coverEmoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white truncate">{playlist.name}</div>
                  <div className="text-xs text-gray-500">{playlist.trackIds.length} tracks</div>
                </div>
                <Play className="w-4 h-4 text-gray-500" />
              </button>
            ))}
          </div>
        </div>

        {/* Mood Tracks List with Add to Playlist */}
        {selectedMood && moodTracks.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">
              {MOOD_PRESETS.find(p => p.id === selectedMood)?.name} Tracks ({moodTracks.length})
            </h3>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {moodTracks.slice(0, 20).map(track => (
                <div
                  key={track.id}
                  className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                    currentTrack?.id === track.id
                      ? 'bg-purple-900/30 border border-purple-500/30'
                      : 'hover:bg-gray-800/50'
                  }`}
                >
                  <button
                    onClick={() => playTrack(track)}
                    className="flex items-center gap-3 flex-1 text-left"
                  >
                    <span className="text-lg">{EMOTIONAL_CATEGORIES[track.categoryId]?.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white truncate">{track.name}</div>
                      <div className="text-xs text-gray-500">{formatDuration(track.duration)}</div>
                    </div>
                    {currentTrack?.id === track.id && isPlaying && (
                      <div className="flex gap-0.5">
                        <div className="w-1 h-4 bg-purple-400 rounded-full animate-pulse" />
                        <div className="w-1 h-4 bg-purple-400 rounded-full animate-pulse delay-75" />
                        <div className="w-1 h-4 bg-purple-400 rounded-full animate-pulse delay-150" />
                      </div>
                    )}
                  </button>
                  {/* Add to Playlist Button */}
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setAddToPlaylistTrack(addToPlaylistTrack?.id === track.id ? null : track);
                        setShowPlaylistDropdown(addToPlaylistTrack?.id !== track.id);
                      }}
                      className="p-1.5 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 transition-colors"
                      title="Add to playlist"
                    >
                      <Plus className="w-4 h-4 text-gray-400" />
                    </button>
                    {/* Playlist Dropdown */}
                    {addToPlaylistTrack?.id === track.id && showPlaylistDropdown && (
                      <div className="absolute right-0 top-full mt-1 z-50 w-56 bg-gray-900 border border-gray-700 rounded-lg shadow-xl overflow-hidden">
                        <div className="p-2 border-b border-gray-800">
                          <div className="text-xs text-gray-400 mb-2">Add to playlist:</div>
                          {userPlaylists.length > 0 ? (
                            <div className="space-y-1 max-h-32 overflow-y-auto">
                              {userPlaylists.map(playlist => (
                                <button
                                  key={playlist.id}
                                  onClick={() => addTrackToPlaylist(playlist.id, track)}
                                  className="w-full flex items-center gap-2 p-2 rounded hover:bg-gray-800 transition-colors text-left"
                                >
                                  <span>{playlist.coverEmoji}</span>
                                  <span className="text-sm text-white truncate flex-1">{playlist.name}</span>
                                  {isTrackInPlaylist(playlist.id, track.id) && (
                                    <Check className="w-3 h-3 text-green-400" />
                                  )}
                                </button>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-gray-500 py-2">No custom playlists yet</p>
                          )}
                        </div>
                        <button
                          onClick={() => {
                            setShowCreatePlaylist(true);
                          }}
                          className="w-full flex items-center gap-2 p-2 hover:bg-gray-800 transition-colors text-left"
                        >
                          <FolderPlus className="w-4 h-4 text-cyan-400" />
                          <span className="text-sm text-cyan-300">Create New Playlist</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tracks.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Music className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No tracks in your library yet</p>
            <p className="text-sm">Add music to start mixing</p>
          </div>
        )}

        {/* Playlist Management Section */}
        <div className="mt-6 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <FolderPlus className="w-4 h-4" />
              Manage Your Playlists
            </h3>
            <button
              onClick={() => setShowCreatePlaylist(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 rounded-lg text-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Playlist
            </button>
          </div>

          {userPlaylists.length > 0 ? (
            <div className="space-y-2">
              {userPlaylists.map(playlist => (
                <div
                  key={playlist.id}
                  className={`p-3 rounded-xl border transition-colors ${
                    selectedPlaylistForEdit?.id === playlist.id
                      ? 'bg-purple-900/30 border-purple-500/30'
                      : 'bg-gray-900/50 border-gray-800 hover:border-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{playlist.coverEmoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white">{playlist.name}</div>
                      <div className="text-xs text-gray-500">{playlist.trackIds.length} tracks</div>
                    </div>
                    <button
                      onClick={() => setSelectedPlaylistForEdit(
                        selectedPlaylistForEdit?.id === playlist.id ? null : playlist
                      )}
                      className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
                    >
                      <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${
                        selectedPlaylistForEdit?.id === playlist.id ? 'rotate-180' : ''
                      }`} />
                    </button>
                    <button
                      onClick={async () => {
                        if (playlist.trackIds.length > 0) {
                          const firstTrack = tracks.find(t => t.id === playlist.trackIds[0]);
                          if (firstTrack) {
                            setQueue(playlist.trackIds);
                            await playTrack(firstTrack);
                          }
                        }
                      }}
                      className="p-2 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 transition-colors"
                    >
                      <Play className="w-4 h-4 text-purple-300" />
                    </button>
                  </div>

                  {/* Expanded Playlist View */}
                  {selectedPlaylistForEdit?.id === playlist.id && (
                    <div className="mt-3 pt-3 border-t border-gray-800">
                      {playlist.trackIds.length > 0 ? (
                        <div className="space-y-1 max-h-40 overflow-y-auto">
                          {playlist.trackIds.map((trackId, idx) => {
                            const track = tracks.find(t => t.id === trackId);
                            if (!track) return null;
                            return (
                              <div
                                key={trackId}
                                className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-800/50"
                              >
                                <span className="text-xs text-gray-500 w-5">{idx + 1}</span>
                                <span className="text-sm">{EMOTIONAL_CATEGORIES[track.categoryId]?.icon}</span>
                                <span className="text-sm text-white flex-1 truncate">{track.name}</span>
                                <button
                                  onClick={() => removeTrackFromPlaylist(playlist.id, trackId)}
                                  className="p-1 rounded hover:bg-red-500/20 transition-colors"
                                  title="Remove from playlist"
                                >
                                  <X className="w-3 h-3 text-red-400" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-500 text-center py-2">
                          No tracks yet. Add songs from the track list above.
                        </p>
                      )}
                      <button
                        onClick={() => storyShuffleEngine.deletePlaylist(playlist.id)}
                        className="mt-2 w-full py-1.5 text-xs text-red-400 hover:bg-red-500/10 rounded transition-colors"
                      >
                        Delete Playlist
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 bg-gray-900/30 rounded-xl border border-gray-800">
              <ListMusic className="w-8 h-8 mx-auto mb-2 text-gray-600" />
              <p className="text-sm text-gray-500">No custom playlists yet</p>
              <p className="text-xs text-gray-600 mt-1">Create one to start curating your music</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Playlist Modal */}
      {showCreatePlaylist && (
        <div className="fixed inset-0 bg-black/80 z-60 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-2xl border border-gray-800 w-full max-w-md p-6">
            <h3 className="text-lg font-medium text-white mb-4">Create New Playlist</h3>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 block mb-2">Playlist Name</label>
                <input
                  type="text"
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  placeholder="My awesome playlist..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:border-purple-500 focus:outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-sm text-gray-400 block mb-2">Choose an Emoji</label>
                <div className="flex gap-2 flex-wrap">
                  {['🎵', '🎶', '🎸', '🎹', '🎤', '🎧', '💜', '🌙', '☀️', '⚡', '🔥', '🌊', '🌈', '✨', '💫', '🎯'].map(emoji => (
                    <button
                      key={emoji}
                      onClick={() => setNewPlaylistEmoji(emoji)}
                      className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl transition-all ${
                        newPlaylistEmoji === emoji
                          ? 'bg-purple-600/30 border-2 border-purple-400'
                          : 'bg-gray-800 border border-gray-700 hover:border-gray-600'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCreatePlaylist(false);
                  setNewPlaylistName('');
                }}
                className="flex-1 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => createNewPlaylist(addToPlaylistTrack || undefined)}
                disabled={!newPlaylistName.trim()}
                className="flex-1 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Playlist
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DJTab;
