class RandomSound {
    constructor(files) {
        this.sounds = [];
        for (let i = 0; i < files.length; i++)
            this.addSound(...Object.values(files[i]));
    }

    addSound(file, volume, pool=false, numpool=0) {
        let sound = null;
        if (!pool)
            sound = new Audio(file);
        else
            sound = new PoolAudio(file, numpool);
        sound.volume = volume;
        this.sounds.push(sound);
        console.log(this.sounds)
    }

    play() {
        this.sounds[Math.floor(Math.random()*this.sounds.length)].play();
    }
}

class PoolAudio {
    constructor(file, numPool) {
        this.pool = [];
        for (let i = 0; i < numPool; i++)
            this.pool.push(new Audio(file));
        this.id = 0;
    }

    set volume(newValue) {
        this.pool.forEach(audio => audio.volume = newValue);
    }

    play() {
        this.pool[this.id].play();
        this.id += 1;
        this.id = this.id % this.pool.length;
    }
}