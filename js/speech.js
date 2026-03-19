const Speech = {
    
    settings: {
        enabled: true,
        volume: 1,
        rate: 0.85,        
        pitch: 1.3         
    },

    speak: function(text) {
        if (!this.settings.enabled) {
            console.log('🔇 Звук отключен');
            return;
        }

        if (!window.speechSynthesis) {
            console.error('❌ Синтез речи не поддерживается');
            return;
        }

        try {
            console.log('🔊 Говорю:', text);
            
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'ru-RU';
            utterance.volume = this.settings.volume;
            utterance.rate = this.settings.rate;   
            utterance.pitch = this.settings.pitch;   
            
            const voices = window.speechSynthesis.getVoices();
            const femaleVoice = voices.find(v => 
                (v.lang.includes('ru') || v.lang.includes('RU')) && 
                (v.name.includes('Milena') || 
                 v.name.includes('Alena') || 
                 v.name.includes('Tatyana') ||
                 v.name.includes('female') ||
                 v.name.includes('женский'))
            );
            
            if (femaleVoice) {
                utterance.voice = femaleVoice;
                console.log('🎤 Выбран голос:', femaleVoice.name);
            }
            
            window.speechSynthesis.speak(utterance);
            
        } catch (error) {
            console.error('❌ Ошибка:', error);
        }
    },


    test: function() {
        this.speak('Привет. Я Guide Me, ваш голосовой помощник. Приятно познакомится!');
    },


    warn: function(text) {
        this.speak('Осторожно, ' + text);
    },

    
    stop: function() {
        if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
    },

    
    updateSettings: function(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        console.log('⚙️ Настройки обновлены:', this.settings);
    }
};

window.Speech = Speech;
console.log('✅ GuideMe: Speech module загружен!');
