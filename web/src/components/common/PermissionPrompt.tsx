import type { PermissionStatus } from '../../hooks/useAudioSession';

interface PermissionPromptProps {
  status: PermissionStatus;
  error: string | null;
  onRequestPermission: () => void;
}

export function PermissionPrompt({ status, error, onRequestPermission }: PermissionPromptProps) {
  if (status === 'checking') {
    return (
      <div className="permission-prompt">
        <div className="permission-icon">
          <span className="loading-gear">&#9881;</span>
        </div>
        <h3>Checking Microphone Access...</h3>
        <p>Please wait while we verify microphone permissions.</p>
      </div>
    );
  }

  if (status === 'denied') {
    return (
      <div className="permission-prompt error">
        <div className="permission-icon">&#128683;</div>
        <h3>Microphone Access Required</h3>
        <p>
          To use the speech-to-text feature, please enable microphone access in your browser settings.
        </p>
        {error && <p className="permission-error">{error}</p>}
        <button className="btn btn-primary" onClick={onRequestPermission}>
          Try Again
        </button>
        <p className="text-muted small">
          You may need to click the camera/microphone icon in your browser&apos;s address bar.
        </p>
      </div>
    );
  }

  // prompt status
  return (
    <div className="permission-prompt">
      <div className="permission-icon">&#127908;</div>
      <h3>Microphone Access Needed</h3>
      <p>
        Click the button below to grant microphone access for speech transcription.
      </p>
      {error && <p className="permission-error">{error}</p>}
      <button className="btn btn-primary" onClick={onRequestPermission}>
        Enable Microphone
      </button>
    </div>
  );
}
