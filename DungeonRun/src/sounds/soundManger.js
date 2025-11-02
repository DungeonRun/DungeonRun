export class SoundManager {
    constructor() {
        this.currentMusic = null;
        this.isMuted = false;
        this.musicVolume = parseFloat(localStorage.getItem('musicVolume')) || 0.3; // Lower default music volume
        this.sfxVolume = parseFloat(localStorage.getItem('sfxVolume')) || 0.8; // Higher default for sound effects
        this.activeSounds = new Set(); // Track active sound effects
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

    /**
     * Play a sound effect (non-looping, higher volume than music)
     * @param {string} soundPath - Path to the sound file
     * @param {Object} options - Sound options
     * @param {number} options.volume - Volume multiplier (0.0 to 1.0), defaults to sfxVolume
     * @param {boolean} options.spatial - Whether to use 3D spatial audio (not implemented in basic version)
     */
    playSound(soundPath, options = {}) {
        const {
            volume = 1.0,
            spatial = false
        } = options;

        try {
            const sound = new Audio(soundPath);
            sound.volume = Math.min(1.0, this.sfxVolume * volume);
            
            // Track the sound
            this.activeSounds.add(sound);
            
            // Remove from tracking when finished
            sound.addEventListener('ended', () => {
                this.activeSounds.delete(sound);
            });

            // Play the sound
            sound.play().catch(err => {
                console.warn('Sound effect play failed:', err);
                this.activeSounds.delete(sound);
            });

            return sound;
        } catch (err) {
            console.warn('Error creating sound:', err);
            return null;
        }
    }

    setMusicVolume(volume) {
        this.musicVolume = Math.max(0, Math.min(1, volume));
        if (this.currentMusic) {
            this.currentMusic.volume = this.musicVolume;
        }
        localStorage.setItem('musicVolume', this.musicVolume.toString());
    }

    setSfxVolume(volume) {
        this.sfxVolume = Math.max(0, Math.min(1, volume));
        localStorage.setItem('sfxVolume', this.sfxVolume.toString());
    }

    muteAll() {
        this.isMuted = true;
        if (this.currentMusic) {
            this.currentMusic.volume = 0;
        }
        // Mute all active sound effects
        this.activeSounds.forEach(sound => {
            sound.volume = 0;
        });
    }

    unmuteAll() {
        this.isMuted = false;
        if (this.currentMusic) {
            this.currentMusic.volume = this.musicVolume;
        }
        // Note: Active sounds will still be at 0 volume, but new sounds will play at correct volume
    }

    // Clean up all sounds (useful when changing levels)
    stopAllSounds() {
        this.activeSounds.forEach(sound => {
            try {
                sound.pause();
                sound.currentTime = 0;
            } catch (e) {
                // Ignore errors
            }
        });
        this.activeSounds.clear();
    }
}

// Singleton instance
export const soundManager = new SoundManager();