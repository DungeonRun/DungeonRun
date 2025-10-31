export class SoundManager {
    constructor() {
        this.currentMusic = null;
        this.isMuted = false;
        this.musicVolume = parseFloat(localStorage.getItem('musicVolume')) || 0.5;
    }

    playLevelMusic(musicPath, fadeInDuration = 2000) {
        // Stop current music first
        this.stopCurrentMusic();

        // Create and play new music
        const music = new Audio(musicPath);
        music.loop = true;
        music.volume = 0; // Start at 0 for fade in
        
        this.currentMusic = music;

        music.play().then(() => {
            // Fade in
            const fadeIn = setInterval(() => {
                if (music.volume < this.musicVolume) {
                    music.volume = Math.min(this.musicVolume, music.volume + 0.02);
                } else {
                    clearInterval(fadeIn);
                }
            }, fadeInDuration / 100);
        }).catch(err => {
            console.warn('Audio play failed - user interaction required:', err);
        });

        return music;
    }

    stopCurrentMusic(fadeOutDuration = 1000) {
        if (this.currentMusic) {
            const music = this.currentMusic;
            
            // Fade out
            const fadeOut = setInterval(() => {
                if (music.volume > 0.1) {
                    music.volume = Math.max(0, music.volume - 0.05);
                } else {
                    clearInterval(fadeOut);
                    music.pause();
                    music.currentTime = 0;
                    music.volume = 0;
                    
                    // Only nullify if it's still the same music instance
                    if (this.currentMusic === music) {
                        this.currentMusic = null;
                    }
                }
            }, fadeOutDuration / 20);
        }
    }

    setVolume(volume) {
        this.musicVolume = volume;
        if (this.currentMusic) {
            this.currentMusic.volume = volume;
        }
        localStorage.setItem('musicVolume', volume.toString());
    }

    muteAll() {
        this.isMuted = true;
        if (this.currentMusic) {
            this.currentMusic.volume = 0;
        }
    }

    unmuteAll() {
        this.isMuted = false;
        if (this.currentMusic) {
            this.currentMusic.volume = this.musicVolume;
        }
    }
}

// Singleton instance
export const soundManager = new SoundManager();