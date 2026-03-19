const Utils = {
    translations: {
        'person': 'человек',
        'car': 'машина',
        'truck': 'грузовик',
        'bus': 'автобус',
        'motorcycle': 'мотоцикл',
        'bicycle': 'велосипед',
        'stop sign': 'знак стоп',
        'traffic light': 'светофор',
        'fire hydrant': 'пожарный гидрант',
        'bench': 'скамейка',
        'dog': 'собака',
        'cat': 'кошка',
        'bird': 'птица',
        'bottle': 'бутылка',
        'cup': 'чашка',
        'cell phone': 'телефон',
        'book': 'книга',
        'chair': 'стул',
        'couch': 'диван',
        'bed': 'кровать',
        'backpack': 'рюкзак',
        'umbrella': 'зонт',
        'handbag': 'сумка',
        'tv': 'телевизор',
        'laptop': 'ноутбук',
        'keyboard': 'клавиатура',
        'mouse': 'мышь',
        'remote': 'пульт',
        'microwave': 'микроволновка',
        'oven': 'духовка',
        'sink': 'раковина',
        'refrigerator': 'холодильник',
        'clock': 'часы',
        'vase': 'ваза',
        'scissors': 'ножницы',
        'teddy bear': 'плюшевый мишка',
        'toothbrush': 'зубная щетка',
        'potted plant': 'растение в горшке',
        'dining table': 'обеденный стол',
        'toilet': 'унитаз',
        'sports ball': 'мяч',
        'skateboard': 'скейтборд',
        'surfboard': 'серф'
    },

    priorityClasses: [
        'person', 'car', 'truck', 'bus', 'motorcycle', 'bicycle',
        'stop sign', 'traffic light', 'dog', 'cat'
    ],

    formatTime(date = new Date()) {
        return date.toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    },

    groupDetections(predictions) {
        const groups = {};
        predictions.forEach(p => {
            const className = p.class;
            if (!groups[className]) {
                groups[className] = {
                    count: 1,
                    maxScore: p.score
                };
            } else {
                groups[className].count++;
                groups[className].maxScore = Math.max(groups[className].maxScore, p.score);
            }
        });
        return groups;
    },

    createDescription(groups) {
        const parts = [];
        for (const [className, data] of Object.entries(groups)) {
            const rusName = this.translations[className] || className;
            if (data.count > 1) {
                parts.push(`${data.count} ${rusName}`);
            } else {
                parts.push(rusName);
            }
        }
        return parts.join(', ');
    },

    checkBrowserSupport() {
        const issues = [];
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            issues.push('Камера не поддерживается');
        }
        if (!window.speechSynthesis) {
            issues.push('Синтез речи не поддерживается');
        }
        return {
            supported: issues.length === 0,
            issues: issues
        };
    },

    saveSettings(settings) {
        try {
            localStorage.setItem('alphaVision_settings', JSON.stringify(settings));
            return true;
        } catch (e) {
            return false;
        }
    },

    loadSettings() {
        try {
            const saved = localStorage.getItem('alphaVision_settings');
            return saved ? JSON.parse(saved) : null;
        } catch (e) {
            return null;
        }
    }
};

window.Utils = Utils;
