#ifdef GL_ES
precision mediump float;
#endif


varying vec2 vTexCoord;

uniform sampler2D uTexture;
uniform vec2 uResolution;
uniform float uPixels;

void main ()
{
    vec2 uv = vTexCoord;
    uv.y = 1.0 - uv.y;

    // pixelation
    float dx = 1.0 / uPixels;
    float dy = uResolution.x / uResolution.y * (1.0 / uPixels);
    vec2 pixelatedUV = vec2(dx * floor(uv.x / dx), dy * floor(uv.y / dy));

    vec3 col = texture2D(uTexture, pixelatedUV).xyz;

    gl_FragColor = vec4(col, 1.0);
}