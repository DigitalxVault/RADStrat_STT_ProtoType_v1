import { useState, useEffect, useCallback, useRef } from 'react';

export type PermissionStatus = 'prompt' | 'granted' | 'denied' | 'checking';

export interface AudioSessionState {
  permissionStatus: PermissionStatus;
  sessionReady: boolean;
  permissionError: string | null;
  audioDevices: MediaDeviceInfo[];
  selectedDeviceId: string | null;
}

export interface AudioSessionActions {
  requestPermission: () => Promise<boolean>;
  selectDevice: (deviceId: string) => void;
  refreshDevices: () => Promise<void>;
}

export function useAudioSession(): AudioSessionState & AudioSessionActions {
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>('checking');
  const [sessionReady, setSessionReady] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);

  // Stream is tracked but not exposed - used for cleanup
  const streamRef = useRef<MediaStream | null>(null);

  const permissionChecked = useRef(false);

  // Clean up stream on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Enumerate available audio devices
  const refreshDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(device => device.kind === 'audioinput');
      setAudioDevices(audioInputs);

      // Auto-select first device if none selected
      if (audioInputs.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(audioInputs[0].deviceId);
      }
    } catch (err) {
      console.error('Failed to enumerate audio devices:', err);
    }
  }, [selectedDeviceId]);

  // Request microphone permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    setPermissionError(null);

    try {
      const constraints: MediaStreamConstraints = {
        audio: selectedDeviceId
          ? { deviceId: { exact: selectedDeviceId } }
          : true,
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);

      // Stop the stream immediately - we just needed to request permission
      // The actual recording will create its own stream
      mediaStream.getTracks().forEach(track => track.stop());

      setPermissionStatus('granted');
      setSessionReady(true);

      // Refresh devices after permission granted (labels become available)
      await refreshDevices();

      return true;
    } catch (err) {
      if (err instanceof DOMException) {
        switch (err.name) {
          case 'NotAllowedError':
            setPermissionStatus('denied');
            setPermissionError('Microphone access denied. Please enable in browser settings.');
            break;
          case 'NotFoundError':
            setPermissionError('No microphone found. Please connect a microphone.');
            break;
          case 'NotReadableError':
            setPermissionError('Microphone is in use by another application.');
            break;
          case 'OverconstrainedError':
            setPermissionError('Selected microphone is not available.');
            // Try again without device constraint
            setSelectedDeviceId(null);
            break;
          default:
            setPermissionError(`Microphone error: ${err.message}`);
        }
      } else {
        setPermissionError('Failed to access microphone.');
      }

      setSessionReady(false);
      return false;
    }
  }, [selectedDeviceId, refreshDevices]);

  // Check permission status on mount
  useEffect(() => {
    if (permissionChecked.current) return;
    permissionChecked.current = true;

    const checkAndRequestPermission = async () => {
      // Check if we can query permission status (Chrome/Edge)
      if ('permissions' in navigator) {
        try {
          const result = await navigator.permissions.query({
            name: 'microphone' as PermissionName,
          });

          setPermissionStatus(result.state as PermissionStatus);

          if (result.state === 'granted') {
            setSessionReady(true);
            await refreshDevices();
          } else if (result.state === 'prompt') {
            // Proactively request permission for better UX
            await requestPermission();
          } else {
            // denied
            setPermissionError('Microphone access denied. Please enable in browser settings.');
          }

          // Listen for permission changes
          result.addEventListener('change', () => {
            setPermissionStatus(result.state as PermissionStatus);
            setSessionReady(result.state === 'granted');
            if (result.state === 'granted') {
              refreshDevices();
              setPermissionError(null);
            }
          });
        } catch {
          // Firefox doesn't support querying microphone permission
          // Fall back to direct request
          await requestPermission();
        }
      } else {
        // Browser doesn't support Permissions API
        await requestPermission();
      }
    };

    checkAndRequestPermission();
  }, [requestPermission, refreshDevices]);

  // Select a different audio device
  const selectDevice = useCallback((deviceId: string) => {
    setSelectedDeviceId(deviceId);
  }, []);

  return {
    permissionStatus,
    sessionReady,
    permissionError,
    audioDevices,
    selectedDeviceId,
    requestPermission,
    selectDevice,
    refreshDevices,
  };
}
