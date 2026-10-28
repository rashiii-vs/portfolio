/**
 * 3D Oracle Red Bull Racing F1 Car Scene (Three.js WebGL)
 * Exactly matched to the user's reference image:
 * - Midnight navy gloss livery (#07112c)
 * - Yellow nose cone tip & yellow airbox intake
 * - Authentic bold white ORACLE sidepod graphics & Red Bull charging bull
 * - Mobil 1 rear wing endplates & Heineken 0.0 badges
 * - Pirelli P Zero tyres with Electric Blue stripes
 * - 360° cursor drag rotation, angle presets (including exact side profile),
 *   downforce HUD telemetry, and smooth launch to Page 3.
 */

class RB22CarViewer {
  constructor() {
    this.canvas = document.getElementById('rb22-threejs-canvas');
    this.container = document.getElementById('rb22-canvas-container');
    this.angleDisplay = document.getElementById('car-rot-deg');
    this.downforceDisplay = document.getElementById('car-downforce');
    this.tempDisplay = document.getElementById('car-tyre-temp');
    this.launchBtn = document.getElementById('rb22-launch-trigger');

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.carGroup = null;
    this.wheels = [];
    this.rainLed = null;
    this.exhaustParticles = null;

    // Interaction state
    this.isDragging = false;
    this.previousMousePosition = { x: 0, y: 0 };
    // Start at side profile matching user photo
    this.carRotation = { y: -Math.PI / 2, x: 0.05 }; 
    this.targetRotation = { y: -Math.PI / 2, x: 0.05 };
    this.totalDragAngle = 0;
    this.isTransitioning = false;

    this.init();
  }

  init() {
    if (!this.canvas || !this.container) return;

    // 1. Scene & Camera
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x060814, 0.025);

    const width = this.container.clientWidth || 800;
    const height = this.container.clientHeight || 380;
    this.camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    this.camera.position.set(0, 1.8, 8.5);
    this.camera.lookAt(0, 0.3, 0);

    // 2. Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.4;
    this.renderer.shadowMap.enabled = true;

    // 3. Lighting (Clean high-contrast studio lights for F1 livery)
    this.setupLighting();

    // 4. Build Exact 3D Model
    this.buildExactRBModel();

    // 5. Environment & Ground
    this.setupEnvironment();

    // 6. Event Listeners
    this.setupEventListeners();

    // 7. Animation Loop
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  setupLighting() {
    // Ambient light
    const ambient = new THREE.AmbientLight(0x0a1428, 2.2);
    this.scene.add(ambient);

    // Overhead Key spotlight
    const keyLight = new THREE.DirectionalLight(0xffffff, 3.2);
    keyLight.position.set(0, 10, 6);
    keyLight.castShadow = true;
    this.scene.add(keyLight);

    // Side livery highlight light
    const sideLight = new THREE.DirectionalLight(0xffffff, 2.0);
    sideLight.position.set(8, 2, 0);
    this.scene.add(sideLight);

    const sideLightLeft = new THREE.DirectionalLight(0xffffff, 2.0);
    sideLightLeft.position.set(-8, 2, 0);
    this.scene.add(sideLightLeft);

    // Accent rim lights
    const yellowRim = new THREE.PointLight(0xffc906, 2.5, 15);
    yellowRim.position.set(-4, 3, -3);
    this.scene.add(yellowRim);

    const blueRim = new THREE.PointLight(0x0088ff, 2.0, 15);
    blueRim.position.set(4, 2, -3);
    this.scene.add(blueRim);
  }

  // Generate procedural canvas texture for the sidepod with ORACLE & Red Bull
  createSidepodTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    // Midnight navy base
    ctx.fillStyle = '#060f29';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subtle carbon grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 16) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }

    // Bold ORACLE text in white
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 90px "Orbitron", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ORACLE', 512, 140);

    // Red Bull script on top
    ctx.fillStyle = '#e10600';
    ctx.font = 'bold 36px "Rajdhani", sans-serif';
    ctx.fillText('Red Bull', 512, 50);

    // Sponsor badges
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '600 20px "Orbitron", sans-serif';
    ctx.fillText('CARLYLE   •   1Password   •   ROKT', 512, 215);

    const texture = new THREE.CanvasTexture(canvas);
    texture.anisotropy = 8;
    return texture;
  }

  // Generate procedural texture for shark fin with Red Bull bull & yellow sun
  createFinTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#060f29';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Yellow sun circle
    ctx.fillStyle = '#ffc906';
    ctx.beginPath();
    ctx.arc(280, 120, 60, 0, Math.PI * 2);
    ctx.fill();

    // Red Bull Charging Bull silhouette representation
    ctx.fillStyle = '#e10600';
    ctx.beginPath();
    ctx.ellipse(260, 125, 75, 35, -0.15, 0, Math.PI * 2);
    ctx.fill();
    // Bull horns & head
    ctx.beginPath();
    ctx.moveTo(180, 120);
    ctx.lineTo(150, 95);
    ctx.lineTo(165, 130);
    ctx.closePath();
    ctx.fill();

    // Red Bull text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px "Orbitron", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Red Bull', 30, 70);

    const texture = new THREE.CanvasTexture(canvas);
    texture.anisotropy = 8;
    return texture;
  }

  // Generate Mobil 1 rear wing endplate texture
  createRearWingEndplateTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#050c20';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Blue Mobil 1 panel badge (matching user reference image)
    ctx.fillStyle = '#0044aa';
    ctx.fillRect(20, 30, 216, 75);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 44px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Mobil 1', 128, 68);

    // Heineken 0.0 badge
    ctx.fillStyle = '#005522';
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText('Heineken', 128, 160);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('0.0', 128, 195);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  buildExactRBModel() {
    this.carGroup = new THREE.Group();

    // Textures
    const sidepodTex = this.createSidepodTexture();
    const finTex = this.createFinTexture();
    const rwEndplateTex = this.createRearWingEndplateTexture();

    // Materials Palette (Matching User's Photo)
    const navyGlossMat = new THREE.MeshStandardMaterial({
      color: 0x07112c,
      roughness: 0.18,
      metalness: 0.75
    });

    const sidepodMat = new THREE.MeshStandardMaterial({
      map: sidepodTex,
      roughness: 0.25,
      metalness: 0.5
    });

    const finMat = new THREE.MeshStandardMaterial({
      map: finTex,
      roughness: 0.25,
      metalness: 0.5
    });

    const rwEndplateMat = new THREE.MeshStandardMaterial({
      map: rwEndplateTex,
      roughness: 0.3,
      metalness: 0.4
    });

    const carbonMat = new THREE.MeshStandardMaterial({
      color: 0x0f1118,
      roughness: 0.7,
      metalness: 0.3
    });

    const yellowAccentMat = new THREE.MeshStandardMaterial({
      color: 0xffc906, // Iconic Red Bull Racing Yellow
      roughness: 0.2,
      metalness: 0.5
    });

    const redAccentMat = new THREE.MeshStandardMaterial({
      color: 0xe10600, // Red Bull Racing Red
      roughness: 0.2,
      metalness: 0.5
    });

    const tyreRubberMat = new THREE.MeshStandardMaterial({
      color: 0x14161b,
      roughness: 0.85,
      metalness: 0.1
    });

    // ELECTRIC BLUE PIRELLI STRIPE (Exact match to reference photo)
    const tyreBlueStripeMat = new THREE.MeshBasicMaterial({
      color: 0x0088ff
    });

    const blackAlloyRimMat = new THREE.MeshStandardMaterial({
      color: 0x1a1c22,
      roughness: 0.35,
      metalness: 0.9
    });

    // --- A. MAIN CHASSIS (Sleek aerodynamic F1 Monocoque) ---
    const bodyGeo = new THREE.BoxGeometry(1.15, 0.42, 3.5);
    const bodyMesh = new THREE.Mesh(bodyGeo, navyGlossMat);
    bodyMesh.position.set(0, 0.4, 0);
    this.carGroup.add(bodyMesh);

    // Dorsal Fin with charging bull livery
    const finGeo = new THREE.BoxGeometry(0.04, 0.65, 1.9);
    const finMesh = new THREE.Mesh(finGeo, finMat);
    finMesh.position.set(0, 0.78, -0.3);
    this.carGroup.add(finMesh);

    // --- B. YELLOW AIRBOX INTAKE (Prominent in reference photo!) ---
    // Yellow cowl above driver
    const airboxCowlGeo = new THREE.BoxGeometry(0.48, 0.45, 0.9);
    const airboxCowl = new THREE.Mesh(airboxCowlGeo, yellowAccentMat);
    airboxCowl.position.set(0, 0.85, 0.25);
    this.carGroup.add(airboxCowl);

    // Black Intake Snorkel Mouth
    const snorkelGeo = new THREE.BoxGeometry(0.34, 0.22, 0.15);
    const snorkelMesh = new THREE.Mesh(snorkelGeo, carbonMat);
    snorkelMesh.position.set(0, 0.88, 0.7);
    this.carGroup.add(snorkelMesh);

    // --- C. NOSE CONE & YELLOW NOSE TIP ---
    // Tapering nose
    const noseGeo = new THREE.ConeGeometry(0.52, 2.3, 5);
    const noseMesh = new THREE.Mesh(noseGeo, navyGlossMat);
    noseMesh.rotation.x = Math.PI / 2;
    noseMesh.rotation.y = Math.PI;
    noseMesh.position.set(0, 0.32, 2.65);
    noseMesh.scale.set(0.85, 1, 0.38);
    this.carGroup.add(noseMesh);

    // Yellow Nose Tip
    const tipGeo = new THREE.SphereGeometry(0.19, 16, 16);
    const tipMesh = new THREE.Mesh(tipGeo, yellowAccentMat);
    tipMesh.position.set(0, 0.27, 3.8);
    tipMesh.scale.set(1.4, 0.7, 1);
    this.carGroup.add(tipMesh);

    // --- D. FRONT WING (Multi-tier Carbon Aerodynamics) ---
    const fwMain = new THREE.BoxGeometry(3.6, 0.05, 0.75);
    const fwMainMesh = new THREE.Mesh(fwMain, carbonMat);
    fwMainMesh.position.set(0, 0.14, 3.65);
    this.carGroup.add(fwMainMesh);

    // Red Bull Red front wing upper flap
    const fwFlap = new THREE.BoxGeometry(3.4, 0.04, 0.32);
    const fwFlapMesh = new THREE.Mesh(fwFlap, redAccentMat);
    fwFlapMesh.position.set(0, 0.2, 3.55);
    this.carGroup.add(fwFlapMesh);

    // Front wing endplates (Branded with Mobil 1 badge)
    [-1.8, 1.8].forEach(x => {
      const epGeo = new THREE.BoxGeometry(0.06, 0.36, 0.95);
      const epMesh = new THREE.Mesh(epGeo, rwEndplateMat);
      epMesh.position.set(x, 0.24, 3.65);
      this.carGroup.add(epMesh);
    });

    // --- E. SCULPTED SIDEPODS WITH ORACLE TEXTURE ---
    [-0.78, 0.78].forEach(x => {
      // Main Sidepod with ORACLE decal mapping
      const spGeo = new THREE.BoxGeometry(0.68, 0.44, 2.2);
      const spMesh = new THREE.Mesh(spGeo, sidepodMat);
      spMesh.position.set(x, 0.38, 0.1);
      // Flip texture on left side so text reads correctly
      if (x < 0) spMesh.scale.x = -1;
      this.carGroup.add(spMesh);

      // Undercut aerodynamic floor channel
      const ucGeo = new THREE.BoxGeometry(0.4, 0.1, 2.4);
      const ucMesh = new THREE.Mesh(ucGeo, carbonMat);
      ucMesh.position.set(x * 1.05, 0.12, 0.1);
      this.carGroup.add(ucMesh);
    });

    // Flat bottom carbon floor edge with vortex strakes
    const floorGeo = new THREE.BoxGeometry(2.35, 0.04, 3.4);
    const floorMesh = new THREE.Mesh(floorGeo, carbonMat);
    floorMesh.position.set(0, 0.09, 0.1);
    this.carGroup.add(floorMesh);

    // --- F. COCKPIT & HALO ---
    const cockpitHoleGeo = new THREE.BoxGeometry(0.55, 0.28, 0.95);
    const cockpitHole = new THREE.Mesh(cockpitHoleGeo, carbonMat);
    cockpitHole.position.set(0, 0.54, 0.42);
    this.carGroup.add(cockpitHole);

    // Helmet
    const helmetGeo = new THREE.SphereGeometry(0.19, 16, 16);
    const helmet = new THREE.Mesh(helmetGeo, navyGlossMat);
    helmet.position.set(0, 0.64, 0.35);
    this.carGroup.add(helmet);

    // Titanium Halo ring
    const haloCurve = new THREE.TorusGeometry(0.36, 0.04, 12, 24, Math.PI);
    const haloMesh = new THREE.Mesh(haloCurve, carbonMat);
    haloMesh.rotation.x = -Math.PI / 2.2;
    haloMesh.position.set(0, 0.72, 0.52);
    this.carGroup.add(haloMesh);

    // --- G. REAR WING (DRS with Mobil 1 & Heineken 0.0 Endplates) ---
    const rwMain = new THREE.BoxGeometry(2.8, 0.08, 0.6);
    const rwMainMesh = new THREE.Mesh(rwMain, navyGlossMat);
    rwMainMesh.position.set(0, 1.12, -2.15);
    this.carGroup.add(rwMainMesh);

    // DRS Flap (Red Bull Red)
    const drsFlap = new THREE.BoxGeometry(2.7, 0.06, 0.35);
    const drsFlapMesh = new THREE.Mesh(drsFlap, redAccentMat);
    drsFlapMesh.position.set(0, 1.25, -2.05);
    this.carGroup.add(drsFlapMesh);

    // Rear wing endplates (Branded Mobil 1)
    [-1.4, 1.4].forEach(x => {
      const rwEp = new THREE.BoxGeometry(0.06, 0.82, 0.88);
      const rwEpMesh = new THREE.Mesh(rwEp, rwEndplateMat);
      rwEpMesh.position.set(x, 0.96, -2.15);
      this.carGroup.add(rwEpMesh);
    });

    // Pylon supports
    [-0.35, 0.35].forEach(x => {
      const pylon = new THREE.BoxGeometry(0.05, 0.8, 0.18);
      const pylonMesh = new THREE.Mesh(pylon, carbonMat);
      pylonMesh.position.set(x, 0.76, -1.95);
      pylonMesh.rotation.x = -0.22;
      this.carGroup.add(pylonMesh);
    });

    // Rear rain LED
    const rainLightGeo = new THREE.BoxGeometry(0.18, 0.12, 0.08);
    const rainLightMat = new THREE.MeshBasicMaterial({ color: 0xff0022 });
    this.rainLed = new THREE.Mesh(rainLightGeo, rainLightMat);
    this.rainLed.position.set(0, 0.25, -2.25);
    this.carGroup.add(this.rainLed);

    // --- H. 4 PIRELLI P ZERO WHEELS WITH BLUE STRIPE ---
    const wheelConfigs = [
      { x: -1.45, y: 0.38, z: 2.25, radius: 0.38, width: 0.44 },  // Front Left
      { x: 1.45,  y: 0.38, z: 2.25, radius: 0.38, width: 0.44 },  // Front Right
      { x: -1.5,  y: 0.42, z: -1.65, radius: 0.44, width: 0.58 }, // Rear Left
      { x: 1.5,   y: 0.42, z: -1.65, radius: 0.44, width: 0.58 }  // Rear Right
    ];

    wheelConfigs.forEach((cfg) => {
      const wGroup = new THREE.Group();
      wGroup.position.set(cfg.x, cfg.y, cfg.z);

      // Tyre rubber
      const tyreGeo = new THREE.CylinderGeometry(cfg.radius, cfg.radius, cfg.width, 32);
      const tyreMesh = new THREE.Mesh(tyreGeo, tyreRubberMat);
      tyreMesh.rotation.z = Math.PI / 2;
      wGroup.add(tyreMesh);

      // PIRELLI BLUE STRIPE RING (Matches user reference photo)
      const stripeTorus = new THREE.TorusGeometry(cfg.radius * 0.78, 0.026, 8, 32);
      const stripeMesh = new THREE.Mesh(stripeTorus, tyreBlueStripeMat);
      stripeMesh.rotation.y = Math.PI / 2;
      stripeMesh.position.x = cfg.x > 0 ? cfg.width / 2 + 0.012 : -cfg.width / 2 - 0.012;
      wGroup.add(stripeMesh);

      // Black Aerodynamic Multi-spoke Rim
      const rimGeo = new THREE.CylinderGeometry(cfg.radius * 0.56, cfg.radius * 0.56, cfg.width * 1.02, 16);
      const rimMesh = new THREE.Mesh(rimGeo, blackAlloyRimMat);
      rimMesh.rotation.z = Math.PI / 2;
      wGroup.add(rimMesh);

      // Red central wheel nut
      const nutGeo = new THREE.CylinderGeometry(0.06, 0.06, cfg.width * 1.08, 8);
      const nutMesh = new THREE.Mesh(nutGeo, redAccentMat);
      nutMesh.rotation.z = Math.PI / 2;
      wGroup.add(nutMesh);

      // Suspension wishbones
      const armGeo = new THREE.CylinderGeometry(0.03, 0.03, Math.abs(cfg.x) - 0.5, 6);
      const armMesh = new THREE.Mesh(armGeo, carbonMat);
      armMesh.position.set(cfg.x > 0 ? -Math.abs(cfg.x)/2 + 0.3 : Math.abs(cfg.x)/2 - 0.3, 0, 0);
      armMesh.rotation.z = Math.PI / 2;
      wGroup.add(armMesh);

      this.carGroup.add(wGroup);
      this.wheels.push(wGroup);
    });

    this.scene.add(this.carGroup);
  }

  setupEnvironment() {
    // Pure clean solid track floor
    const groundGeo = new THREE.PlaneGeometry(35, 35);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x060814,
      roughness: 0.95,
      metalness: 0.1
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    this.scene.add(ground);

    // Subtle yellow track line
    const kerbGeo = new THREE.PlaneGeometry(16, 0.5);
    const kerbMat = new THREE.MeshBasicMaterial({ color: 0xffc906, side: THREE.DoubleSide });
    const kerb = new THREE.Mesh(kerbGeo, kerbMat);
    kerb.rotation.x = -Math.PI / 2;
    kerb.position.set(0, 0.01, -3.2);
    this.scene.add(kerb);
  }

  setupEventListeners() {
    // 360° Drag rotation
    this.container.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging || this.isTransitioning) return;

      const deltaX = e.clientX - this.previousMousePosition.x;
      const deltaY = e.clientY - this.previousMousePosition.y;

      this.targetRotation.y += deltaX * 0.009;
      this.targetRotation.x = Math.max(-0.25, Math.min(0.45, this.targetRotation.x + deltaY * 0.005));

      this.totalDragAngle += Math.abs(deltaX);
      this.previousMousePosition = { x: e.clientX, y: e.clientY };

      this.updateHudDisplay();

      if (this.totalDragAngle > 420 && !this.isTransitioning && window.currentPageIndex === 2) {
        this.triggerTransitionToStats();
      }
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    // Touch support
    this.container.addEventListener('touchstart', (e) => {
      if (e.touches.length > 0) {
        this.isDragging = true;
        this.previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
      if (!this.isDragging || this.isTransitioning || e.touches.length === 0) return;
      const deltaX = e.touches[0].clientX - this.previousMousePosition.x;
      this.targetRotation.y += deltaX * 0.012;
      this.totalDragAngle += Math.abs(deltaX);
      this.previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      this.updateHudDisplay();
    }, { passive: true });

    window.addEventListener('touchend', () => {
      this.isDragging = false;
    });

    // Launch button click
    if (this.launchBtn) {
      this.launchBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.triggerTransitionToStats();
      });
    }

    // Window resize
    window.addEventListener('resize', () => this.onResize());
  }

  // Camera angle preset: Side profile matching user reference photo
  setSideProfileView() {
    this.targetRotation.y = -Math.PI / 2;
    this.targetRotation.x = 0.0;
  }

  // Camera angle preset: 3/4 perspective
  setPerspectiveView() {
    this.targetRotation.y = -Math.PI / 5;
    this.targetRotation.x = 0.15;
  }

  onResize() {
    if (!this.container || !this.renderer || !this.camera) return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  updateHudDisplay() {
    if (this.angleDisplay) {
      const deg = Math.round((this.carRotation.y * (180 / Math.PI)) % 360);
      this.angleDisplay.textContent = `${deg}°`;
    }
    if (this.downforceDisplay) {
      const df = 1820 + Math.round(Math.abs(Math.sin(this.carRotation.y)) * 160);
      this.downforceDisplay.textContent = `${df} KG`;
    }
    if (this.tempDisplay) {
      const temp = 98 + Math.round(Math.abs(Math.cos(this.carRotation.y)) * 8);
      this.tempDisplay.textContent = `${temp}°C`;
    }
  }

  triggerTransitionToStats() {
    if (this.isTransitioning) return;
    this.isTransitioning = true;

    if (window.soundFX) {
      window.soundFX.playShift();
      window.soundFX.playRev(1.4);
    }

    let frame = 0;
    const launchInterval = setInterval(() => {
      frame++;
      if (this.carGroup) {
        this.carGroup.position.z += 0.38;
        this.carGroup.position.y += 0.02;
        this.targetRotation.y += 0.06;
      }

      if (frame >= 25) {
        clearInterval(launchInterval);
        if (window.navigateToPage) {
          window.navigateToPage(3);
        }
        setTimeout(() => {
          this.reset();
        }, 800);
      }
    }, 25);
  }

  reset() {
    this.isTransitioning = false;
    this.totalDragAngle = 0;
    if (this.carGroup) {
      this.carGroup.position.set(0, 0, 0);
    }
    this.targetRotation = { y: -Math.PI / 2, x: 0.05 };
  }

  animate(time) {
    requestAnimationFrame(this.animate);

    // Smooth damping
    this.carRotation.y += (this.targetRotation.y - this.carRotation.y) * 0.08;
    this.carRotation.x += (this.targetRotation.x - this.carRotation.x) * 0.08;

    // Gentle auto-rotation only after initial user interaction or slight idle float
    if (!this.isDragging && !this.isTransitioning && this.totalDragAngle > 0) {
      this.targetRotation.y += 0.002;
    }

    if (this.carGroup) {
      this.carGroup.rotation.y = this.carRotation.y;
      this.carGroup.rotation.x = this.carRotation.x;
      this.carGroup.position.y = Math.sin(time * 0.007) * 0.012;
    }

    // Spin wheels
    this.wheels.forEach(w => {
      w.rotation.x += 0.06;
    });

    // Blinking F1 rear rain LED
    if (this.rainLed) {
      this.rainLed.material.color.setHex((Math.floor(time * 0.006) % 2 === 0) ? 0xff0022 : 0x330005);
    }

    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.rb22Viewer = new RB22CarViewer();
});
