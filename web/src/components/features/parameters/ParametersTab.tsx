import { DifficultyLevel, ScoringParameters } from '../../../types';

interface ParametersTabProps {
  difficulty: DifficultyLevel;
  setDifficulty: (difficulty: DifficultyLevel) => void;
  parameters: ScoringParameters;
  setParameters: (params: ScoringParameters) => void;
}

const PRESETS: Record<string, { difficulty: DifficultyLevel; params: ScoringParameters }> = {
  near_fetch: {
    difficulty: 'easy',
    params: {
      werThreshold: 30,
      fillerPenalty: 0.5,
      maxAllowedFillers: 5,
      pauseTolerance: 3,
    },
  },
  far_fetch: {
    difficulty: 'hard',
    params: {
      werThreshold: 10,
      fillerPenalty: 2,
      maxAllowedFillers: 1,
      pauseTolerance: 1,
    },
  },
  default: {
    difficulty: 'medium',
    params: {
      werThreshold: 20,
      fillerPenalty: 1,
      maxAllowedFillers: 2,
      pauseTolerance: 2,
    },
  },
};

export function ParametersTab({
  difficulty,
  setDifficulty,
  parameters,
  setParameters,
}: ParametersTabProps) {
  const handlePreset = (presetName: string) => {
    const preset = PRESETS[presetName];
    if (preset) {
      setDifficulty(preset.difficulty);
      setParameters(preset.params);
    }
  };

  const handleParamChange = (key: keyof ScoringParameters, value: number) => {
    setParameters({ ...parameters, [key]: value });
  };

  return (
    <div className="parameters-tab">
      {/* Preset Profiles */}
      <section className="mb-lg">
        <h5 className="mb-sm">Quick Presets</h5>
        <div className="flex gap-sm" style={{ flexWrap: 'wrap' }}>
          <button
            className="btn btn-ghost"
            onClick={() => handlePreset('near_fetch')}
          >
            Near Fetch (Easy)
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => handlePreset('default')}
          >
            Default (Medium)
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => handlePreset('far_fetch')}
          >
            Far Fetch (Hard)
          </button>
        </div>
      </section>

      {/* Difficulty Level */}
      <section className="mb-lg">
        <h5 className="mb-sm">Difficulty Level</h5>
        <div className="callout mb-sm">
          <p className="small">
            <strong>Easy:</strong> Semantic matching - key information must be present, phrasing can vary<br />
            <strong>Medium:</strong> Balanced - semantic + key phrases must match<br />
            <strong>Hard:</strong> Exact matching - Word Error Rate (WER) based scoring
          </p>
        </div>
        <div className="flex gap-sm">
          {(['easy', 'medium', 'hard'] as DifficultyLevel[]).map((level) => (
            <label key={level} className="flex items-center gap-xs">
              <input
                type="radio"
                name="difficulty"
                value={level}
                checked={difficulty === level}
                onChange={() => setDifficulty(level)}
              />
              <span className="mono" style={{ textTransform: 'capitalize' }}>
                {level}
              </span>
            </label>
          ))}
        </div>
      </section>

      {/* WER Threshold (Hard mode only) */}
      <section className="mb-lg">
        <h5 className="mb-sm">Accuracy Parameters</h5>

        <div className="card card-bordered mb-md">
          <div className="flex justify-between items-center mb-xs">
            <label className="label" style={{ margin: 0 }}>
              WER Threshold (Hard Mode)
            </label>
            <span className="mono badge badge-ink">{parameters.werThreshold}%</span>
          </div>
          <input
            type="range"
            min="5"
            max="50"
            value={parameters.werThreshold}
            onChange={(e) => handleParamChange('werThreshold', Number(e.target.value))}
            className="w-full"
          />
          <p className="small text-muted mt-xs">
            Maximum word error rate allowed before significant penalty. Lower = stricter.
          </p>
        </div>
      </section>

      {/* Fluency Parameters */}
      <section className="mb-lg">
        <h5 className="mb-sm">Fluency Parameters</h5>

        <div className="card card-bordered mb-md">
          <div className="flex justify-between items-center mb-xs">
            <label className="label" style={{ margin: 0 }}>
              Filler Word Penalty
            </label>
            <span className="mono badge badge-ink">{parameters.fillerPenalty} pts</span>
          </div>
          <input
            type="range"
            min="0"
            max="5"
            step="0.5"
            value={parameters.fillerPenalty}
            onChange={(e) => handleParamChange('fillerPenalty', Number(e.target.value))}
            className="w-full"
          />
          <p className="small text-muted mt-xs">
            Points deducted per filler word (um, uh, like, etc.)
          </p>
        </div>

        <div className="card card-bordered mb-md">
          <div className="flex justify-between items-center mb-xs">
            <label className="label" style={{ margin: 0 }}>
              Max Allowed Fillers
            </label>
            <span className="mono badge badge-ink">{parameters.maxAllowedFillers}</span>
          </div>
          <input
            type="range"
            min="0"
            max="10"
            value={parameters.maxAllowedFillers}
            onChange={(e) => handleParamChange('maxAllowedFillers', Number(e.target.value))}
            className="w-full"
          />
          <p className="small text-muted mt-xs">
            Number of filler words allowed before penalty applies
          </p>
        </div>

        <div className="card card-bordered mb-md">
          <div className="flex justify-between items-center mb-xs">
            <label className="label" style={{ margin: 0 }}>
              Pause Tolerance
            </label>
            <span className="mono badge badge-ink">{parameters.pauseTolerance}s</span>
          </div>
          <input
            type="range"
            min="0.5"
            max="5"
            step="0.5"
            value={parameters.pauseTolerance}
            onChange={(e) => handleParamChange('pauseTolerance', Number(e.target.value))}
            className="w-full"
          />
          <p className="small text-muted mt-xs">
            Maximum pause duration (seconds) before penalty
          </p>
        </div>
      </section>

      {/* Current Settings Summary */}
      <section>
        <h5 className="mb-sm">Current Configuration</h5>
        <div className="callout">
          <p className="mono small">
            Difficulty: {difficulty.toUpperCase()}<br />
            WER Threshold: {parameters.werThreshold}%<br />
            Filler Penalty: {parameters.fillerPenalty} pts/filler<br />
            Max Fillers: {parameters.maxAllowedFillers}<br />
            Pause Tolerance: {parameters.pauseTolerance}s
          </p>
        </div>
      </section>
    </div>
  );
}
