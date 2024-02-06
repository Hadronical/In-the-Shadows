class TextureContainer
{
    constructor (img, resX,resY)
    {
        this.image = img;
        this.offX = -resX/2;
        this.offY = -resY/2;

        this.resX = resX;
        this.resY = resY;
    }

    display ()
    {
        if (this.image == null) { console.error("texture container has no image!"); return; }

        MAIN.image(
            this.image,
            this.offX, this.offY,
            this.resX, this.resY
        );
    }
}

class SpriteAnimator extends TextureContainer
{
    constructor (sprites, t, resX,resY)
    {
        super(sprites[0], resX,resY);

        this.frames = sprites;
        this.frameCount = this.frames.length;
        this.duration = t;

        if (this.duration <= 0) { this.isPlaying = false; }

        this.timePerFrame = round(this.duration / this.frameCount * 1000);

        this.isPlaying = true;
        this.frame = 0;
        this.timeSinceLastFrame = 0;
    }

    play()
    {
        this.isPlaying = (this.duration > 0);
    }
    pause ()
    {
        this.isPlaying = false;
    }

    stepFrame ()
    {
        this.setFrame(this.frame + 1);
    }
    setFrame (frame)
    {
        while (frame < 0) {
            frame += this.frameCount;
        }

        this.frame = frame % this.frameCount;
        this.image = this.frames[this.frame];

        this.timeSinceLastFrame = 0;
    }

    update ()
    {
        this.display();

        if (this.isPlaying == false) { return; }

        this.timeSinceLastFrame += TIME_dT_MS;

        if (this.timeSinceLastFrame > this.timePerFrame)
        {
            this.stepFrame();
        }
    }
}