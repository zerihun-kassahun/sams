import { useEffect, useRef, useState } from "react";

export default function WebcamCapture({ captures, onCapture, onRemove, disabled = false }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraError, setCameraError] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
        if (!active) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setReady(true);
        setCameraError("");
      } catch {
        setCameraError("Could not access webcam. Check browser permissions.");
        setReady(false);
      }
    }

    startCamera();

    return () => {
      active = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  function handleCapture() {
    if (!videoRef.current || disabled) return;

    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    onCapture(dataUrl);
  }

  return (
    <div className="webcam-panel">
      <h3>Face capture</h3>
      <p className="muted">Capture 1–5 clear photos. Only one face should be visible per photo.</p>

      {cameraError ? (
        <div className="alert alert-error">{cameraError}</div>
      ) : (
        <div className="webcam-stage">
          <video ref={videoRef} autoPlay playsInline muted className="webcam-video" />
        </div>
      )}

      <button
        className="btn btn-primary btn-inline"
        type="button"
        onClick={handleCapture}
        disabled={!ready || disabled || captures.length >= 5}
      >
        Capture photo ({captures.length}/5)
      </button>

      {captures.length > 0 && (
        <div className="capture-grid">
          {captures.map((capture, index) => (
            <div key={capture.id} className="capture-thumb">
              <img src={capture.dataUrl} alt={`Capture ${index + 1}`} />
              <button
                className="btn btn-danger btn-sm"
                type="button"
                onClick={() => onRemove(capture.id)}
                disabled={disabled}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
