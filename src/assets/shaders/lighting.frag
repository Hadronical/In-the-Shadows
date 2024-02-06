#ifdef GL_ES
precision highp float;
#endif

float sq (float x)
{
    return x * x;
}

vec3 vec3one = vec3(1.0);

varying vec2 vTexCoord;

uniform vec2 uResolution;

uniform sampler2D buffer_main;
uniform sampler2D buffer_geometry;
uniform sampler2D buffer_shadow;
uniform sampler2D buffer_light;

uniform vec2 light_pos;
uniform vec3 light_color;
uniform float light_intensity;
uniform float light_falloff;

float lightDistribution (float d, float disp, float falloff)
{
    float x = falloff * (d - disp);
    return 0.75 * light_intensity / (1.0 + x*x);
}
float getLightIntensity (float d)
{
    float intensity = 0.0;
    intensity += lightDistribution(d, -0.5, light_falloff);
    return intensity;
}

void main ()
{
    vec2 uv = vTexCoord;
    uv.y = 1.0 - uv.y;

    vec3 scr = texture2D(buffer_main, uv).xyz;
    vec3 col = texture2D(buffer_shadow, uv).xyz;
    vec4 geo = texture2D(buffer_geometry, uv);
    float illuminated = ceil(texture2D(buffer_light, uv).x);

    float geoCol = length(geo);
    bool geoBlue = geo.z > 0.0;

    vec2 posUV = vec2(uv.x * uResolution.x, uv.y * uResolution.y);

    // calculate intensity falloff
    vec2 dir = vec2(light_pos - posUV);
    float intensity = getLightIntensity(length(dir));
    
    if (geoCol > 0.0 && geoBlue)
    {
        // partially light directly visible geometry
        col -= 1.0/255.0;
    }

    // digitize to either 1.0 or 0.0
    col = vec3(ceil(length(col) - 1.0/255.0));
    
    // invert shadows to draw light
    col = -col + 1.0;

    col *= intensity * light_color;
    col *= illuminated;
    col *= scr;

    gl_FragColor = vec4(col, 1.0);
}