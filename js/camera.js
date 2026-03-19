const Camera = {
    videoElement: null,
    overlayCanvas: null,
    ctx: null,
    stream: null,
    isActive: false,

    init(videoId, overlayId) {
        this.videoElement = document.getElementById(videoId);
        this.overlayCanvas = document.getElementById(overlayId);
        
        if (!this.videoElement || !this.overlayCanvas) {
            console.error('Camera: элементы не найдены');
            return false;
        }
        
        this.ctx = this.overlayCanvas.getContext('2d');
        return true;
    },

    async start() {
        try {
            const constraints = {
                video: {
                    facingMode: 'environment',
                    width: { ideal: 640 },
                    height: { ideal: 480 }
                }
            };
            
            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.videoElement.srcObject = this.stream;
            
            await new Promise((resolve) => {
                this.videoElement.onloadedmetadata = () => {
                    this.overlayCanvas.width = this.videoElement.videoWidth;
                    this.overlayCanvas.height = this.videoElement.videoHeight;
                    resolve();
                };
            });
            
            this.isActive = true;
            return true;
            
        } catch (error) {
            console.error('Camera error:', error);
            this.isActive = false;
            throw error;
        }
    },

    stop() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        this.videoElement.srcObject = null;
        this.isActive = false;
        
        if (this.ctx) {
            this.ctx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
        }
    },

    isRunning() {
        return this.isActive && this.videoElement.readyState >= 2;
    }
};

window.Camera = Camera;
