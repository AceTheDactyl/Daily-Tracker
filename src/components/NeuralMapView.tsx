import React, { useState, useMemo } from 'react';
import {
  Brain,
  Activity,
  Target,
  AlertTriangle,
  ChevronRight,
  X,
} from 'lucide-react';
import type { DeltaHVState } from '../lib/deltaHVEngine';
import {
  generateNeuralMap,
  getRegionsNeedingAttention,
  getDomainCoherence,
  type NeuralActivation,
  type GlyphicResonanceField,
} from '../lib/neuralMapEngine';
import { BRAIN_REGIONS } from '../lib/glyphSystem';

interface NeuralMapViewProps {
  deltaHV: DeltaHVState;
  onSelectBeat?: (category: string) => void;
}

type ViewMode = 'fields' | 'regions' | 'metrics' | 'recommendations';

export const NeuralMapView: React.FC<NeuralMapViewProps> = ({
  deltaHV,
  onSelectBeat,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('fields');
  const [selectedField, setSelectedField] = useState<GlyphicResonanceField | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<NeuralActivation | null>(null);
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);

  // Generate neural map from deltaHV metrics
  const neuralMap = useMemo(() => generateNeuralMap(deltaHV), [deltaHV]);

  // Get regions needing attention
  const attentionRegions = useMemo(() => getRegionsNeedingAttention(neuralMap, 50), [neuralMap]);

  // Get phase color
  const getPhaseColor = (phase: string): string => {
    const colors: Record<string, string> = {
      ignition: '#f97316',
      empowerment: '#eab308',
      resonance: '#22c55e',
      mania: '#ef4444',
      nirvana: '#a855f7',
      transmission: '#3b82f6',
      reflection: '#6366f1',
      collapse: '#64748b',
      rewrite: '#14b8a6',
    };
    return colors[phase] || '#6b7280';
  };

  // Get activation color gradient
  const getActivationColor = (activation: number, coherence: number): string => {
    if (coherence > 70) {
      if (activation > 70) return 'from-green-500 to-emerald-400';
      if (activation > 40) return 'from-green-600 to-green-500';
      return 'from-green-700 to-green-600';
    } else if (coherence > 40) {
      if (activation > 70) return 'from-yellow-500 to-amber-400';
      if (activation > 40) return 'from-yellow-600 to-yellow-500';
      return 'from-yellow-700 to-yellow-600';
    } else {
      if (activation > 70) return 'from-red-500 to-orange-400';
      if (activation > 40) return 'from-red-600 to-red-500';
      return 'from-red-700 to-red-600';
    }
  };

  // Metric display helper
  const MetricBadge: React.FC<{ label: string; value: number; icon: React.ReactNode; inverted?: boolean }> = ({
    label, value, icon, inverted = false
  }) => {
    const displayValue = inverted ? 100 - value : value;
    const color = displayValue > 70 ? 'text-green-400' : displayValue > 40 ? 'text-yellow-400' : 'text-red-400';
    const bgColor = displayValue > 70 ? 'bg-green-500/10' : displayValue > 40 ? 'bg-yellow-500/10' : 'bg-red-500/10';

    return (
      <div className={`${bgColor} rounded-lg p-3 flex flex-col items-center`}>
        <div className={`${color} mb-1`}>{icon}</div>
        <div className={`text-2xl font-light ${color}`}>{value}</div>
        <div className="text-xs text-gray-400">{label}</div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header with Overall State */}
      <div className="bg-gray-950/60 backdrop-blur border border-gray-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-white flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-400" />
            Neural Wumbo Map
          </h3>
          <div className="flex items-center gap-2">
            <span
              className="px-3 py-1 rounded-full text-sm"
              style={{ backgroundColor: `${getPhaseColor(neuralMap.dominantPhase)}20`, color: getPhaseColor(neuralMap.dominantPhase) }}
            >
              {neuralMap.dominantPhase.charAt(0).toUpperCase() + neuralMap.dominantPhase.slice(1)}
            </span>
            <span className={`px-3 py-1 rounded-full text-sm ${
              neuralMap.fieldState === 'coherent' ? 'bg-green-500/20 text-green-300' :
              neuralMap.fieldState === 'transitioning' ? 'bg-yellow-500/20 text-yellow-300' :
              neuralMap.fieldState === 'fragmented' ? 'bg-orange-500/20 text-orange-300' :
              'bg-gray-500/20 text-gray-300'
            }`}>
              {neuralMap.fieldState}
            </span>
          </div>
        </div>

        {/* DeltaHV Metrics Grid */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          <MetricBadge
            label="Symbolic (S)"
            value={deltaHV.symbolicDensity}
            icon={<span className="text-lg">✨</span>}
          />
          <MetricBadge
            label="Resonance (R)"
            value={deltaHV.resonanceCoupling}
            icon={<Target className="w-5 h-5" />}
          />
          <MetricBadge
            label="Friction (δφ)"
            value={deltaHV.frictionCoefficient}
            icon={<AlertTriangle className="w-5 h-5" />}
            inverted
          />
          <MetricBadge
            label="Stability (H)"
            value={deltaHV.harmonicStability}
            icon={<Activity className="w-5 h-5" />}
          />
        </div>

        {/* Metric Details */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2 text-gray-400">
            <span>✨</span>
            <span>{deltaHV.breakdown.glyphCount} glyphs, {deltaHV.breakdown.intentionCount} intentions</span>
          </div>
          <div className="flex items-center gap-2 text-gray-400">
            <Target className="w-4 h-4" />
            <span>{deltaHV.breakdown.alignedTasks}/{deltaHV.breakdown.totalPlannedTasks || 1} aligned</span>
          </div>
          <div className="flex items-center gap-2 text-gray-400">
            <AlertTriangle className="w-4 h-4" />
            <span>{deltaHV.breakdown.missedTasks} missed, {deltaHV.breakdown.delayedTasks} delayed</span>
          </div>
          <div className="flex items-center gap-2 text-gray-400">
            <Activity className="w-4 h-4" />
            <span>Free Energy: {neuralMap.overallFreeEnergy}%</span>
          </div>
        </div>
      </div>

      {/* View Mode Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {(['fields', 'regions', 'metrics', 'recommendations'] as const).map(mode => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${
              viewMode === mode
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                : 'bg-gray-800/50 text-gray-400 border border-gray-700 hover:border-gray-600'
            }`}
          >
            {mode === 'fields' && '🌐 Resonance Fields'}
            {mode === 'regions' && '🧠 Brain Regions'}
            {mode === 'metrics' && '📊 Metric Influence'}
            {mode === 'recommendations' && '💡 Recommendations'}
          </button>
        ))}
      </div>

      {/* Resonance Fields View */}
      {viewMode === 'fields' && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {neuralMap.resonanceFields.map(field => {
            const domainMetrics = getDomainCoherence(neuralMap, field.domain);
            const isSelected = selectedField?.id === field.id;

            return (
              <button
                key={field.id}
                onClick={() => setSelectedField(isSelected ? null : field)}
                className={`p-4 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'border-purple-500 bg-purple-500/10'
                    : 'border-gray-800 bg-gray-950/60 hover:border-gray-700'
                }`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">{field.glyph}</span>
                  <div>
                    <h4 className="text-white font-medium">{field.name}</h4>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: `${field.color}20`, color: field.color }}
                    >
                      {field.phase}
                    </span>
                  </div>
                </div>

                {/* Field Metrics */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Strength</span>
                    <span className={field.strength > 50 ? 'text-green-400' : 'text-yellow-400'}>
                      {field.strength}%
                    </span>
                  </div>
                  <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${field.strength}%`,
                        background: `linear-gradient(to right, ${field.color}80, ${field.color})`,
                      }}
                    />
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Coherence</span>
                    <span className={field.coherence > 50 ? 'text-green-400' : 'text-yellow-400'}>
                      {field.coherence}%
                    </span>
                  </div>
                  <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-600 to-purple-400 rounded-full transition-all"
                      style={{ width: `${field.coherence}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Free Energy</span>
                    <span className={domainMetrics.freeEnergy < 40 ? 'text-green-400' : 'text-red-400'}>
                      {domainMetrics.freeEnergy}%
                    </span>
                  </div>
                </div>

                {/* Active Regions Count */}
                <div className="mt-3 pt-3 border-t border-gray-800 text-xs text-gray-500">
                  {field.activeRegions.length} active regions
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Selected Field Detail */}
      {selectedField && viewMode === 'fields' && (
        <div className="bg-gray-950/60 backdrop-blur border border-purple-500/30 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-white font-medium flex items-center gap-2">
              <span className="text-2xl">{selectedField.glyph}</span>
              {selectedField.name} Field - Active Regions
            </h4>
            <button onClick={() => setSelectedField(null)} className="text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {selectedField.activeRegions.slice(0, 8).map(regionId => {
              const activation = neuralMap.activations.find(a => a.regionId === regionId);
              if (!activation) return null;

              return (
                <div
                  key={regionId}
                  className="p-3 bg-gray-900/50 rounded-lg border border-gray-800"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{activation.glyph}</span>
                    <span className="text-sm text-gray-300 truncate">{activation.regionName.split(' ').slice(0, 2).join(' ')}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Act: {activation.activation}%</span>
                    <span className={activation.coherence > 50 ? 'text-green-400' : 'text-yellow-400'}>
                      Coh: {activation.coherence}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Brain Regions View */}
      {viewMode === 'regions' && (
        <div className="space-y-4">
          {/* Category Filter */}
          <div className="flex flex-wrap gap-2">
            {(['cortical', 'limbic', 'subcortical', 'brainstem', 'cerebellar'] as const).map(cat => {
              const catRegions = neuralMap.activations.filter(a => a.category === cat);
              const avgActivation = catRegions.reduce((sum, r) => sum + r.activation, 0) / catRegions.length;

              return (
                <div key={cat} className="px-3 py-2 bg-gray-900/50 rounded-lg border border-gray-800">
                  <div className="text-xs text-gray-400 capitalize">{cat}</div>
                  <div className="text-lg font-light text-white">{Math.round(avgActivation)}%</div>
                </div>
              );
            })}
          </div>

          {/* Regions needing attention */}
          {attentionRegions.length > 0 && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
              <h4 className="text-red-300 font-medium mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Regions with High Free Energy
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {attentionRegions.slice(0, 8).map(region => (
                  <div
                    key={region.regionId}
                    className="p-2 bg-red-500/5 rounded-lg flex items-center gap-2"
                    title={region.tooltip}
                  >
                    <span className="text-lg">{region.glyph}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-gray-300 truncate">{region.regionName.split(' ')[0]}</div>
                      <div className="text-xs text-red-400">FE: {region.freeEnergy}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All Regions Grid */}
          <div className="grid grid-cols-4 md:grid-cols-8 lg:grid-cols-10 gap-2">
            {neuralMap.activations.slice(0, 50).map(region => (
              <button
                key={region.regionId}
                onClick={() => setSelectedRegion(selectedRegion?.regionId === region.regionId ? null : region)}
                onMouseEnter={() => setHoveredRegion(region.regionId)}
                onMouseLeave={() => setHoveredRegion(null)}
                className={`p-2 rounded-lg transition-all relative group ${
                  selectedRegion?.regionId === region.regionId
                    ? 'ring-2 ring-purple-500 bg-purple-500/20'
                    : 'bg-gray-900/50 hover:bg-gray-800/50'
                }`}
                title={region.tooltip}
              >
                <div className="text-2xl text-center mb-1">{region.glyph}</div>
                <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${getActivationColor(region.activation, region.coherence)}`}
                    style={{ width: `${region.activation}%` }}
                  />
                </div>
                {/* Hover tooltip */}
                {hoveredRegion === region.regionId && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 border border-gray-700 rounded text-xs whitespace-nowrap z-10">
                    {region.regionName.split(' ').slice(0, 3).join(' ')}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Selected Region Detail */}
      {selectedRegion && viewMode === 'regions' && (
        <div className="bg-gray-950/60 backdrop-blur border border-purple-500/30 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-4xl">{selectedRegion.glyph}</span>
              <div>
                <h4 className="text-white font-medium">{selectedRegion.regionName}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 capitalize">
                    {selectedRegion.category}
                  </span>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: `${getPhaseColor(selectedRegion.phase)}20`, color: getPhaseColor(selectedRegion.phase) }}
                  >
                    {selectedRegion.phase}
                  </span>
                </div>
              </div>
            </div>
            <button onClick={() => setSelectedRegion(null)} className="text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center p-3 bg-gray-900/50 rounded-lg">
              <div className={`text-2xl font-light ${selectedRegion.activation > 60 ? 'text-green-400' : 'text-yellow-400'}`}>
                {selectedRegion.activation}%
              </div>
              <div className="text-xs text-gray-400">Activation</div>
            </div>
            <div className="text-center p-3 bg-gray-900/50 rounded-lg">
              <div className={`text-2xl font-light ${selectedRegion.coherence > 60 ? 'text-green-400' : 'text-yellow-400'}`}>
                {selectedRegion.coherence}%
              </div>
              <div className="text-xs text-gray-400">Coherence</div>
            </div>
            <div className="text-center p-3 bg-gray-900/50 rounded-lg">
              <div className={`text-2xl font-light ${selectedRegion.freeEnergy < 40 ? 'text-green-400' : 'text-red-400'}`}>
                {selectedRegion.freeEnergy}%
              </div>
              <div className="text-xs text-gray-400">Free Energy</div>
            </div>
          </div>

          <div className="text-sm text-gray-400">
            <div className="mb-2">
              <span className="text-gray-500">Primary Metric: </span>
              <span className="text-white capitalize">{selectedRegion.dominantMetric}</span>
            </div>
            <div>
              <span className="text-gray-500">Neurochemicals: </span>
              <span className="text-purple-300">{selectedRegion.neurochemicals.join(', ')}</span>
            </div>
          </div>
        </div>
      )}

      {/* Metric Influence View */}
      {viewMode === 'metrics' && (
        <div className="space-y-4">
          {Object.entries(neuralMap.metricInfluence).map(([metric, data]) => {
            const metricColors: Record<string, string> = {
              symbolic: 'purple',
              resonance: 'cyan',
              friction: 'red',
              stability: 'green',
            };
            const color = metricColors[metric] || 'gray';
            const regions = neuralMap.activations.filter(a => data.regions.includes(a.regionId));

            return (
              <div key={metric} className="bg-gray-950/60 backdrop-blur border border-gray-800 rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-white font-medium capitalize flex items-center gap-2">
                    {metric === 'symbolic' && <span className="text-xl">✨</span>}
                    {metric === 'resonance' && <Target className="w-5 h-5 text-cyan-400" />}
                    {metric === 'friction' && <AlertTriangle className="w-5 h-5 text-red-400" />}
                    {metric === 'stability' && <Activity className="w-5 h-5 text-green-400" />}
                    {metric}
                  </h4>
                  <div className={`text-2xl font-light text-${color}-400`}>{data.strength}%</div>
                </div>

                <div className="h-2 bg-gray-800 rounded-full overflow-hidden mb-4">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r from-${color}-600 to-${color}-400`}
                    style={{ width: `${data.strength}%` }}
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  {regions.slice(0, 6).map(region => (
                    <span
                      key={region.regionId}
                      className={`px-2 py-1 bg-${color}-500/10 text-${color}-300 rounded-lg text-sm flex items-center gap-1`}
                    >
                      <span>{region.glyph}</span>
                      <span className="text-xs">{region.regionName.split(' ')[0]}</span>
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Recommendations View */}
      {viewMode === 'recommendations' && (
        <div className="space-y-4">
          {neuralMap.recommendations.map(rec => (
            <div
              key={rec.id}
              className={`bg-gray-950/60 backdrop-blur border rounded-xl p-5 ${
                rec.priority === 'high' ? 'border-red-500/30' :
                rec.priority === 'medium' ? 'border-yellow-500/30' :
                'border-gray-800'
              }`}
            >
              <div className="flex items-start gap-4">
                <span className="text-3xl">{rec.glyph}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-white font-medium">{rec.title}</h4>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      rec.priority === 'high' ? 'bg-red-500/20 text-red-300' :
                      rec.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-300' :
                      'bg-gray-500/20 text-gray-300'
                    }`}>
                      {rec.priority}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 capitalize">
                      {rec.type}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 mb-3">{rec.description}</p>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => onSelectBeat?.(rec.suggestedBeat)}
                      className="px-4 py-2 bg-purple-500/20 text-purple-300 rounded-lg hover:bg-purple-500/30 transition-colors flex items-center gap-2"
                    >
                      <span>Start {rec.suggestedBeat} Beat</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <div className="flex gap-1">
                      {rec.targetRegions.slice(0, 3).map(regionId => {
                        const region = BRAIN_REGIONS.find(r => r.id === regionId);
                        return region ? (
                          <span key={regionId} className="text-lg" title={region.name}>
                            {region.glyph}
                          </span>
                        ) : null;
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {neuralMap.recommendations.length === 0 && (
            <div className="bg-gray-950/60 backdrop-blur border border-gray-800 rounded-xl p-8 text-center">
              <span className="text-4xl mb-4 block">🌟</span>
              <h4 className="text-white font-medium mb-2">All Systems Coherent</h4>
              <p className="text-gray-400 text-sm">Your neural field is in a balanced state. Continue your current practices.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NeuralMapView;
