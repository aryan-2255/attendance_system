import { FaceDetector, FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

const WASM_ROOT = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm";
const FACE_DETECTOR_MODEL =
  "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/latest/blaze_face_short_range.tflite";
const FACE_LANDMARKER_MODEL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task";

let visionResolverPromise;
let faceDetectorPromise;
let faceLandmarkerPromise;

const getVisionResolver = async () => {
  if (!visionResolverPromise) {
    visionResolverPromise = FilesetResolver.forVisionTasks(WASM_ROOT);
  }

  return visionResolverPromise;
};

const getFaceDetector = async () => {
  if (!faceDetectorPromise) {
    faceDetectorPromise = (async () => {
      const vision = await getVisionResolver();

      return FaceDetector.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: FACE_DETECTOR_MODEL
        },
        runningMode: "VIDEO",
        minDetectionConfidence: 0.6,
        minSuppressionThreshold: 0.3
      });
    })();
  }

  return faceDetectorPromise;
};

const getFaceLandmarker = async () => {
  if (!faceLandmarkerPromise) {
    faceLandmarkerPromise = (async () => {
      const vision = await getVisionResolver();

      return FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: FACE_LANDMARKER_MODEL
        },
        runningMode: "VIDEO",
        numFaces: 1,
        minFaceDetectionConfidence: 0.6,
        minFacePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
        outputFaceBlendshapes: false,
        outputFacialTransformationMatrixes: false
      });
    })();
  }

  return faceLandmarkerPromise;
};

const isFaceCentered = (boundingBox, width, height) => {
  const centerX = boundingBox.originX + boundingBox.width / 2;
  const centerY = boundingBox.originY + boundingBox.height / 2;
  const distanceX = Math.abs(centerX - width / 2) / width;
  const distanceY = Math.abs(centerY - height / 2) / height;

  return distanceX <= 0.2 && distanceY <= 0.2;
};

const isFaceSizeValid = (boundingBox, width, height) => {
  const frameArea = width * height;
  const boxArea = boundingBox.width * boundingBox.height;
  const ratio = boxArea / frameArea;

  return ratio >= 0.08 && ratio <= 0.5;
};

export const analyzeFaceFrame = async (videoElement) => {
  if (!videoElement || !videoElement.videoWidth || !videoElement.videoHeight) {
    return { success: false, message: "Camera is not ready yet", detections: [], landmarks: [] };
  }

  try {
    const [detector, landmarker] = await Promise.all([getFaceDetector(), getFaceLandmarker()]);
    const timestamp = performance.now();

    const detectionResult = detector.detectForVideo(videoElement, timestamp);
    const detections = detectionResult?.detections || [];

    if (detections.length === 0) {
      return {
        success: false,
        message: "No face detected. Move into the frame",
        detections,
        landmarks: []
      };
    }

    if (detections.length > 1) {
      return {
        success: false,
        message: "Multiple faces detected. Ensure only you are visible",
        detections,
        landmarks: []
      };
    }

    const boundingBox = detections[0].boundingBox;
    const width = videoElement.videoWidth;
    const height = videoElement.videoHeight;
    const landmarkResult = landmarker.detectForVideo(videoElement, timestamp);
    const landmarks = landmarkResult?.faceLandmarks || [];

    if (!isFaceCentered(boundingBox, width, height)) {
      return {
        success: false,
        message: "Center your face inside the oval",
        detections,
        landmarks
      };
    }

    if (!isFaceSizeValid(boundingBox, width, height)) {
      return {
        success: false,
        message: "Move closer or farther so your face fills the oval",
        detections,
        landmarks
      };
    }

    if (landmarks.length !== 1 || (landmarks[0] && landmarks[0].length < 100)) {
      return {
        success: false,
        message: "Face landmark validation failed. Look at camera with better lighting",
        detections,
        landmarks
      };
    }

    return { success: true, message: "Face validated", detections, landmarks };
  } catch {
    return {
      success: false,
      message: "Could not run face validation. Check internet and camera permissions",
      detections: [],
      landmarks: []
    };
  }
};

export const validateFaceFrame = async (videoElement) => {
  const analysis = await analyzeFaceFrame(videoElement);

  return {
    success: analysis.success,
    message: analysis.message
  };
};
