const FaceDetection = window.FaceDetection;
const Pose = window.Pose;
const Camera = window.Camera;

export class VisionEngine {
    constructor(videoElement, onFaceResults, onPoseResults) {
        this.videoElement = videoElement;
        this.onFaceResults = onFaceResults;
        this.onPoseResults = onPoseResults;
        this.isRunning = false;

        this.faceDetection = new FaceDetection({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${file}`
        });
        this.faceDetection.setOptions({
            model: 'short',
            minDetectionConfidence: 0.5
        });
        this.faceDetection.onResults(this.onFaceResults);

        this.pose = new Pose({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
        });
        this.pose.setOptions({
            modelComplexity: 1,
            smoothLandmarks: true,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });
        this.pose.onResults(this.onPoseResults);

        this.camera = new Camera(this.videoElement, {
            onFrame: async () => {
                if (!this.isRunning) return;
                try {
                    await this.faceDetection.send({image: this.videoElement});
                    await this.pose.send({image: this.videoElement});
                } catch(e) {
                    console.error("MediaPipe error:", e);
                }
            },
            width: 640,
            height: 480
        });
    }

    start() {
        this.isRunning = true;
        this.camera.start();
    }
    
    stop() {
        this.isRunning = false;
        this.camera.stop();
    }
}
