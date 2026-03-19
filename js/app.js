const App = {
    elements: {},
    detectionInterval: null,
    
    // Память сцены для умного озвучивания
    sceneMemory: {
        lastSpokenTime: 0,
        lastChangeTime: 0,
        lastPriorityTime: 0,
        objects: {}  // Текущие объекты
    },

    async init() {
        console.log('App инициализация...');
        
        this.cacheElements();
        
        Camera.init('video', 'overlay');
        
        const modelLoaded = await Detection.init();
        if (modelLoaded) {
            console.log('Модель загружена');
            this.elements.modelStatus.textContent = '✅ готова';
        }
        
        this.setupEventListeners();
        this.loadSettings();
        
        console.log('App готов');
    },
    
    cacheElements() {
        const ids = [
            'video', 'overlay', 'startBtn', 'stopBtn', 'describeBtn', 
            'testVoiceBtn', 'settingsBtn', 'settingsPanel', 'closeSettingsBtn',
            'status', 'log', 'modelStatus', 'fps',
            'volume', 'frequency', 'confidence', 'soundEnabled'
        ];
        
        ids.forEach(id => {
            this.elements[id] = document.getElementById(id);
        });
    },
    
    setupEventListeners() {
        this.elements.startBtn.addEventListener('click', () => this.startCamera());
        this.elements.stopBtn.addEventListener('click', () => this.stopCamera());
        this.elements.describeBtn.addEventListener('click', () => this.describeScene());
        this.elements.testVoiceBtn.addEventListener('click', () => Speech.test());
        this.elements.settingsBtn.addEventListener('click', () => this.toggleSettings());
        this.elements.closeSettingsBtn.addEventListener('click', () => this.toggleSettings());
        
        // Настройки
        this.elements.volume.addEventListener('input', (e) => {
            Speech.updateSettings({ volume: parseFloat(e.target.value) });
        });
        
        this.elements.frequency.addEventListener('input', (e) => {
            localStorage.setItem('speakFrequency', e.target.value);
        });
        
        this.elements.confidence.addEventListener('input', (e) => {
            Detection.updateSettings({ confidence: parseFloat(e.target.value) });
        });
        
        this.elements.soundEnabled.addEventListener('change', (e) => {
            Speech.updateSettings({ enabled: e.target.checked });
        });
    },
    
    async startCamera() {
        try {
            await Camera.start();
            this.elements.startBtn.disabled = true;
            this.elements.stopBtn.disabled = false;
            this.elements.describeBtn.disabled = false;
            
            Speech.speak('Камера запущена. Я начну описывать то, что вижу');
            this.startDetection();
            
        } catch (error) {
            Speech.speak('Не удалось запустить камеру');
        }
    },
    
    stopCamera() {
        Camera.stop();
        this.elements.startBtn.disabled = false;
        this.elements.stopBtn.disabled = true;
        this.elements.describeBtn.disabled = true;
        
        this.stopDetection();
        Speech.speak('Камера остановлена');
    },
    
    startDetection() {
        if (this.detectionInterval) {
            clearInterval(this.detectionInterval);
        }
        
        this.detectionInterval = setInterval(async () => {
            if (!Camera.isRunning()) return;
            
            const detections = await Detection.detect(Camera.videoElement);
            
            // Рисуем рамки
            if (Camera.ctx) {
                Detection.drawDetections(Camera.ctx, detections);
            }
            
            // Обновляем статус
            this.updateStatus(detections);
            
            // Обновляем FPS
            const stats = Detection.getStats();
            if (this.elements.fps) {
                this.elements.fps.textContent = stats.fps;
            }
            
            // Анализируем сцену для озвучивания
            this.analyzeScene(detections);
            
        }, 500);
    },
    
    analyzeScene(detections) {
        if (!Speech.settings.enabled) return;
        
        const now = Date.now();
        const frequency = parseInt(localStorage.getItem('speakFrequency') || '5') * 1000;
        
        // Группируем текущие объекты
        const currentObjects = {};
        detections.forEach(d => {
            currentObjects[d.class] = (currentObjects[d.class] || 0) + 1;
        });
        
        // Находим новые объекты
        const newObjects = [];
        for (const obj in currentObjects) {
            if (!this.sceneMemory.objects[obj]) {
                newObjects.push(obj);
            }
        }
        
        // Находим исчезнувшие объекты
        const goneObjects = [];
        for (const obj in this.sceneMemory.objects) {
            if (!currentObjects[obj]) {
                goneObjects.push(obj);
            }
        }
        
        // Обновляем память
        this.sceneMemory.objects = currentObjects;
        
        // ПРИОРИТЕТ 1: Появление людей (говорим сразу)
        const people = newObjects.filter(obj => obj === 'person');
        if (people.length > 0) {
            Speech.speak('человек', true);
            this.sceneMemory.lastPriorityTime = now;
            this.sceneMemory.lastChangeTime = now;
            return;
        }
        
        // ПРИОРИТЕТ 2: Появление машин
        const cars = newObjects.filter(obj => ['car', 'truck', 'bus'].includes(obj));
        if (cars.length > 0) {
            Speech.speak('машина', true);
            this.sceneMemory.lastPriorityTime = now;
            this.sceneMemory.lastChangeTime = now;
            return;
        }
        
        // ПРИОРИТЕТ 3: Другие новые объекты
        if (newObjects.length > 0 && now - this.sceneMemory.lastChangeTime > 1000) {
            const names = newObjects.map(obj => Utils.translations[obj] || obj);
            if (names.length === 1) {
                Speech.speak(`появился ${names[0]}`);
            } else {
                Speech.speak(`появились ${names.join(', ')}`);
            }
            this.sceneMemory.lastChangeTime = now;
            return;
        }
        
        // ПРИОРИТЕТ 4: Периодическое описание (раз в N секунд)
        if (now - this.sceneMemory.lastSpokenTime > frequency) {
            if (detections.length > 0) {
                const names = detections.map(d => Utils.translations[d.class] || d.class);
                // Убираем дубликаты
                const uniqueNames = [...new Set(names)];
                
                if (uniqueNames.length === 1) {
                    Speech.speak(uniqueNames[0]);
                } else if (uniqueNames.length === 2) {
                    Speech.speak(`${uniqueNames[0]} и ${uniqueNames[1]}`);
                } else {
                    const last = uniqueNames.pop();
                    Speech.speak(`${uniqueNames.join(', ')} и ${last}`);
                }
            } else {
                Speech.speak('Ничего не вижу');
            }
            this.sceneMemory.lastSpokenTime = now;
        }
    },
    
    updateStatus(detections) {
        if (!this.elements.status) return;
        
        if (detections.length === 0) {
            this.elements.status.textContent = '✨ Ничего не вижу';
            return;
        }
        
        const objects = detections
            .map(d => `${Utils.translations[d.class] || d.class} (${Math.round(d.score * 100)}%)`)
            .join(', ');
        
        this.elements.status.textContent = '🔍 ' + objects;
    },
    
    describeScene() {
        Speech.speak('Осматриваюсь...');
        
        setTimeout(async () => {
            if (!Camera.isRunning()) return;
            
            const detections = await Detection.detect(Camera.videoElement);
            
            if (detections.length === 0) {
                Speech.speak('Ничего не вижу');
                return;
            }
            
            const names = detections.map(d => Utils.translations[d.class] || d.class);
            const uniqueNames = [...new Set(names)];
            
            if (uniqueNames.length === 1) {
                Speech.speak(uniqueNames[0]);
            } else {
                const last = uniqueNames.pop();
                Speech.speak(`${uniqueNames.join(', ')} и ${last}`);
            }
            
        }, 500);
    },
    
    toggleSettings() {
        if (this.elements.settingsPanel) {
            this.elements.settingsPanel.classList.toggle('hidden');
        }
    },
    
    loadSettings() {
        const saved = Utils.loadSettings();
        if (saved?.speech) {
            this.elements.volume.value = saved.speech.volume || 1;
            this.elements.soundEnabled.checked = saved.speech.enabled !== false;
        }
        
        if (saved?.detection) {
            this.elements.confidence.value = saved.detection.confidence || 0.4;
        }
    },
    
    stopDetection() {
        if (this.detectionInterval) {
            clearInterval(this.detectionInterval);
            this.detectionInterval = null;
        }
    }
};

window.addEventListener('load', () => App.init());
