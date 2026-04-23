import { useEffect, useRef, useState } from "react";

import { analyzeFaceFrame, validateFaceFrame } from "../utils/faceValidation";

const WebcamCapture = ({
  buttonText = "Capture",
  disabled = false,
  loading = false,
  onCapture,
  status,
  requireValidation = true
}) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraError, setCameraError] = useState("");
  const [ready, setReady] = useState(false);
  const [validationMessage, setValidationMessage] = useState("");
  const [liveGuidance, setLiveGuidance] = useState("Initializing face scanner...");

  const drawOverlay = (analysis) => {
    const video = videoRef.current;
    const canvas = overlayCanvasRef.current;

    if (!video || !canvas || !video.videoWidth || !video.videoHeight) {
      return;
    }

    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.clearRect(0, 0, canvas.width, canvas.height);

    const detection = analysis?.detections?.[0];

    if (detection?.boundingBox) {
      const { originX, originY, width, height } = detection.boundingBox;
      context.strokeStyle = analysis.success ? "#22c55e" : "#f59e0b";
      context.lineWidth = 2;
      context.strokeRect(originX, originY, width, height);
    }

    const landmarks = analysis?.landmarks?.[0] || [];

    if (landmarks.length > 0) {
      context.fillStyle = "rgba(56, 189, 248, 0.9)";

      for (let index = 0; index < landmarks.length; index += 3) {
        const point = landmarks[index];
        const x = point.x * canvas.width;
        const y = point.y * canvas.height;
        context.beginPath();
        context.arc(x, y, 1.4, 0, Math.PI * 2);
        context.fill();
      }
    }
  };

  useEffect(() => {
    let mounted = true;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 },
          audio: false
        });

        if (!mounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setReady(true);
        }
      } catch {
        setCameraError("Camera permission is required to scan face");
      }
    };

    startCamera();

    return () => {
      mounted = false;

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    let running = false;

    if (!ready || cameraError) {
      return undefined;
    }

    const runAnalysis = async () => {
      if (!mounted || running || !videoRef.current) {
        return;
      }

      running = true;

      try {
        const analysis = await analyzeFaceFrame(videoRef.current);

        if (!mounted) {
          return;
        }

        drawOverlay(analysis);
        setLiveGuidance(analysis.message);
      } finally {
        running = false;
      }
    };

    const intervalId = window.setInterval(runAnalysis, 180);

    return () => {
      mounted = false;
      window.clearInterval(intervalId);
    };
  }, [ready, cameraError]);

  const capture = async () => {
    if (!videoRef.current || !canvasRef.current || !ready) {
      return;
    }

    if (requireValidation) {
      setValidationMessage("Validating face...");
      const validation = await validateFaceFrame(videoRef.current);

      if (!validation.success) {
        setValidationMessage(validation.message);
        return;
      }
    }

    setValidationMessage("");

    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const context = canvas.getContext("2d");
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const frame = canvas.toDataURL("image/jpeg", 0.88);
    onCapture(frame);
  };

  return (
    <div className="webcam-panel">
      <div className="webcam-container">
        <video ref={videoRef} className="webcam-video" playsInline muted />
        <canvas ref={overlayCanvasRef} className="webcam-overlay-canvas" />
        <div className={`webcam-oval ${loading ? "scanning" : ""}`} />
        <canvas ref={canvasRef} className="hidden-canvas" />
      </div>
      {cameraError ? <p className="form-error center-text">{cameraError}</p> : null}
      {validationMessage ? <p className="form-error center-text">{validationMessage}</p> : null}
      {!cameraError ? <p className="scan-status">{liveGuidance}</p> : null}
      {status ? <p className="scan-status">{status}</p> : null}
      <button
        className="btn-primary"
        type="button"
        onClick={capture}
        disabled={disabled || loading || !ready || Boolean(cameraError)}
      >
        {loading ? "Scanning..." : buttonText}
      </button>
    </div>
  );
};

export default WebcamCapture;
