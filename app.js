const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// UI elements
const fileInput = document.getElementById('fileInput');
const dropOverlay = document.getElementById('dropOverlay');
const dotSizeEl = document.getElementById('dotSize');
const dotSizeValueEl = document.getElementById('dotSizeValue');
const densityEl = document.getElementById('density');
const densityValueEl = document.getElementById('densityValue');
const animationStyleEl = document.getElementById('animationStyle');
const hoverEffectEl = document.getElementById('hoverEffect');
const backgroundColorEl = document.getElementById('backgroundColor');
const resetBtn = document.getElementById('resetBtn');
const downloadBtn = document.getElementById('downloadBtn');
const downloadJsonBtn = document.getElementById('downloadJsonBtn');
const downloadZipBtn = document.getElementById('downloadZipBtn');

// Download dropdown functionality
const downloadDropdownBtn = document.getElementById('downloadDropdownBtn');
const downloadDropdown = document.getElementById('downloadDropdown');

// State
let particles = [];
let imageBitmap = null;
let offscreenCanvas = document.createElement('canvas');
let offscreenCtx = offscreenCanvas.getContext('2d');
let lastFrameTime = 0;
let animationId = null;
let isPointerInside = false;
let pointer = { x: 0, y: 0 };

// Config
const config = {
  dotSize: Number(dotSizeEl.value),
  density: Number(densityEl.value),
  animationStyle: animationStyleEl.value,
  hoverEffect: hoverEffectEl.value,
  backgroundColor: backgroundColorEl.value,
  maxCanvasWidth: 1920,
  maxCanvasHeight: 1080,
  hoverRadius: 150,
  repelForce: 520,
  attractForce: -360,
};

// Particle structure
class Particle {
  constructor(x, y, color) {
    this.homeX = x;
    this.homeY = y;
    this.x = x + (Math.random() - 0.5) * 0.5;
    this.y = y + (Math.random() - 0.5) * 0.5;
    this.vx = 0;
    this.vy = 0;
    this.color = color;
    this.opacity = 1;
    this.sizeScale = 1;
    this.twinklePhase = Math.random() * Math.PI * 2;
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function hexToRgba(hex, alpha = 1) {
  const shorthand = /^#([a-f\d])([a-f\d])([a-f\d])$/i;
  const normalized = hex.replace(shorthand, (m, r, g, b) => r + r + g + g + b + b);
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(normalized);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
        a: alpha,
      }
    : { r: 255, g: 255, b: 255, a: alpha };
}

function rgbaToString({ r, g, b, a }) {
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function resizeCanvasToDisplaySize() {
  const stage = document.querySelector('.stage');
  const rect = stage.getBoundingClientRect();
  const width = Math.min(config.maxCanvasWidth, Math.floor(rect.width));
  const height = Math.min(config.maxCanvasHeight, Math.floor(rect.height));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
    if (imageBitmap) {
      buildParticlesFromImage();
    }
  }
}

function drawBackground() {
  ctx.fillStyle = config.backgroundColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

async function handleFile(file) {
  if (!file) return;
  try {
    const bmp = await createImageBitmap(file);
    imageBitmap = bmp;
    buildParticlesFromImage();
    dropOverlay.hidden = true;
  } catch (err) {
    console.error('Failed to load image', err);
  }
}

function buildParticlesFromImage() {
  if (!imageBitmap) return;

  // Fit image inside canvas while maintaining aspect ratio
  const canvasW = canvas.width;
  const canvasH = canvas.height;
  const scale = Math.min(canvasW / imageBitmap.width, canvasH / imageBitmap.height);
  const targetW = Math.max(1, Math.floor(imageBitmap.width * scale));
  const targetH = Math.max(1, Math.floor(imageBitmap.height * scale));
  const offsetX = Math.floor((canvasW - targetW) / 2);
  const offsetY = Math.floor((canvasH - targetH) / 2);

  // Draw to offscreen to sample pixels
  offscreenCanvas.width = targetW;
  offscreenCanvas.height = targetH;
  offscreenCtx.clearRect(0, 0, targetW, targetH);
  offscreenCtx.drawImage(imageBitmap, 0, 0, targetW, targetH);

  const step = clamp(config.density, 2, 64);
  const imageData = offscreenCtx.getImageData(0, 0, targetW, targetH).data;

  const newParticles = [];
  for (let y = 0; y < targetH; y += step) {
    for (let x = 0; x < targetW; x += step) {
      const idx = (y * targetW + x) * 4;
      const r = imageData[idx];
      const g = imageData[idx + 1];
      const b = imageData[idx + 2];
      const a = imageData[idx + 3];

      if (a < 16) continue;

      const canvasX = offsetX + x + step / 2;
      const canvasY = offsetY + y + step / 2;
      const color = { r, g, b, a: 1 };

      newParticles.push(new Particle(canvasX, canvasY, color));
    }
  }

  particles = newParticles;
}

function update(dt) {
  const hoverEffect = config.hoverEffect;
  const animStyle = config.animationStyle;

  for (const p of particles) {
    const toHomeX = p.homeX - p.x;
    const toHomeY = p.homeY - p.y;
    const springStrength = 7.5;
    p.vx += toHomeX * springStrength * dt;
    p.vy += toHomeY * springStrength * dt;

    const damping = 9.0;
    p.vx *= Math.exp(-damping * dt);
    p.vy *= Math.exp(-damping * dt);

    if (isPointerInside && (hoverEffect === 'repel' || hoverEffect === 'attract')) {
      const dx = p.x - pointer.x;
      const dy = p.y - pointer.y;
      const distSq = dx * dx + dy * dy;
      const radius = config.hoverRadius;
      const radiusSq = radius * radius;
      if (distSq < radiusSq) {
        const dist = Math.sqrt(distSq) + 0.0001;
        const dirX = dx / dist;
        const dirY = dy / dist;
        const intensity = (1 - dist / radius);
        const force = (hoverEffect === 'repel' ? config.repelForce : config.attractForce) * intensity;
        p.vx += dirX * force * dt;
        p.vy += dirY * force * dt;
      }
    }

    p.x += p.vx * dt;
    p.y += p.vy * dt;

    // Animation styles
    if (animStyle === 'pulse') {
      p.sizeScale = 0.9 + Math.sin((p.homeX + p.homeY) * 0.01 + performance.now() * 0.002) * 0.1;
      p.opacity = 1;
    } else if (animStyle === 'float') {
      p.sizeScale = 1;
      p.y += Math.sin((p.homeX * 0.02) + performance.now() * 0.0015) * 0.08;
      p.opacity = 1;
    } else if (animStyle === 'twinkle') {
      p.twinklePhase += dt * 6;
      p.opacity = 0.6 + Math.sin(p.twinklePhase) * 0.4;
    } else {
      p.sizeScale = 1;
      p.opacity = 1;
    }

    if (isPointerInside && hoverEffect === 'fade' && animStyle !== 'twinkle') {
      const dx = p.x - pointer.x;
      const dy = p.y - pointer.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      const radius = config.hoverRadius;
      const t = clamp(d / radius, 0, 1);
      const targetOpacity = 0.15 + t * 0.85;
      p.opacity = targetOpacity;
    }

    p.x = clamp(p.x, -50, canvas.width + 50);
    p.y = clamp(p.y, -50, canvas.height + 50);
  }
}

function draw() {
  drawBackground();

  const size = clamp(config.dotSize, 1, 20);

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const p of particles) {
    const rgba = { ...p.color, a: clamp(p.opacity, 0, 1) };
    ctx.fillStyle = rgbaToString(rgba);
    const s = size * p.sizeScale;
    ctx.beginPath();
    ctx.arc(p.x, p.y, s, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function loop(timestamp) {
  if (!lastFrameTime) lastFrameTime = timestamp;
  const dt = Math.min(0.033, (timestamp - lastFrameTime) / 1000);
  lastFrameTime = timestamp;

  update(dt);
  draw();

  animationId = requestAnimationFrame(loop);
}

function start() {
  cancelAnimationFrame(animationId);
  lastFrameTime = 0;
  animationId = requestAnimationFrame(loop);
}

function reset() {
  particles = [];
  imageBitmap = null;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBackground();
}

// Event listeners
window.addEventListener('resize', () => {
  resizeCanvasToDisplaySize();
});

// File input
fileInput.addEventListener('change', (e) => {
  const file = e.target.files && e.target.files[0];
  dropOverlay.hidden = true;
  handleFile(file);
});

// Drag and drop: only show overlay for real file drags
function isFilesDragEvent(e) {
  const types = (e.dataTransfer && e.dataTransfer.types) || [];
  return Array.from(types).indexOf ? Array.from(types).indexOf('Files') !== -1 : Array.from(types).includes('Files');
}

['dragenter', 'dragover'].forEach((type) => {
  window.addEventListener(type, (e) => {
    e.preventDefault();
    if (isFilesDragEvent(e)) {
      dropOverlay.hidden = false;
    }
  });
});

['dragleave', 'drop', 'dragend'].forEach((type) => {
  window.addEventListener(type, (e) => {
    e.preventDefault();
    if (type === 'drop') {
      const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      handleFile(file);
    }
    dropOverlay.hidden = true;
  });
});

// Controls
function updateConfigFromUI() {
  config.dotSize = Number(dotSizeEl.value);
  dotSizeValueEl.textContent = String(config.dotSize);

  config.density = Number(densityEl.value);
  densityValueEl.textContent = String(config.density);

  config.animationStyle = animationStyleEl.value;
  config.hoverEffect = hoverEffectEl.value;
  config.backgroundColor = backgroundColorEl.value;

  if (imageBitmap) {
    if (updateConfigFromUI._lastDensity !== config.density) {
      buildParticlesFromImage();
    }
  }

  updateConfigFromUI._lastDensity = config.density;
}

['input', 'change'].forEach((ev) => {
  dotSizeEl.addEventListener(ev, updateConfigFromUI);
  densityEl.addEventListener(ev, updateConfigFromUI);
  animationStyleEl.addEventListener(ev, updateConfigFromUI);
  hoverEffectEl.addEventListener(ev, updateConfigFromUI);
  backgroundColorEl.addEventListener(ev, updateConfigFromUI);
});

// Pointer
function updatePointerFromEvent(e) {
  const rect = canvas.getBoundingClientRect();
  pointer.x = (e.clientX - rect.left) * (canvas.width / rect.width);
  pointer.y = (e.clientY - rect.top) * (canvas.height / rect.height);
}

canvas.addEventListener('pointerenter', (e) => {
  isPointerInside = true;
  dropOverlay.hidden = true;
  updatePointerFromEvent(e);
});
canvas.addEventListener('pointerleave', (e) => {
  isPointerInside = false;
});
canvas.addEventListener('pointermove', (e) => {
  isPointerInside = true;
  dropOverlay.hidden = true;
  updatePointerFromEvent(e);
});

// Buttons
resetBtn.addEventListener('click', () => {
  reset();
});

// Download dropdown functionality
downloadDropdownBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  downloadDropdown.classList.toggle('open');
  downloadDropdownBtn.classList.toggle('open');
});

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
  if (!downloadDropdown.contains(e.target) && !downloadDropdownBtn.contains(e.target)) {
    downloadDropdown.classList.remove('open');
    downloadDropdownBtn.classList.remove('open');
  }
});

// Download PNG
downloadBtn.addEventListener('click', () => {
  const link = document.createElement('a');
  link.download = 'dots.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
  downloadDropdown.classList.remove('open');
  downloadDropdownBtn.classList.remove('open');
});

// Download JSON (portable data)
downloadJsonBtn.addEventListener('click', () => {
  const size = clamp(config.dotSize, 1, 20);
  const exportData = {
    canvas: { width: canvas.width, height: canvas.height, backgroundColor: config.backgroundColor },
    config: {
      dotSize: size,
      density: config.density,
      animationStyle: config.animationStyle,
      hoverEffect: config.hoverEffect,
    },
    particles: particles.map((p) => ({
      x: Number(p.homeX.toFixed(2)),
      y: Number(p.homeY.toFixed(2)),
      r: Number(size.toFixed(2)),
      color: { r: p.color.r, g: p.color.g, b: p.color.b, a: 1 },
    })),
  };

  const json = JSON.stringify(exportData);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'dots.json';
  a.click();
  URL.revokeObjectURL(url);
  downloadDropdown.classList.remove('open');
  downloadDropdownBtn.classList.remove('open');
});

// Download ZIP (json + player + readme)
downloadZipBtn.addEventListener('click', async () => {
  const size = clamp(config.dotSize, 1, 20);
  const exportData = {
    canvas: { width: canvas.width, height: canvas.height, backgroundColor: config.backgroundColor },
    config: {
      dotSize: size,
      density: config.density,
      animationStyle: config.animationStyle,
      hoverEffect: config.hoverEffect,
    },
    particles: particles.map((p) => ({
      x: Number(p.homeX.toFixed(2)),
      y: Number(p.homeY.toFixed(2)),
      r: Number(size.toFixed(2)),
      color: { r: p.color.r, g: p.color.g, b: p.color.b, a: 1 },
    })),
  };
  const json = JSON.stringify(exportData, null, 2);

  const playerJs = `// Minimal player for dots.json
(function(){
  async function init(canvasId, jsonUrl){
    const res = await fetch(jsonUrl);
    const data = await res.json();
    const canvas = document.getElementById(canvasId);
    const ctx = canvas.getContext('2d');
    canvas.width = data.canvas.width;
    canvas.height = data.canvas.height;
    const cfg = {
      dotSize: data.config.dotSize,
      animationStyle: data.config.animationStyle,
      hoverEffect: data.config.hoverEffect,
      bg: data.canvas.backgroundColor,
      hoverRadius: 150, repelForce: 520, attractForce: -360,
    };
    const particles = data.particles.map(p => ({
      homeX: p.x, homeY: p.y, x: p.x, y: p.y, vx:0, vy:0,
      color: p.color, opacity: 1, sizeScale: 1, twinklePhase: Math.random()*Math.PI*2
    }));
    let pointer={x:0,y:0}, inside=false, last=0;
    function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
    function update(dt){
      for(const p of particles){
        const sx=p.homeX-p.x, sy=p.homeY-p.y; p.vx+=sx*7.5*dt; p.vy+=sy*7.5*dt;
        p.vx*=Math.exp(-9*dt); p.vy*=Math.exp(-9*dt);
        if(inside && (cfg.hoverEffect==='repel'||cfg.hoverEffect==='attract')){
          const dx=p.x-pointer.x, dy=p.y-pointer.y; const d2=dx*dx+dy*dy; const r=cfg.hoverRadius;
          if(d2<r*r){ const d=Math.sqrt(d2)+1e-4; const ix=dx/d, iy=dy/d; const t=1-d/r;
            const f=(cfg.hoverEffect==='repel'?cfg.repelForce:cfg.attractForce)*t; p.vx+=ix*f*dt; p.vy+=iy*f*dt; }
        }
        p.x+=p.vx*dt; p.y+=p.vy*dt;
        if(cfg.animationStyle==='pulse'){ p.sizeScale=0.9+Math.sin((p.homeX+p.homeY)*0.01+performance.now()*0.002)*0.1; p.opacity=1; }
        else if(cfg.animationStyle==='float'){ p.sizeScale=1; p.y+=Math.sin((p.homeX*0.02)+performance.now()*0.0015)*0.08; p.opacity=1; }
        else if(cfg.animationStyle==='twinkle'){ p.twinklePhase+=dt*6; p.opacity=0.6+Math.sin(p.twinklePhase)*0.4; }
        else { p.sizeScale=1; p.opacity=1; }
        if(inside && cfg.hoverEffect==='fade' && cfg.animationStyle!=='twinkle'){
          const dx=p.x-pointer.x, dy=p.y-pointer.y; const d=Math.sqrt(dx*dx+dy*dy); const t=clamp(d/cfg.hoverRadius,0,1); p.opacity=0.15+t*0.85;
        }
      }
    }
    function draw(){
      ctx.fillStyle=cfg.bg; ctx.fillRect(0,0,canvas.width,canvas.height);
      ctx.save(); ctx.globalCompositeOperation='lighter';
      for(const p of particles){ const s=cfg.dotSize*p.sizeScale; ctx.fillStyle=\`rgba(\${p.color.r},\${p.color.g},\${p.color.b},\${p.opacity})\`; ctx.beginPath(); ctx.arc(p.x,p.y,s,0,Math.PI*2); ctx.fill(); }
      ctx.restore();
    }
    function loop(t){ if(!last) last=t; const dt=Math.min(0.033,(t-last)/1000); last=t; update(dt); draw(); requestAnimationFrame(loop);} requestAnimationFrame(loop);
    canvas.addEventListener('pointerenter',e=>{inside=true; const r=canvas.getBoundingClientRect(); pointer.x=(e.clientX-r.left)*(canvas.width/r.width); pointer.y=(e.clientY-r.top)*(canvas.height/r.height);});
    canvas.addEventListener('pointerleave',()=>{inside=false;});
    canvas.addEventListener('pointermove',e=>{inside=true; const r=canvas.getBoundingClientRect(); pointer.x=(e.clientX-r.left)*(canvas.width/r.width); pointer.y=(e.clientY-r.top)*(canvas.height/r.height);});
  }
  window.DotsPlayer = { init };
})();`;

  const readme = `# Animated Dots Export

This ZIP contains:

- dots.json — the dot field data (positions, colors, sizes)
- player.js — a small player to render and animate the dots with hover effects

## How to use

1. Put "dots.json" and "player.js" on your website (same folder as your page).
2. Add a canvas and include the player script in your HTML:

<canvas id="myDots" width="1280" height="800"></canvas>
<script src="player.js"></script>
<script>
  DotsPlayer.init('myDots', './dots.json');
</script>

3. Open the page. Move the mouse over the canvas to see hover effects.

Notes:
- If loading from a local file without a server, your browser may block fetch. Run a local server (e.g., VSCode Live Server or npx serve).
- You can edit dots.json (colors, dotSize, etc.) to tweak the look.`;

  const zip = new JSZip();
  zip.file('dots.json', json);
  zip.file('player.js', playerJs);
  zip.file('README.md', readme);

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'animated-dots.zip';
  a.click();
  URL.revokeObjectURL(url);
  downloadDropdown.classList.remove('open');
  downloadDropdownBtn.classList.remove('open');
});

// Init
resizeCanvasToDisplaySize();
updateConfigFromUI();
start();
