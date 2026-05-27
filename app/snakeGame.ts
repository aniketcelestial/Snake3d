type Vec2 = { x: number; z: number }

type Segment = Vec2 & { mesh?: any }

type FruitType = 'apple' | 'gem' | 'star'

type Level = {
  id: number
  name: string
  gridSize: number
  speed: number
  winScore: number
  bgColor: number
  fogColor: number
  fogNear: number
  fogFar: number
  fruitTypes: FruitType[]
  rockCount: number
  treeCount: number
}

type FruitDefinition = {
  color: number
  emit: number
  label: string
  pts: number
}

type GameHandle = {
  start: () => void
  restart: () => void
  pause: () => void
  resume: () => void
  backToMenu: () => void
}

declare global {
  interface Window {
    THREE?: any
    Game?: GameHandle
  }
}

const LEVELS: Level[] = [
  {
    id: 1,
    name: 'Grasslands',
    gridSize: 120,
    speed: 500,
    winScore: 100,
    bgColor: 0x0a1a0a,
    fogColor: 0x0a1a0a,
    fogNear: 8,
    fogFar: 180,
    fruitTypes: ['apple', 'gem', 'star'],
    rockCount: 12,
    treeCount: 10,
  },
]

const FRUIT_DEFS: Record<FruitType, FruitDefinition> = {
  apple: { color: 0xff2222, emit: 0x880000, label: '+10 🍎', pts: 10 },
  gem: { color: 0x00eeff, emit: 0x007788, label: '+20 💎', pts: 20 },
  star: { color: 0xffd700, emit: 0x885500, label: '+30 ⭐', pts: 30 },
}

const THREE_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'

function loadThree(): Promise<any> {
  if (window.THREE) {
    return Promise.resolve(window.THREE)
  }

  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-three-game="true"]')
    if (existing) {
      existing.addEventListener('load', () => resolve(window.THREE), { once: true })
      existing.addEventListener('error', reject, { once: true })
      return
    }

    const script = document.createElement('script')
    script.src = THREE_SRC
    script.async = true
    script.dataset.threeGame = 'true'
    script.onload = () => resolve(window.THREE)
    script.onerror = () => reject(new Error('Failed to load Three.js'))
    document.head.appendChild(script)
  })
}

function setText(id: string, value: string | number) {
  const element = document.getElementById(id)
  if (element) {
    element.textContent = String(value)
  }
}

function showScreen(screenId: 'welcome-screen' | 'pause-screen' | 'gameover-screen' | 'win-screen' | null) {
  const screens = ['welcome-screen', 'pause-screen', 'gameover-screen', 'win-screen']
  screens.forEach((id) => {
    document.getElementById(id)?.classList.add('hidden')
  })

  if (screenId) {
    document.getElementById(screenId)?.classList.remove('hidden')
  }
}

function hideAllScreens() {
  showScreen(null)
}

export async function initializeSnakeGame(): Promise<() => void> {
  const THREE = await loadThree()

  const state = {
    scene: null as any,
    camera: null as any,
    renderer: null as any,
    clock: null as any,
    snake: [] as Segment[],
    dir: { x: 1, z: 0 } as Vec2,
    nextDir: { x: 1, z: 0 } as Vec2,
    fruit: null as null | { x: number; z: number; type: FruitType; def: FruitDefinition },
    fruitMesh: null as any,
    score: 0,
    best: 0,
    stepTimer: 0,
    gameState: 'menu' as 'menu' | 'playing' | 'paused' | 'over' | 'win',
    currentLevel: LEVELS[0],
    animFrame: 0,
    destroyed: false,
    worldGroup: null as any,
    snakeGroup: null as any,
    rockGroup: null as any,
    resizeHandler: null as null | (() => void),
    keyHandler: null as null | ((event: KeyboardEvent) => void),
    swipeStartX: null as null | number,
    swipeStartY: null as null | number,
  }

  const MAT: Record<string, any> = {}

  function buildMaterials() {
    MAT.grass = new THREE.MeshLambertMaterial({ color: 0x2d6a2d })
    MAT.grassDark = new THREE.MeshLambertMaterial({ color: 0x1e4a1e })
    MAT.snakeHead = new THREE.MeshPhongMaterial({ color: 0x7fff00, shininess: 80, emissive: 0x2a6600, emissiveIntensity: 0.4 })
    MAT.snakeBody = new THREE.MeshPhongMaterial({ color: 0x55cc00, shininess: 60, emissive: 0x1a4400, emissiveIntensity: 0.2 })
    MAT.snakeTail = new THREE.MeshPhongMaterial({ color: 0x33aa00, shininess: 40 })
    MAT.rock1 = new THREE.MeshPhongMaterial({ color: 0x6b6b5a, shininess: 15 })
    MAT.rock2 = new THREE.MeshPhongMaterial({ color: 0x8a8070, shininess: 20 })
    MAT.rock3 = new THREE.MeshPhongMaterial({ color: 0x50503e, shininess: 10 })
    MAT.treeTrunk = new THREE.MeshLambertMaterial({ color: 0x4a2f1a })
    MAT.treeLeaf = new THREE.MeshPhongMaterial({ color: 0x1a6b1a, shininess: 30 })
    MAT.treeLeaf2 = new THREE.MeshPhongMaterial({ color: 0x238623, shininess: 20 })
    MAT.wall = new THREE.MeshPhongMaterial({ color: 0x2a2a1a, shininess: 5 })
    MAT.wallTop = new THREE.MeshPhongMaterial({ color: 0x3a3a28, shininess: 8 })
  }

  function buildRockCluster(cx: number, cz: number) {
    const mats = [MAT.rock1, MAT.rock2, MAT.rock3]
    const count = 2 + Math.floor(Math.random() * 3)

    for (let i = 0; i < count; i++) {
      const size = 0.4 + Math.random() * 0.6
      const geo = new THREE.DodecahedronGeometry(size, 0)
      const pos = geo.attributes.position

      for (let v = 0; v < pos.count; v++) {
        pos.setXYZ(
          v,
          pos.getX(v) * (0.8 + Math.random() * 0.4),
          pos.getY(v) * (0.7 + Math.random() * 0.5),
          pos.getZ(v) * (0.8 + Math.random() * 0.4),
        )
      }

      geo.computeVertexNormals()
      const mesh = new THREE.Mesh(geo, mats[i % mats.length])
      mesh.position.set(cx + (Math.random() - 0.5) * 1.2, size * 0.4, cz + (Math.random() - 0.5) * 1.2)
      mesh.rotation.set(Math.random() * 2, Math.random() * 6, Math.random() * 2)
      mesh.castShadow = true
      mesh.receiveShadow = true
      state.rockGroup.add(mesh)
    }

    for (let i = 0; i < 5; i++) {
      const geo = new THREE.ConeGeometry(0.08, 0.3, 4)
      const mat = new THREE.MeshLambertMaterial({ color: 0x3a7a1a })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.position.set(cx + (Math.random() - 0.5) * 1.8, 0.15, cz + (Math.random() - 0.5) * 1.8)
      mesh.rotation.y = Math.random() * Math.PI
      state.rockGroup.add(mesh)
    }
  }

  function buildTree(cx: number, cz: number) {
    const trunkH = 1.2 + Math.random() * 0.6
    const trunkGeo = new THREE.CylinderGeometry(0.12, 0.18, trunkH, 7)
    const trunk = new THREE.Mesh(trunkGeo, MAT.treeTrunk)
    trunk.position.set(cx, trunkH / 2, cz)
    trunk.castShadow = true
    state.rockGroup.add(trunk)

    for (let l = 0; l < 3; l++) {
      const r = 0.9 - l * 0.18
      const h = 1 - l * 0.1
      const geo = new THREE.ConeGeometry(r, h, 8)
      const mat = l % 2 === 0 ? MAT.treeLeaf : MAT.treeLeaf2
      const cone = new THREE.Mesh(geo, mat)
      cone.position.set(cx, trunkH + l * 0.55 + h * 0.4, cz)
      cone.castShadow = true
      state.rockGroup.add(cone)
    }
  }

  function buildWalls(gridSize: number, half: number) {
    const wallH = 0.8
    const wallT = 0.5
    const walls = [
      { sx: gridSize + wallT * 2, sz: wallT, px: 0, pz: -half - wallT / 2 },
      { sx: gridSize + wallT * 2, sz: wallT, px: 0, pz: half + wallT / 2 },
      { sx: wallT, sz: gridSize, px: -half - wallT / 2, pz: 0 },
      { sx: wallT, sz: gridSize, px: half + wallT / 2, pz: 0 },
    ]

    walls.forEach((wall) => {
      const geo = new THREE.BoxGeometry(wall.sx, wallH, wall.sz)
      const mesh = new THREE.Mesh(geo, MAT.wall)
      mesh.position.set(wall.px, wallH / 2 - 0.075, wall.pz)
      mesh.castShadow = true
      mesh.receiveShadow = true
      state.worldGroup.add(mesh)

      const stepCount = Math.floor(Math.max(wall.sx, wall.sz) / 1.2)
      for (let i = 0; i < stepCount; i++) {
        if (i % 2 !== 0) continue
        const cGeo = new THREE.BoxGeometry(wall.sz > wall.sx ? wallT * 0.9 : 1, 0.3, wall.sz > wall.sx ? 1 : wallT * 0.9)
        const cMesh = new THREE.Mesh(cGeo, MAT.wallTop)
        const t = i / (stepCount - 1) - 0.5
        cMesh.position.set(
          wall.px + (wall.sx > wall.sz ? t * wall.sx : 0),
          wallH - 0.075 + 0.15,
          wall.pz + (wall.sz > wall.sx ? t * wall.sz : 0),
        )
        state.worldGroup.add(cMesh)
      }
    })
  }

  function placeDecor(rockCount: number, treeCount: number, _gridSize: number, half: number) {
    const corners = [
      [-half + 1.5, -half + 1.5],
      [half - 1.5, -half + 1.5],
      [-half + 1.5, half - 1.5],
      [half - 1.5, half - 1.5],
    ]

    corners.forEach(([cx, cz]) => buildRockCluster(cx, cz))

    for (let i = 0; i < rockCount; i++) {
      const angle = (i / rockCount) * Math.PI * 2
      const radius = half * 0.7
      buildRockCluster(Math.cos(angle) * radius, Math.sin(angle) * radius)
    }

    for (let i = 0; i < treeCount; i++) {
      const angle = (i / treeCount) * Math.PI * 2 + 0.5
      const radius = half * 0.55
      buildTree(Math.cos(angle) * radius, Math.sin(angle) * radius)
    }
  }

  function buildWorld() {
    state.worldGroup = new THREE.Group()
    state.scene.add(state.worldGroup)

    const gridSize = state.currentLevel.gridSize
    const half = gridSize / 2

    for (let x = 0; x < gridSize; x++) {
      for (let z = 0; z < gridSize; z++) {
        const even = (x + z) % 2 === 0
        const geo = new THREE.BoxGeometry(1, 0.15, 1)
        const mesh = new THREE.Mesh(geo, even ? MAT.grass : MAT.grassDark)
        mesh.position.set(x - half + 0.5, -0.075, z - half + 0.5)
        mesh.receiveShadow = true
        state.worldGroup.add(mesh)
      }
    }

    buildWalls(gridSize, half)

    state.rockGroup = new THREE.Group()
    state.worldGroup.add(state.rockGroup)
    placeDecor(state.currentLevel.rockCount, state.currentLevel.treeCount, gridSize, half)

    state.snakeGroup = new THREE.Group()
    state.scene.add(state.snakeGroup)
  }

  function buildSnakeMesh(index: number, total: number) {
    const isHead = index === 0
    const isTail = index === total - 1
    const t = index / Math.max(total - 1, 1)
    const size = isHead ? 0.72 : 0.65 - t * 0.12

    let geo: any
    let mat: any

    if (isHead) {
      geo = new THREE.BoxGeometry(size, size * 0.8, size)
      mat = MAT.snakeHead
    } else {
      geo = new THREE.SphereGeometry(size * 0.5, 8, 6)
      mat = isTail ? MAT.snakeTail : MAT.snakeBody
    }

    const mesh = new THREE.Mesh(geo, mat)
    mesh.castShadow = true
    mesh.receiveShadow = true

    if (isHead) {
      const eyeGeo = new THREE.SphereGeometry(0.07, 6, 6)
      const eyeMat = new THREE.MeshPhongMaterial({ color: 0xffffff, emissive: 0xffff00, emissiveIntensity: 0.8 })
      const pupilMat = new THREE.MeshPhongMaterial({ color: 0x000000 })

      ;[-0.18, 0.18].forEach((ex) => {
        const eye = new THREE.Mesh(eyeGeo, eyeMat)
        eye.position.set(ex, 0.18, -0.3)
        mesh.add(eye)
        const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.04, 5, 5), pupilMat)
        pupil.position.set(ex, 0.18, -0.34)
        mesh.add(pupil)
      })

      const tongGeo = new THREE.CylinderGeometry(0.02, 0.01, 0.25, 4)
      const tongMat = new THREE.MeshLambertMaterial({ color: 0xff2222 })
      const tongue = new THREE.Mesh(tongGeo, tongMat)
      tongue.rotation.x = Math.PI / 2
      tongue.position.set(0, -0.05, -0.42)
      tongue.name = 'tongue'
      mesh.add(tongue)
    }

    if (!isHead && !isTail && index % 2 === 0) {
      const ringGeo = new THREE.TorusGeometry(size * 0.5, 0.04, 6, 10)
      const ringMat = new THREE.MeshLambertMaterial({ color: 0x88ff00 })
      const ring = new THREE.Mesh(ringGeo, ringMat)
      ring.rotation.x = Math.PI / 2
      mesh.add(ring)
    }

    return mesh
  }

  function rebuildSnakeMeshes() {
    while (state.snakeGroup.children.length) {
      state.snakeGroup.remove(state.snakeGroup.children[0])
    }

    state.snake.forEach((segment, index) => {
      segment.mesh = buildSnakeMesh(index, state.snake.length)
      segment.mesh.position.set(segment.x, 0.35, segment.z)
      if (index === 0) {
        segment.mesh.rotation.y = Math.atan2(-state.dir.x, -state.dir.z)
      }
      state.snakeGroup.add(segment.mesh)
    })
  }

  function spawnFruit() {
    if (state.fruitMesh) {
      state.scene.remove(state.fruitMesh)
      state.fruitMesh = null
    }

    const gridSize = state.currentLevel.gridSize
    const half = gridSize / 2
    const type = state.currentLevel.fruitTypes[Math.floor(Math.random() * state.currentLevel.fruitTypes.length)]
    const def = FRUIT_DEFS[type]

    let fx = 0
    let fz = 0
    let tries = 0

    do {
      fx = Math.floor(Math.random() * gridSize) - half + 0
      fz = Math.floor(Math.random() * gridSize) - half + 0
      tries++
    } while (state.snake.some((segment) => segment.x === fx && segment.z === fz) && tries < 100)

    state.fruit = { x: fx, z: fz, type, def }

    const group = new THREE.Group()

    if (type === 'apple') {
      const bodyGeo = new THREE.SphereGeometry(0.32, 10, 8)
      const bodyMat = new THREE.MeshPhongMaterial({ color: def.color, shininess: 120, emissive: def.emit, emissiveIntensity: 0.4 })
      const body = new THREE.Mesh(bodyGeo, bodyMat)
      body.castShadow = true
      group.add(body)

      const stemGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.2, 5)
      const stemMat = new THREE.MeshLambertMaterial({ color: 0x3d2010 })
      const stem = new THREE.Mesh(stemGeo, stemMat)
      stem.position.set(0.04, 0.35, 0)
      group.add(stem)

      const leafGeo = new THREE.SphereGeometry(0.12, 6, 4)
      leafGeo.scale(1, 0.3, 0.6)
      const leafMat = new THREE.MeshLambertMaterial({ color: 0x22aa22 })
      const leaf = new THREE.Mesh(leafGeo, leafMat)
      leaf.position.set(0.1, 0.4, 0)
      leaf.rotation.z = 0.4
      group.add(leaf)
    } else if (type === 'gem') {
      const geo = new THREE.OctahedronGeometry(0.36, 0)
      geo.scale(1, 1.4, 1)
      const mat = new THREE.MeshPhongMaterial({ color: def.color, shininess: 200, emissive: def.emit, emissiveIntensity: 0.6, transparent: true, opacity: 0.85 })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.castShadow = true
      group.add(mesh)
    } else {
      const cGeo = new THREE.SphereGeometry(0.2, 8, 6)
      const cMat = new THREE.MeshPhongMaterial({ color: def.color, emissive: def.emit, emissiveIntensity: 0.8, shininess: 150 })
      group.add(new THREE.Mesh(cGeo, cMat))

      for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2
        const geo = new THREE.ConeGeometry(0.09, 0.28, 5)
        const mat = new THREE.MeshPhongMaterial({ color: def.color, emissive: def.emit, emissiveIntensity: 0.5 })
        const spike = new THREE.Mesh(geo, mat)
        spike.position.set(Math.cos(angle) * 0.3, 0, Math.sin(angle) * 0.3)
        spike.rotation.z = -Math.PI / 2 + angle
        group.add(spike)
      }
    }

    const ringGeo = new THREE.TorusGeometry(0.45, 0.04, 8, 20)
    const ringMat = new THREE.MeshBasicMaterial({ color: def.color, transparent: true, opacity: 0.5 })
    const ring = new THREE.Mesh(ringGeo, ringMat)
    ring.rotation.x = Math.PI / 2
    ring.name = 'glow'
    group.add(ring)

    group.position.set(fx + 0.5, 0.38, fz + 0.5)
    group.userData = { baseY: 0.38, t: Math.random() * Math.PI * 2 }
    state.fruitMesh = group
    state.scene.add(state.fruitMesh)
  }

  function updateHUD() {
    setText('score-val', state.score)
    setText('best-val', state.best)
  }

  function showFruitLabel(text: string) {
    const element = document.getElementById('fruit-label')
    if (!element) {
      return
    }

    element.textContent = text
    element.classList.add('show')
    clearTimeout((element as any)._hideTimer)
    ;(element as any)._hideTimer = window.setTimeout(() => element.classList.remove('show'), 1200)
  }

  function animateFruit(dt: number) {
    if (!state.fruitMesh) {
      return
    }

    state.fruitMesh.userData.t += dt * 2
    state.fruitMesh.position.y = state.fruitMesh.userData.baseY + Math.sin(state.fruitMesh.userData.t) * 0.12
    state.fruitMesh.rotation.y += dt * 1.2

    const glow = state.fruitMesh.getObjectByName('glow')
    if (glow) {
      glow.material.opacity = 0.3 + Math.sin(state.fruitMesh.userData.t * 2) * 0.2
    }
  }

  function updateCamera() {
    if (!state.snake.length) {
      return
    }

    const head = state.snake[0]
    const targetX = head.x + 0.5
    const targetZ = head.z + 0.5
    const cameraX = targetX + state.dir.x * -4
    const cameraZ = targetZ + state.dir.z * -4

    state.camera.position.x += (cameraX - state.camera.position.x) * 0.06
    state.camera.position.z += (cameraZ - state.camera.position.z) * 0.06
    state.camera.position.y += (20 - state.camera.position.y) * 0.04
    state.camera.lookAt(targetX, 0, targetZ)
  }

  function endGame(win: boolean) {
    state.gameState = win ? 'win' : 'over'

    if (state.score > state.best) {
      state.best = state.score
      window.localStorage.setItem('serpent_best', String(state.best))
    }

    updateHUD()

    if (win) {
      setText('win-score', state.score)
      showScreen('win-screen')
    } else {
      setText('go-score', state.score)
      showScreen('gameover-screen')
    }
  }

  function step() {
    const head = state.snake[0]
    const nextX = head.x + state.nextDir.x
    const nextZ = head.z + state.nextDir.z
    state.dir = { ...state.nextDir }

    const half = state.currentLevel.gridSize / 2

    if (nextX < -half || nextX >= half || nextZ < -half || nextZ >= half) {
      endGame(false)
      return
    }

    if (state.snake.some((segment) => segment.x === nextX && segment.z === nextZ)) {
      endGame(false)
      return
    }

    const ate = Boolean(state.fruit && nextX === state.fruit.x && nextZ === state.fruit.z)
    const newHead: Segment = { x: nextX, z: nextZ }
    state.snake.unshift(newHead)

    if (!ate) {
      const removed = state.snake.pop()
      if (removed?.mesh) {
        state.snakeGroup.remove(removed.mesh)
      }
    } else if (state.fruit) {
      state.score += state.fruit.def.pts
      showFruitLabel(state.fruit.def.label)
      updateHUD()
      spawnFruit()

      if (state.score >= state.currentLevel.winScore) {
        endGame(true)
        return
      }
    }

    rebuildSnakeMeshes()
  }

  function setDirection(direction: 'up' | 'down' | 'left' | 'right') {
    const map = {
      up: { x: 0, z: -1 },
      down: { x: 0, z: 1 },
      left: { x: -1, z: 0 },
      right: { x: 1, z: 0 },
    }

    const next = map[direction]
    if (next.x === -state.dir.x && next.z === -state.dir.z) {
      return
    }

    state.nextDir = next
  }

  function setupInput() {
    state.keyHandler = (event: KeyboardEvent) => {
      if (['ArrowUp', 'w', 'W'].includes(event.key)) setDirection('up')
      if (['ArrowDown', 's', 'S'].includes(event.key)) setDirection('down')
      if (['ArrowLeft', 'a', 'A'].includes(event.key)) setDirection('left')
      if (['ArrowRight', 'd', 'D'].includes(event.key)) setDirection('right')
      if (['p', 'P', 'Escape'].includes(event.key)) {
        if (state.gameState === 'playing') pause()
        else if (state.gameState === 'paused') resume()
      }
    }

    document.addEventListener('keydown', state.keyHandler)

    document.querySelectorAll<HTMLElement>('.dpad-btn[data-dir]').forEach((button) => {
      const downHandler = (event: Event) => {
        event.preventDefault()
        setDirection(button.dataset.dir as 'up' | 'down' | 'left' | 'right')
        button.classList.add('pressed')
      }

      const upHandler = () => {
        button.classList.remove('pressed')
      }

      const mouseHandler = () => {
        setDirection(button.dataset.dir as 'up' | 'down' | 'left' | 'right')
      }

      button.addEventListener('touchstart', downHandler, { passive: false })
      button.addEventListener('touchend', upHandler, { passive: false })
      button.addEventListener('mousedown', mouseHandler)

      ;(button as any)._cleanup = () => {
        button.removeEventListener('touchstart', downHandler)
        button.removeEventListener('touchend', upHandler)
        button.removeEventListener('mousedown', mouseHandler)
      }
    })

    const swipeZone = document.getElementById('swipe-zone')
    if (swipeZone) {
      const startHandler = (event: TouchEvent) => {
        state.swipeStartX = event.touches[0].clientX
        state.swipeStartY = event.touches[0].clientY
      }

      const endHandler = (event: TouchEvent) => {
        if (state.swipeStartX == null || state.swipeStartY == null) {
          return
        }

        const dx = event.changedTouches[0].clientX - state.swipeStartX
        const dy = event.changedTouches[0].clientY - state.swipeStartY

        if (Math.abs(dx) > Math.abs(dy)) setDirection(dx > 0 ? 'right' : 'left')
        else setDirection(dy > 0 ? 'down' : 'up')

        state.swipeStartX = null
        state.swipeStartY = null
      }

      swipeZone.addEventListener('touchstart', startHandler, { passive: true })
      swipeZone.addEventListener('touchend', endHandler, { passive: true })

      ;(swipeZone as any)._cleanup = () => {
        swipeZone.removeEventListener('touchstart', startHandler)
        swipeZone.removeEventListener('touchend', endHandler)
      }
    }
  }

  function pause() {
    state.gameState = 'paused'
    showScreen('pause-screen')
  }

  function resume() {
    state.gameState = 'playing'
    hideAllScreens()
    state.clock.getDelta()
  }

  function backToMenu() {
    state.gameState = 'menu'
    showScreen('welcome-screen')
  }

  function start() {
    state.currentLevel = LEVELS[0]
    state.best = Number.parseInt(window.localStorage.getItem('serpent_best') || '0', 10)
    updateHUD()
    hideAllScreens()
    state.gameState = 'playing'
    state.stepTimer = 0
    initLevel()
  }

  function restart() {
    hideAllScreens()
    state.gameState = 'playing'
    state.stepTimer = 0
    initLevel()
  }

  function initLevel() {
    state.snake = []
    for (let index = 0; index < 3; index++) {
      state.snake.push({ x: -index, z: 0 })
    }

    state.dir = { x: 1, z: 0 }
    state.nextDir = { x: 1, z: 0 }
    state.score = 0
    updateHUD()
    rebuildSnakeMeshes()
    spawnFruit()
  }

  function initThree() {
    const width = window.innerWidth
    const height = window.innerHeight
    state.scene = new THREE.Scene()
    state.scene.background = new THREE.Color(state.currentLevel.bgColor)
    state.scene.fog = new THREE.Fog(state.currentLevel.fogColor, state.currentLevel.fogNear, state.currentLevel.fogFar)

    state.camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 200)
    state.camera.position.set(0, 20, 18)
    state.camera.lookAt(0, 0, 0)

    state.renderer = new THREE.WebGLRenderer({ antialias: true })
    state.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    state.renderer.setSize(width, height)
    state.renderer.shadowMap.enabled = true
    state.renderer.shadowMap.type = THREE.PCFSoftShadowMap

    const container = document.getElementById('game-container')
    if (container) {
      container.innerHTML = ''
      container.appendChild(state.renderer.domElement)
    }

    state.clock = new THREE.Clock()

    const ambient = new THREE.AmbientLight(0x223322, 0.7)
    state.scene.add(ambient)

    const sun = new THREE.DirectionalLight(0xfff0cc, 1.4)
    sun.position.set(15, 30, 10)
    sun.castShadow = true
    sun.shadow.camera.near = 0.5
    sun.shadow.camera.far = 80
    sun.shadow.camera.left = -30
    sun.shadow.camera.right = 30
    sun.shadow.camera.top = 30
    sun.shadow.camera.bottom = -30
    sun.shadow.mapSize.width = 1024
    sun.shadow.mapSize.height = 1024
    state.scene.add(sun)

    const fill = new THREE.DirectionalLight(0x2244ff, 0.25)
    fill.position.set(-10, 5, -10)
    state.scene.add(fill)

    const hemi = new THREE.HemisphereLight(0x224422, 0x112211, 0.4)
    state.scene.add(hemi)

    buildMaterials()
    buildWorld()

    state.resizeHandler = () => {
      const nextWidth = window.innerWidth
      const nextHeight = window.innerHeight
      state.camera.aspect = nextWidth / nextHeight
      state.camera.updateProjectionMatrix()
      state.renderer.setSize(nextWidth, nextHeight)
    }

    window.addEventListener('resize', state.resizeHandler)
  }

  function loop() {
    if (state.destroyed) {
      return
    }

    state.animFrame = window.requestAnimationFrame(loop)
    const delta = state.clock.getDelta()

    if (state.gameState === 'playing') {
      state.stepTimer += delta * 1000
      if (state.stepTimer >= state.currentLevel.speed) {
        state.stepTimer -= state.currentLevel.speed
        step()
      }
      animateFruit(delta)
      updateCamera()
    }

    state.renderer.render(state.scene, state.camera)
  }

  function cleanupElementListeners() {
    document.querySelectorAll<HTMLElement>('.dpad-btn[data-dir]').forEach((button) => {
      ;(button as any)._cleanup?.()
    })

    const swipeZone = document.getElementById('swipe-zone') as any
    swipeZone?._cleanup?.()
  }

  state.best = Number.parseInt(window.localStorage.getItem('serpent_best') || '0', 10)
  updateHUD()
  initThree()
  setupInput()
  loop()
  showScreen('welcome-screen')

  const game: GameHandle = {
    start,
    restart,
    pause,
    resume,
    backToMenu,
  }

  window.Game = game

  return () => {
    state.destroyed = true
    window.cancelAnimationFrame(state.animFrame)
    window.removeEventListener('resize', state.resizeHandler as EventListener)
    if (state.keyHandler) {
      document.removeEventListener('keydown', state.keyHandler)
    }
    cleanupElementListeners()
    state.renderer?.dispose?.()
    if (state.renderer?.domElement?.parentElement) {
      state.renderer.domElement.parentElement.removeChild(state.renderer.domElement)
    }
    window.Game = undefined
  }
}
