// ═══════════════════════════════════════════
//  LEVEL DEFINITIONS  (add more levels here)
// ═══════════════════════════════════════════
const LEVELS = [
  {
    id: 1,
    name: "Grasslands",
    gridSize: 18,
    speed: 200,           // ms per step
    winScore: 100,
    bgColor: 0x0a1a0a,
    fogColor: 0x0a1a0a,
    fogNear: 8,
    fogFar: 55,
    fruitTypes: ["apple","gem","star"],
    rockCount: 8,
    treeCount: 6,
  }
  // Future: { id:2, name:"Desert", gridSize:22, speed:160, ... }
];

// ═══════════════════════════════════════════
//  GAME ENGINE
// ═══════════════════════════════════════════
const Game = (() => {
  let scene, camera, renderer, clock;
  let snake = [], dir = {x:1,z:0}, nextDir = {x:1,z:0};
  let fruit = null, fruitMesh = null;
  let score = 0, best = 0, stepTimer = 0;
  let state = 'menu'; // menu | playing | paused | over | win
  let currentLevel = LEVELS[0];
  let animFrame;

  // Three.js groups
  let worldGroup, snakeGroup, rockGroup, treeGroup;

  // Materials cache
  const MAT = {};

  // ── Init Three.js ──────────────────────────
  function initThree() {
    const W = window.innerWidth, H = window.innerHeight;
    scene = new THREE.Scene();
    scene.background = new THREE.Color(currentLevel.bgColor);
    scene.fog = new THREE.Fog(currentLevel.fogColor, currentLevel.fogNear, currentLevel.fogFar);

    camera = new THREE.PerspectiveCamera(55, W/H, 0.1, 200);
    camera.position.set(0, 20, 18);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.getElementById('game-container').appendChild(renderer.domElement);

    clock = new THREE.Clock();

    // Lights
    const ambient = new THREE.AmbientLight(0x223322, 0.7);
    scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xfff0cc, 1.4);
    sun.position.set(15, 30, 10);
    sun.castShadow = true;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 80;
    sun.shadow.camera.left = -30;
    sun.shadow.camera.right = 30;
    sun.shadow.camera.top = 30;
    sun.shadow.camera.bottom = -30;
    sun.shadow.mapSize.width = 1024;
    sun.shadow.mapSize.height = 1024;
    scene.add(sun);

    const fill = new THREE.DirectionalLight(0x2244ff, 0.25);
    fill.position.set(-10, 5, -10);
    scene.add(fill);

    const hemi = new THREE.HemisphereLight(0x224422, 0x112211, 0.4);
    scene.add(hemi);

    buildMaterials();
    buildWorld();

    window.addEventListener('resize', onResize);
  }

  function onResize() {
    const W = window.innerWidth, H = window.innerHeight;
    camera.aspect = W/H;
    camera.updateProjectionMatrix();
    renderer.setSize(W, H);
  }

  // ── Materials ──────────────────────────────
  function buildMaterials() {
    MAT.grass = new THREE.MeshLambertMaterial({ color: 0x2d6a2d });
    MAT.grassDark = new THREE.MeshLambertMaterial({ color: 0x1e4a1e });
    MAT.snakeHead = new THREE.MeshPhongMaterial({ color: 0x7fff00, shininess: 80, emissive: 0x2a6600, emissiveIntensity: 0.4 });
    MAT.snakeBody = new THREE.MeshPhongMaterial({ color: 0x55cc00, shininess: 60, emissive: 0x1a4400, emissiveIntensity: 0.2 });
    MAT.snakeTail = new THREE.MeshPhongMaterial({ color: 0x33aa00, shininess: 40 });
    MAT.rock1 = new THREE.MeshPhongMaterial({ color: 0x6b6b5a, shininess: 15 });
    MAT.rock2 = new THREE.MeshPhongMaterial({ color: 0x8a8070, shininess: 20 });
    MAT.rock3 = new THREE.MeshPhongMaterial({ color: 0x50503e, shininess: 10 });
    MAT.treeTrunk = new THREE.MeshLambertMaterial({ color: 0x4a2f1a });
    MAT.treeLeaf  = new THREE.MeshPhongMaterial({ color: 0x1a6b1a, shininess: 30 });
    MAT.treeLeaf2 = new THREE.MeshPhongMaterial({ color: 0x238623, shininess: 20 });
    MAT.wall = new THREE.MeshPhongMaterial({ color: 0x2a2a1a, shininess: 5 });
    MAT.wallTop = new THREE.MeshPhongMaterial({ color: 0x3a3a28, shininess: 8 });
  }

  // ── World ──────────────────────────────────
  function buildWorld() {
    worldGroup = new THREE.Group();
    scene.add(worldGroup);

    const G = currentLevel.gridSize;
    const half = G / 2;

    // Checkerboard floor
    for (let x = 0; x < G; x++) {
      for (let z = 0; z < G; z++) {
        const even = (x + z) % 2 === 0;
        const geo = new THREE.BoxGeometry(1, 0.15, 1);
        const mesh = new THREE.Mesh(geo, even ? MAT.grass : MAT.grassDark);
        mesh.position.set(x - half + 0.5, -0.075, z - half + 0.5);
        mesh.receiveShadow = true;
        worldGroup.add(mesh);
      }
    }

    // Walls
    buildWalls(G, half);

    // Rocks
    rockGroup = new THREE.Group();
    worldGroup.add(rockGroup);
    placeDecor(currentLevel.rockCount, currentLevel.treeCount, G, half);

    snakeGroup = new THREE.Group();
    scene.add(snakeGroup);
  }

  function buildWalls(G, half) {
    const wallH = 0.8, wallT = 0.5;
    // bottom, top, left, right
    const walls = [
      { sx: G + wallT * 2, sz: wallT, px: 0,     pz: -half - wallT/2 },
      { sx: G + wallT * 2, sz: wallT, px: 0,     pz:  half + wallT/2 },
      { sx: wallT, sz: G,             px: -half - wallT/2, pz: 0 },
      { sx: wallT, sz: G,             px:  half + wallT/2, pz: 0 },
    ];
    walls.forEach(w => {
      const geo = new THREE.BoxGeometry(w.sx, wallH, w.sz);
      const mesh = new THREE.Mesh(geo, MAT.wall);
      mesh.position.set(w.px, wallH/2 - 0.075, w.pz);
      mesh.castShadow = true; mesh.receiveShadow = true;
      worldGroup.add(mesh);

      // crenellations on top
      const stepCount = Math.floor(Math.max(w.sx, w.sz) / 1.2);
      for (let i = 0; i < stepCount; i++) {
        if (i % 2 !== 0) continue;
        const cGeo = new THREE.BoxGeometry(
          w.sz > w.sx ? wallT * 0.9 : 1.0,
          0.3,
          w.sz > w.sx ? 1.0 : wallT * 0.9
        );
        const cMesh = new THREE.Mesh(cGeo, MAT.wallTop);
        const t = (i / (stepCount - 1)) - 0.5;
        cMesh.position.set(
          w.px + (w.sx > w.sz ? t * w.sx : 0),
          wallH - 0.075 + 0.15,
          w.pz + (w.sz > w.sx ? t * w.sz : 0)
        );
        worldGroup.add(cMesh);
      }
    });
  }

  function placeDecor(rockCount, treeCount, G, half) {
    const corners = [
      [-half + 1.5, -half + 1.5], [half - 1.5, -half + 1.5],
      [-half + 1.5,  half - 1.5], [half - 1.5,  half - 1.5]
    ];
    // Rocks at corners + random
    corners.forEach(([cx, cz]) => {
      buildRockCluster(cx, cz);
    });
    for (let i = 0; i < rockCount; i++) {
      const angle = (i / rockCount) * Math.PI * 2;
      const r = half * 0.7;
      buildRockCluster(Math.cos(angle) * r, Math.sin(angle) * r);
    }
    // Trees
    for (let i = 0; i < treeCount; i++) {
      const angle = (i / treeCount) * Math.PI * 2 + 0.5;
      const r = half * 0.55;
      buildTree(Math.cos(angle) * r, Math.sin(angle) * r);
    }
  }

  function buildRockCluster(cx, cz) {
    const mats = [MAT.rock1, MAT.rock2, MAT.rock3];
    const count = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      const size = 0.4 + Math.random() * 0.6;
      const geo = new THREE.DodecahedronGeometry(size, 0);
      // Randomly warp vertices for natural look
      const pos = geo.attributes.position;
      for (let v = 0; v < pos.count; v++) {
        pos.setXYZ(v,
          pos.getX(v) * (0.8 + Math.random() * 0.4),
          pos.getY(v) * (0.7 + Math.random() * 0.5),
          pos.getZ(v) * (0.8 + Math.random() * 0.4)
        );
      }
      geo.computeVertexNormals();
      const mesh = new THREE.Mesh(geo, mats[i % mats.length]);
      mesh.position.set(
        cx + (Math.random() - 0.5) * 1.2,
        size * 0.4,
        cz + (Math.random() - 0.5) * 1.2
      );
      mesh.rotation.set(Math.random()*2, Math.random()*6, Math.random()*2);
      mesh.castShadow = true; mesh.receiveShadow = true;
      rockGroup.add(mesh);
    }
    // Grass tufts around rocks
    for (let i = 0; i < 5; i++) {
      const geo = new THREE.ConeGeometry(0.08, 0.3, 4);
      const mat = new THREE.MeshLambertMaterial({ color: 0x3a7a1a });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(
        cx + (Math.random() - 0.5) * 1.8,
        0.15,
        cz + (Math.random() - 0.5) * 1.8
      );
      mesh.rotation.y = Math.random() * Math.PI;
      rockGroup.add(mesh);
    }
  }

  function buildTree(cx, cz) {
    const trunkH = 1.2 + Math.random() * 0.6;
    const trunkGeo = new THREE.CylinderGeometry(0.12, 0.18, trunkH, 7);
    const trunk = new THREE.Mesh(trunkGeo, MAT.treeTrunk);
    trunk.position.set(cx, trunkH / 2, cz);
    trunk.castShadow = true;
    rockGroup.add(trunk);
    // Layered foliage cones
    const layers = 3;
    for (let l = 0; l < layers; l++) {
      const r = 0.9 - l * 0.18;
      const h = 1.0 - l * 0.1;
      const geo = new THREE.ConeGeometry(r, h, 8);
      const mat = l % 2 === 0 ? MAT.treeLeaf : MAT.treeLeaf2;
      const cone = new THREE.Mesh(geo, mat);
      cone.position.set(cx, trunkH + l * 0.55 + h * 0.4, cz);
      cone.castShadow = true;
      rockGroup.add(cone);
    }
  }

  // ── Snake builder ──────────────────────────
  function buildSnakeMesh(index, total) {
    const isHead = index === 0;
    const isTail = index === total - 1;
    const t = index / Math.max(total - 1, 1);
    const size = isHead ? 0.72 : (0.65 - t * 0.12);

    let geo, mat;
    if (isHead) {
      geo = new THREE.BoxGeometry(size, size * 0.8, size);
      // Add head features
      mat = MAT.snakeHead;
    } else {
      // Tapered sphere for body
      geo = new THREE.SphereGeometry(size * 0.5, 8, 6);
      mat = isTail ? MAT.snakeTail : MAT.snakeBody;
    }

    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    if (isHead) {
      // Eyes
      const eyeGeo = new THREE.SphereGeometry(0.07, 6, 6);
      const eyeMat = new THREE.MeshPhongMaterial({ color: 0xffffff, emissive: 0xffff00, emissiveIntensity: 0.8 });
      const pupilMat = new THREE.MeshPhongMaterial({ color: 0x000000 });
      [-0.18, 0.18].forEach(ex => {
        const eye = new THREE.Mesh(eyeGeo, eyeMat);
        eye.position.set(ex, 0.18, -0.3);
        mesh.add(eye);
        const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.04, 5, 5), pupilMat);
        pupil.position.set(ex, 0.18, -0.34);
        mesh.add(pupil);
      });
      // Tongue
      const tongGeo = new THREE.CylinderGeometry(0.02, 0.01, 0.25, 4);
      const tongMat = new THREE.MeshLambertMaterial({ color: 0xff2222 });
      const tongue = new THREE.Mesh(tongGeo, tongMat);
      tongue.rotation.x = Math.PI / 2;
      tongue.position.set(0, -0.05, -0.42);
      tongue.name = 'tongue';
      mesh.add(tongue);
    }

    // Scale rings on body
    if (!isHead && !isTail && index % 2 === 0) {
      const ringGeo = new THREE.TorusGeometry(size * 0.5, 0.04, 6, 10);
      const ringMat = new THREE.MeshLambertMaterial({ color: 0x88ff00 });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      mesh.add(ring);
    }

    return mesh;
  }

  function rebuildSnakeMeshes() {
    while (snakeGroup.children.length) snakeGroup.remove(snakeGroup.children[0]);
    snake.forEach((seg, i) => {
      seg.mesh = buildSnakeMesh(i, snake.length);
      seg.mesh.position.set(seg.x, 0.35, seg.z);
      // Rotate head to face direction
      if (i === 0) {
        seg.mesh.rotation.y = Math.atan2(-dir.x, -dir.z);
      }
      snakeGroup.add(seg.mesh);
    });
  }

  // ── Fruit ──────────────────────────────────
  const FRUIT_DEFS = {
    apple: { color: 0xff2222, emit: 0x880000, label: '+10 🍎', pts: 10 },
    gem:   { color: 0x00eeff, emit: 0x007788, label: '+20 💎', pts: 20 },
    star:  { color: 0xffd700, emit: 0x885500, label: '+30 ⭐', pts: 30 },
  };

  function spawnFruit() {
    if (fruitMesh) { scene.remove(fruitMesh); fruitMesh = null; }
    const G = currentLevel.gridSize, half = G / 2;
    const types = currentLevel.fruitTypes;
    const type = types[Math.floor(Math.random() * types.length)];
    const def = FRUIT_DEFS[type];

    // Find empty cell
    let fx, fz, tries = 0;
    do {
      fx = Math.floor(Math.random() * G) - half + 0;
      fz = Math.floor(Math.random() * G) - half + 0;
      tries++;
    } while (snake.some(s => s.x === fx && s.z === fz) && tries < 100);

    fruit = { x: fx, z: fz, type, def };

    // Build fruit mesh
    const group = new THREE.Group();

    if (type === 'apple') {
      // Sphere body
      const bodyGeo = new THREE.SphereGeometry(0.32, 10, 8);
      const bodyMat = new THREE.MeshPhongMaterial({ color: def.color, shininess: 120, emissive: def.emit, emissiveIntensity: 0.4 });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.castShadow = true;
      group.add(body);
      // Stem
      const stemGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.2, 5);
      const stemMat = new THREE.MeshLambertMaterial({ color: 0x3d2010 });
      const stem = new THREE.Mesh(stemGeo, stemMat);
      stem.position.set(0.04, 0.35, 0);
      group.add(stem);
      // Leaf
      const leafGeo = new THREE.SphereGeometry(0.12, 6, 4);
      leafGeo.scale(1, 0.3, 0.6);
      const leafMat = new THREE.MeshLambertMaterial({ color: 0x22aa22 });
      const leaf = new THREE.Mesh(leafGeo, leafMat);
      leaf.position.set(0.1, 0.4, 0.0);
      leaf.rotation.z = 0.4;
      group.add(leaf);
    } else if (type === 'gem') {
      const geo = new THREE.OctahedronGeometry(0.36, 0);
      geo.scale(1, 1.4, 1);
      const mat = new THREE.MeshPhongMaterial({ color: def.color, shininess: 200, emissive: def.emit, emissiveIntensity: 0.6, transparent: true, opacity: 0.85 });
      const m = new THREE.Mesh(geo, mat);
      m.castShadow = true;
      group.add(m);
    } else if (type === 'star') {
      // Star: central sphere + spikes
      const cGeo = new THREE.SphereGeometry(0.2, 8, 6);
      const cMat = new THREE.MeshPhongMaterial({ color: def.color, emissive: def.emit, emissiveIntensity: 0.8, shininess: 150 });
      group.add(new THREE.Mesh(cGeo, cMat));
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        const geo = new THREE.ConeGeometry(0.09, 0.28, 5);
        const mat = new THREE.MeshPhongMaterial({ color: def.color, emissive: def.emit, emissiveIntensity: 0.5 });
        const spike = new THREE.Mesh(geo, mat);
        spike.position.set(Math.cos(a) * 0.3, 0, Math.sin(a) * 0.3);
        spike.rotation.z = -Math.PI/2 + a;
        group.add(spike);
      }
    }

    // Glow ring
    const ringGeo = new THREE.TorusGeometry(0.45, 0.04, 8, 20);
    const ringMat = new THREE.MeshBasicMaterial({ color: def.color, transparent: true, opacity: 0.5 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.name = 'glow';
    group.add(ring);

    group.position.set(fx + 0.5, 0.38, fz + 0.5);
    group.userData = { baseY: 0.38, t: Math.random() * Math.PI * 2 };
    fruitMesh = group;
    scene.add(fruitMesh);
  }

  // ── Game logic ──────────────────────────────
  function initLevel() {
    const G = currentLevel.gridSize, half = G / 2;
    // Start snake in centre
    snake = [];
    for (let i = 0; i < 3; i++) {
      snake.push({ x: -i, z: 0, mesh: null });
    }
    dir = { x: 1, z: 0 };
    nextDir = { x: 1, z: 0 };
    score = 0;
    updateHUD();
    rebuildSnakeMeshes();
    spawnFruit();
  }

  function step() {
    const head = snake[0];
    const nx = head.x + nextDir.x;
    const nz = head.z + nextDir.z;
    dir = { ...nextDir };

    const G = currentLevel.gridSize, half = G / 2;

    // Wall collision
    if (nx < -half || nx >= half || nz < -half || nz >= half) {
      endGame(false); return;
    }
    // Self collision
    if (snake.some(s => s.x === nx && s.z === nz)) {
      endGame(false); return;
    }

    // Eat fruit
    const ate = (fruit && nx === fruit.x && nz === fruit.z);

    // Move: prepend new head, remove tail unless ate
    const newHead = { x: nx, z: nz, mesh: null };
    snake.unshift(newHead);
    if (!ate) {
      const removed = snake.pop();
      if (removed.mesh) snakeGroup.remove(removed.mesh);
    } else {
      score += fruit.def.pts;
      showFruitLabel(fruit.def.label);
      updateHUD();
      spawnFruit();
      if (score >= currentLevel.winScore) { endGame(true); return; }
    }

    rebuildSnakeMeshes();
  }

  function endGame(win) {
    state = win ? 'win' : 'over';
    if (score > best) { best = score; localStorage.setItem('serpent_best', best); }
    updateHUD();
    if (win) {
      document.getElementById('win-score').textContent = score;
      showScreen('win-screen');
    } else {
      document.getElementById('go-score').textContent = score;
      showScreen('gameover-screen');
    }
  }

  function showFruitLabel(text) {
    const el = document.getElementById('fruit-label');
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('show'), 1200);
  }

  function updateHUD() {
    document.getElementById('score-val').textContent = score;
    document.getElementById('best-val').textContent = best;
  }

  // ── Camera follow ──────────────────────────
  function updateCamera() {
    if (!snake.length) return;
    const head = snake[0];
    const tx = head.x + 0.5;
    const tz = head.z + 0.5;
    const cx = tx + dir.x * -4;
    const cz = tz + dir.z * -4;
    camera.position.x += (cx - camera.position.x) * 0.06;
    camera.position.z += (cz - camera.position.z) * 0.06;
    camera.position.y += (20 - camera.position.y) * 0.04;
    camera.lookAt(tx, 0, tz);
  }

  // ── Animate fruit ──────────────────────────
  function animateFruit(dt) {
    if (!fruitMesh) return;
    fruitMesh.userData.t += dt * 2;
    fruitMesh.position.y = fruitMesh.userData.baseY + Math.sin(fruitMesh.userData.t) * 0.12;
    fruitMesh.rotation.y += dt * 1.2;
    const glow = fruitMesh.getObjectByName('glow');
    if (glow) { glow.material.opacity = 0.3 + Math.sin(fruitMesh.userData.t * 2) * 0.2; }
  }

  // ── Render loop ────────────────────────────
  function loop() {
    animFrame = requestAnimationFrame(loop);
    const dt = clock.getDelta();

    if (state === 'playing') {
      stepTimer += dt * 1000;
      if (stepTimer >= currentLevel.speed) {
        stepTimer -= currentLevel.speed;
        step();
      }
      animateFruit(dt);
      updateCamera();
    }

    renderer.render(scene, camera);
  }

  // ── Input ──────────────────────────────────
  function setDir(d) {
    const opposite = { up:'down', down:'up', left:'right', right:'left' };
    const map = {
      up:    { x: 0, z:-1 },
      down:  { x: 0, z: 1 },
      left:  { x:-1, z: 0 },
      right: { x: 1, z: 0 },
    };
    // Prevent reversing
    const nd = map[d];
    if (nd.x === -dir.x && nd.z === -dir.z) return;
    nextDir = nd;
  }

  function setupInput() {
    document.addEventListener('keydown', e => {
      if (['ArrowUp','w','W'].includes(e.key))    setDir('up');
      if (['ArrowDown','s','S'].includes(e.key))  setDir('down');
      if (['ArrowLeft','a','A'].includes(e.key))  setDir('left');
      if (['ArrowRight','d','D'].includes(e.key)) setDir('right');
      if (['p','P','Escape'].includes(e.key)) {
        if (state === 'playing') pause();
        else if (state === 'paused') resume();
      }
    });

    // D-pad
    document.querySelectorAll('.dpad-btn[data-dir]').forEach(btn => {
      btn.addEventListener('touchstart', e => { e.preventDefault(); setDir(btn.dataset.dir); btn.classList.add('pressed'); }, { passive: false });
      btn.addEventListener('touchend',   e => { btn.classList.remove('pressed'); }, { passive: false });
      btn.addEventListener('mousedown',  e => { setDir(btn.dataset.dir); });
    });

    // Swipe
    let sx, sy;
    const swipe = document.getElementById('swipe-zone');
    swipe.addEventListener('touchstart', e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
    swipe.addEventListener('touchend', e => {
      if (sx == null) return;
      const dx = e.changedTouches[0].clientX - sx;
      const dy = e.changedTouches[0].clientY - sy;
      if (Math.abs(dx) > Math.abs(dy)) {
        setDir(dx > 0 ? 'right' : 'left');
      } else {
        setDir(dy > 0 ? 'down' : 'up');
      }
      sx = sy = null;
    }, { passive: true });
  }

  // ── Screen helpers ─────────────────────────
  function showScreen(id) {
    ['welcome-screen','pause-screen','gameover-screen','win-screen'].forEach(s => {
      document.getElementById(s).classList.add('hidden');
    });
    if (id) document.getElementById(id).classList.remove('hidden');
  }
  function hideAllScreens() { showScreen(null); }

  // ── Public API ─────────────────────────────
  function start() {
    currentLevel = LEVELS[0];
    best = parseInt(localStorage.getItem('serpent_best') || '0');
    updateHUD();
    hideAllScreens();
    state = 'playing';
    stepTimer = 0;
    initLevel();
  }

  function restart() {
    hideAllScreens();
    state = 'playing';
    stepTimer = 0;
    initLevel();
  }

  function pause() {
    state = 'paused';
    showScreen('pause-screen');
  }

  function resume() {
    state = 'playing';
    hideAllScreens();
    clock.getDelta(); // consume delta
  }

  function backToMenu() {
    state = 'menu';
    showScreen('welcome-screen');
  }

  // ── Boot ───────────────────────────────────
  (function boot() {
    best = parseInt(localStorage.getItem('serpent_best') || '0');
    updateHUD();
    initThree();
    setupInput();
    loop();
    showScreen('welcome-screen');
  })();

  return { start, restart, pause, resume, backToMenu };
})();

window.Game = Game;