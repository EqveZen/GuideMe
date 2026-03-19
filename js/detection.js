const Detection = {
    model: null,
    settings: {
        confidence: 0.4,
        maxDetections: 20
    },
    isModelLoaded: false,
    lastDetections: [],
    stats: {
        fps: 0,
        frameCount: 0,
        lastFrameTime: 0
    },

    async init() {
        console.log('📦 Detection: загрузка модели...');
        return this.loadModel();
    },

    async loadModel() {
        try {
            this.model = await cocoSsd.load({
                base: 'mobilenet_v2'
            });
            
            this.isModelLoaded = true;
            console.log('✅ Модель загружена');
            return true;
            
        } catch (error) {
            console.error('❌ Ошибка загрузки модели:', error);
            this.isModelLoaded = false;
            return false;
        }
    },

    async detect(videoElement) {
        if (!this.isModelLoaded || !videoElement || videoElement.readyState < 2) {
            return [];
        }
        
        const startTime = performance.now();
        
        try {
            const predictions = await this.model.detect(videoElement);
            
            const filtered = predictions
                .filter(p => p.score >= this.settings.confidence)
                .slice(0, this.settings.maxDetections);
            
            this.updateStats(startTime);
            this.lastDetections = filtered;
            
            return filtered;
            
        } catch (error) {
            console.warn('Detection error:', error);
            return [];
        }
    },

    updateStats(startTime) {
        const now = performance.now();
        this.stats.frameCount++;
        
        if (now - this.stats.lastFrameTime >= 1000) {
            this.stats.fps = this.stats.frameCount;
            this.stats.frameCount = 0;
            this.stats.lastFrameTime = now;
        }
    },

    getCurrentDescription() {
        if (this.lastDetections.length === 0) {
            return 'Ничего не обнаружено';
        }
        
        const groups = Utils.groupDetections(this.lastDetections);
        return Utils.createDescription(groups);
    },

    getStats() {
        return {
            fps: this.stats.fps,
            objectsNow: this.lastDetections.length,
            modelLoaded: this.isModelLoaded
        };
    },

    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
    },

    drawDetections(ctx, detections) {
        if (!ctx) return;
        
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        
        detections.forEach(pred => {
            const [x, y, width, height] = pred.bbox;
            
            let color = '#4CAF50';
            if (pred.class === 'person') color = '#FF5722';
            if (['car', 'truck', 'bus'].includes(pred.class)) color = '#2196F3';
            
            ctx.strokeStyle = color;
            ctx.lineWidth = 3;
            ctx.strokeRect(x, y, width, height);
            
            ctx.fillStyle = color;
            ctx.font = 'bold 16px Arial';
            const text = `${pred.class} ${Math.round(pred.score * 100)}%`;
            const textWidth = ctx.measureText(text).width;
            
            ctx.fillRect(x, y - 25, textWidth + 10, 25);
            
            ctx.fillStyle = 'white';
            ctx.font = 'bold 14px Arial';
            ctx.fillText(text, x + 5, y - 7);
        });
    }
};

window.Detection = Detection;
