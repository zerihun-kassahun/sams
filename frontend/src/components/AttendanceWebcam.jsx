import { useEffect, useRef, useState } from "react";

export default function AttendanceWebcam({ onRecognize, disabled = false, recognizing = false }) {
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

  function captureFrame() {
    if (!videoRef.current) return null;

    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.9);
  }

  function handleRecognize() {
    if (!ready || disabled || recognizing) return;
    const frame = captureFrame();
    if (frame) {
      onRecognize(frame);
    }
  }

  return (
    <div className="webcam-panel">
      <h3>Live camera</h3>
      <p className="muted">Ask each student to face the camera, then click recognize attendance.</p>

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
        onClick={handleRecognize}
        disabled={!ready || disabled || recognizing}
      >
        {recognizing ? "Recognizing..." : "Recognize attendance"}
      </button>
    </div>
  );
}
