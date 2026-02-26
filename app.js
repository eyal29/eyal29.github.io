import * as THREE from "three";
    import { OrbitControls } from "three/addons/controls/OrbitControls.js";
    import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
    import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
    import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
    // ---------- Scene ----------
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x07080a);
    // Fog doux (pas agressif => pas dâ€™Ã©cran noir)
    // scene.fog = new THREE.Fog(0x07080a, 80, 400);

    // ---------- Camera ----------
    const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.1, 2000);
    camera.up.set(0, 0, 1);
    camera.position.set(-14, -24, 10.5);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(innerWidth, innerHeight);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    document.body.appendChild(renderer.domElement);

    // ---------- Post-processing (bloom lÃ©ger, pas destructeur) ----------
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.35, 0.35, 0.95);
    composer.addPass(bloom);

    // ---------- Controls ----------
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // ðŸ”¥ IMPORTANT: on vise un point fixe qui existe vraiment (centre de la scÃ¨ne)
    const SCENE_CENTER = new THREE.Vector3(58, 2.0, 0.9);
    controls.target.copy(SCENE_CENTER);
    controls.update();

    // ---------- Lights ----------
    const sun = new THREE.DirectionalLight(0xffffff, 3.2);
    sun.position.set(80, -60, 120);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -120;
    sun.shadow.camera.right = 120;
    sun.shadow.camera.top = 120;
    sun.shadow.camera.bottom = -120;
    scene.add(sun);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x202020, 1.0));
    scene.add(new THREE.AmbientLight(0xffffff, 0.25));

    // ---------- Colors (pygame-like) ----------
    const COL_ORANGE = new THREE.Color(1.0, 120 / 255, 0.0);
    const COL_YELLOW = new THREE.Color(1.0, 200 / 255, 0.0);

    // ---------- Layout (CENTRÃ‰ Ã€ Lâ€™ORIGINE) ----------
    // Ici on recentre la route, donc plus dâ€™Ã©cran noir
    const roadLen = 140;
    const roadW = 16;           // 4 voies
    const laneCount = 4;
    const laneW = roadW / laneCount;
    const workLaneIndex = 0;    // voie de droite

    function laneCenter(lane) { return -roadW / 2 + (lane + 0.5) * laneW; }
    const yWork = laneCenter(workLaneIndex);

    // ---------- Road ----------
    const asphaltMat = new THREE.MeshStandardMaterial({
      color: 0x1a1c1e, roughness: 0.95, metalness: 0.0
    });

    const road = new THREE.Mesh(new THREE.BoxGeometry(roadLen, roadW, 0.25), asphaltMat);
    // route centrÃ©e autour de X=40 (centre)
    road.position.set(40, 0, -0.13);
    road.receiveShadow = true;
    scene.add(road);

    // ---------- Road markings ----------
    const lineMat = new THREE.MeshStandardMaterial({
      color: 0xf2f2f2, roughness: 0.35,
      emissive: new THREE.Color(0x1a1a1a), emissiveIntensity: 0.7
    });

    function addDash(x, y) {
      const dash = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.12, 0.02), lineMat);
      dash.position.set(x, y, 0.02);
      dash.receiveShadow = true;
      scene.add(dash);
    }

    // dashes alignÃ©s sur la route centrÃ©e
    const xStart = 40 - roadLen / 2 + 2;
    const xEnd = 40 + roadLen / 2 - 2;

    for (let i = 1; i < laneCount; i++) {
      const y = -roadW / 2 + i * laneW;
      for (let x = xStart; x < xEnd; x += 3.2) addDash(x, y);
    }

    // edges
    function addEdge(y) {
      const edge = new THREE.Mesh(new THREE.BoxGeometry(roadLen, 0.14, 0.02), lineMat);
      edge.position.set(40, y, 0.02);
      scene.add(edge);
    }
    addEdge(roadW / 2);
    addEdge(-roadW / 2);

    // ---------- Lampadaires (cÃ´tÃ© opposÃ© de la route) ----------
    const lampPoleMat = new THREE.MeshStandardMaterial({ color: 0x5f666f, roughness: 0.45, metalness: 0.6 });
    const lampHeadMat = new THREE.MeshStandardMaterial({
      color: 0xe8edf2,
      emissive: new THREE.Color(0xffe6b0),
      emissiveIntensity: 0.9,
      roughness: 0.25
    });

    function addStreetLamp(x, y, withLight = false) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 4.2, 14), lampPoleMat);
      pole.rotation.x = Math.PI / 2;
      pole.position.set(x, y, 2.1);
      pole.castShadow = true;
      scene.add(pole);

      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.07, 0.07), lampPoleMat);
      arm.position.set(x - 0.18, y - 0.2, 4.05);
      scene.add(arm);

      const head = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.16, 0.09), lampHeadMat);
      head.position.set(x - 0.42, y - 0.2, 4.0);
      scene.add(head);

      if (withLight) {
        const glow = new THREE.PointLight(0xffe2ad, 0.35, 12, 2.0);
        glow.position.set(x - 0.42, y - 0.2, 3.85);
        scene.add(glow);
      }
    }

    const lampY = roadW / 2 + 2.2;
    const lampCount = 8;
    for (let i = 0; i < lampCount; i++) {
      const lx = xStart + 8 + i * ((xEnd - xStart - 16) / (lampCount - 1));
      addStreetLamp(lx, lampY, i % 2 === 0);
    }

    // ---------- Tapis ----------
    const X_TAPIS = -5;
    const TAPIS_LEN = 10;

    const rubberMat = new THREE.MeshStandardMaterial({ color: 0x0a0b0d, roughness: 0.97, metalness: 0.03 });
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x22272d, roughness: 0.55, metalness: 0.58 });
    const plateMat = new THREE.MeshStandardMaterial({ color: 0x11151a, roughness: 0.74, metalness: 0.20 });
    const markerOrange = new THREE.MeshStandardMaterial({
      color: 0xff7b14,
      roughness: 0.32,
      emissive: new THREE.Color(0xff7b14),
      emissiveIntensity: 0.30
    });
    const markerWhite = new THREE.MeshStandardMaterial({
      color: 0xebeff4,
      roughness: 0.22,
      emissive: new THREE.Color(0xdfe6ef),
      emissiveIntensity: 0.07
    });

    const tapis = new THREE.Mesh(new THREE.BoxGeometry(TAPIS_LEN, laneW * 0.98, 0.11), rubberMat);
    tapis.position.set(X_TAPIS + TAPIS_LEN / 2, yWork, 0.065);
    tapis.castShadow = true;
    tapis.receiveShadow = true;
    scene.add(tapis);

    const frameThick = 0.18;
    const innerW = laneW * 0.98;
    const innerTop = yWork + innerW / 2 - frameThick / 2;
    const innerBot = yWork - innerW / 2 + frameThick / 2;
    const frameZ = 0.128;

    const frameTop = new THREE.Mesh(new THREE.BoxGeometry(TAPIS_LEN, frameThick, 0.032), frameMat);
    frameTop.position.set(X_TAPIS + TAPIS_LEN / 2, innerTop, frameZ);
    const frameBot = new THREE.Mesh(new THREE.BoxGeometry(TAPIS_LEN, frameThick, 0.032), frameMat);
    frameBot.position.set(X_TAPIS + TAPIS_LEN / 2, innerBot, frameZ);
    const frameLeft = new THREE.Mesh(new THREE.BoxGeometry(frameThick, innerW, 0.032), frameMat);
    frameLeft.position.set(X_TAPIS + frameThick / 2, yWork, frameZ);
    const frameRight = new THREE.Mesh(new THREE.BoxGeometry(frameThick, innerW, 0.032), frameMat);
    frameRight.position.set(X_TAPIS + TAPIS_LEN - frameThick / 2, yWork, frameZ);

    [frameTop, frameBot, frameLeft, frameRight].forEach((p) => {
      p.castShadow = true;
      p.receiveShadow = true;
      scene.add(p);
    });

    const plateCount = 12;
    const padRows = 7;
    for (let i = 0; i < plateCount; i++) {
      const plateLen = TAPIS_LEN / plateCount;
      const px = X_TAPIS + (i + 0.5) * plateLen;
      const plate = new THREE.Mesh(new THREE.BoxGeometry(plateLen * 0.80, innerW * 0.84, 0.018), plateMat);
      plate.position.set(px, yWork, 0.121);
      plate.castShadow = true;
      plate.receiveShadow = true;
      scene.add(plate);

      const rowH = (innerW * 0.84) / (padRows + 0.8);
      for (let r = 0; r < padRows; r++) {
        const py = yWork - (innerW * 0.84) / 2 + rowH * (r + 0.9);
        const colorMat = ((i + r) % 2 === 0) ? markerOrange : markerWhite;
        const mark = new THREE.Mesh(
          new THREE.BoxGeometry(plateLen * 0.62, rowH * 0.66, 0.007),
          colorMat
        );
        mark.position.set(px, py, 0.135);
        mark.castShadow = true;
        scene.add(mark);
      }
    }

    const ledMat = new THREE.MeshStandardMaterial({
      color: 0xffd48a,
      emissive: new THREE.Color(0xffb23c),
      emissiveIntensity: 1.15,
      roughness: 0.2
    });
    const ledCount = 16;
    for (let i = 0; i < ledCount; i++) {
      const lx = X_TAPIS + (i + 0.5) * (TAPIS_LEN / ledCount);
      const topLed = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.048, 0.018, 14), ledMat);
      topLed.rotation.x = Math.PI / 2;
      topLed.position.set(lx, yWork + innerW * 0.46, 0.132);
      const botLed = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.048, 0.018, 14), ledMat);
      botLed.rotation.x = Math.PI / 2;
      botLed.position.set(lx, yWork - innerW * 0.46, 0.132);
      scene.add(topLed, botLed);
    }

    // ---------- Zone tampon + chantier ----------
    const TAPIS_BUFFER_GAP = 6;
    const X_ZONE = X_TAPIS + TAPIS_LEN + TAPIS_BUFFER_GAP;
    const BUFFER_LEN = 26;
    const X_WORK = X_ZONE + BUFFER_LEN - 6.5;
    const WORK_LEN = 20;

    const bufferMat = new THREE.MeshStandardMaterial({ color: 0x2ea8ff, roughness: 0.7 });
    const workMat = new THREE.MeshStandardMaterial({ color: 0xffbf1f, roughness: 0.7 });

    const buffer = new THREE.Mesh(new THREE.BoxGeometry(BUFFER_LEN, laneW * 0.98, 0.02), bufferMat);
    buffer.position.set(X_ZONE + BUFFER_LEN / 2, yWork, 0.01);
    buffer.receiveShadow = true;
    scene.add(buffer);

    const work = new THREE.Mesh(new THREE.BoxGeometry(WORK_LEN, laneW * 0.98, 0.02), workMat);
    work.position.set(X_WORK + WORK_LEN / 2, yWork, 0.01);
    work.receiveShadow = true;
    scene.add(work);

    // ---------- Cones ----------
    const coneMat = new THREE.MeshStandardMaterial({ color: 0xff6b00, roughness: 0.35 });
    const bandMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25 });

    function addCone(x, y) {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.6, 16), coneMat);
      cone.rotation.x = Math.PI / 2;
      cone.position.set(x, y, 0.30);
      cone.castShadow = true;
      scene.add(cone);

      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.06, 16), bandMat);
      band.rotation.x = Math.PI / 2;
      band.position.set(x, y, 0.36);
      band.castShadow = true;
      scene.add(band);
    }

    const coneStart = X_ZONE + 8;
    const coneEnd = X_WORK + WORK_LEN;
    const coneCount = 12;
    const coneY = yWork + laneW / 2 - 0.25;
    for (let i = 0; i < coneCount; i++) {
      const x = coneStart + i * ((coneEnd - coneStart) / (coneCount - 1));
      addCone(x, coneY);
    }

    // cÃ´nes manquants au niveau du FLR pour complÃ©ter la ligne
    const flrConeStart = X_ZONE + 2.4;
    const flrConeEnd = coneStart - 0.8;
    const flrConeCount = 4;
    for (let i = 0; i < flrConeCount; i++) {
      const x = flrConeStart + i * ((flrConeEnd - flrConeStart) / (flrConeCount - 1));
      addCone(x, coneY);
    }

    // fermeture entre tapis et zone tampon
    const closureX = X_ZONE - 1.0;
    const closureCount = 5;
    for (let i = 0; i < closureCount; i++) {
      const y = yWork - laneW / 2 + 0.35 + i * ((laneW - 0.7) / (closureCount - 1));
      addCone(closureX, y);
    }

    // ---------- Truck FLR ----------
    const truckGroup = new THREE.Group();
    scene.add(truckGroup);

    const truckBodyMat = new THREE.MeshStandardMaterial({ color: 0xffc000, roughness: 0.35 });
    const truckDarkMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.75 });

    const truckX = X_ZONE + 4;

    const body = new THREE.Mesh(new THREE.BoxGeometry(3.0, 1.2, 0.9), truckBodyMat);
    body.position.set(truckX, yWork, 0.45);
    body.castShadow = true;
    truckGroup.add(body);

    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.0, 0.8), truckBodyMat);
    cab.position.set(truckX + 1.1, yWork, 0.55);
    cab.castShadow = true;
    truckGroup.add(cab);

    function addWheel(dx, dy) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.25, 20), truckDarkMat);
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(truckX + dx, yWork + dy, 0.20);
      wheel.castShadow = true;
      truckGroup.add(wheel);
    }
    addWheel(-1.0, -0.45); addWheel(-1.0, 0.45);
    addWheel(1.0, -0.45); addWheel(1.0, 0.45);

    const gyroMat = new THREE.MeshStandardMaterial({
      color: 0xff6b00,
      emissive: new THREE.Color(0xff6b00),
      emissiveIntensity: 2.2, roughness: 0.2
    });
    const gyro = new THREE.Mesh(new THREE.SphereGeometry(0.14, 18, 18), gyroMat);
    gyro.position.set(truckX, yWork, 1.02);
    truckGroup.add(gyro);

    const alertMat = new THREE.MeshStandardMaterial({
      color: 0xff0000,
      emissive: new THREE.Color(0xff0000),
      emissiveIntensity: 2.6
    });
    const alertIcon = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.10, 0.9), alertMat);
    alertIcon.position.set(truckX, yWork, 1.8);
    alertIcon.scale.set(0, 0, 0);
    truckGroup.add(alertIcon);

    // ---------- CamÃ©ra intelligente FLR ----------
    const flrMast = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 1.4, 14),
      new THREE.MeshStandardMaterial({ color: 0x2b2f35, roughness: 0.5 })
    );
    flrMast.rotation.x = Math.PI / 2;
    flrMast.position.set(truckX - 0.35, yWork + 0.10, 1.35);
    flrMast.castShadow = true;
    truckGroup.add(flrMast);

    const flrCamMat = new THREE.MeshStandardMaterial({
      color: 0x171b20,
      roughness: 0.25,
      emissive: new THREE.Color(0x7bd3ff),
      emissiveIntensity: 0.35
    });
    const flrCamHead = new THREE.Mesh(new THREE.SphereGeometry(0.18, 18, 18), flrCamMat);
    flrCamHead.position.set(truckX - 0.35, yWork + 0.10, 2.08);
    flrCamHead.castShadow = true;
    truckGroup.add(flrCamHead);

    const flrCamLens = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 14, 14),
      new THREE.MeshStandardMaterial({
        color: 0x8fdcff,
        emissive: new THREE.Color(0x8fdcff),
        emissiveIntensity: 1.1,
        roughness: 0.1
      })
    );
    flrCamLens.position.set(truckX - 0.18, yWork + 0.10, 2.08);
    truckGroup.add(flrCamLens);

    const signalOrigin = new THREE.Vector3(truckX - 0.18, yWork + 0.10, 2.08);

    // ---------- Ouvriers + casques connectÃ©s ----------
    const workers = [];

    function addWorker(x, y) {
      const worker = new THREE.Group();

      const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.34, 0.28, 0.90),
        new THREE.MeshStandardMaterial({ color: 0xff8c1a, roughness: 0.7 })
      );
      body.position.set(0, 0, 0.45);
      body.castShadow = true;
      worker.add(body);

      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.14, 16, 16),
        new THREE.MeshStandardMaterial({ color: 0xf0c9a0, roughness: 0.8 })
      );
      head.position.set(0, 0, 1.00);
      head.castShadow = true;
      worker.add(head);

      const helmet = new THREE.Mesh(
        new THREE.SphereGeometry(0.17, 16, 16),
        new THREE.MeshStandardMaterial({ color: 0xffb000, roughness: 0.35 })
      );
      helmet.position.set(0, 0, 1.07);
      helmet.castShadow = true;
      worker.add(helmet);

      const headsetMat = new THREE.MeshStandardMaterial({
        color: 0x47b8ff,
        emissive: new THREE.Color(0x47b8ff),
        emissiveIntensity: 0.2,
        roughness: 0.2
      });
      const headset = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.035, 12, 28), headsetMat);
      headset.rotation.x = Math.PI / 2;
      headset.position.set(0, 0, 1.07);
      worker.add(headset);

      const pulse = new THREE.Mesh(
        new THREE.TorusGeometry(0.24, 0.02, 10, 30),
        new THREE.MeshBasicMaterial({ color: 0x8edcff, transparent: true, opacity: 0 })
      );
      pulse.rotation.x = Math.PI / 2;
      pulse.position.set(0, 0, 1.07);
      pulse.scale.setScalar(0.001);
      worker.add(pulse);

      worker.position.set(x, y, 0);
      scene.add(worker);

      const helmetTarget = new THREE.Vector3(x, y, 1.07);
      const link = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([signalOrigin, helmetTarget]),
        new THREE.LineBasicMaterial({ color: 0x88d9ff, transparent: true, opacity: 0, depthTest: false })
      );
      link.renderOrder = 5;
      scene.add(link);

      workers.push({ headsetMat, pulse, link, helmetTarget, phase: Math.random() * Math.PI * 2 });
    }

    addWorker(X_WORK + 6.0, yWork - 0.95);
    addWorker(X_WORK + 12.2, yWork - 0.55);

    // ---------- Ã‰lÃ©ments rÃ©alistes de chantier ----------
    const siteGroup = new THREE.Group();
    scene.add(siteGroup);

    const steelMat = new THREE.MeshStandardMaterial({ color: 0x8d98a3, roughness: 0.45, metalness: 0.55 });
    const hazardMat = new THREE.MeshStandardMaterial({ color: 0xff7a1a, roughness: 0.6 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x7a5534, roughness: 0.88 });

    function addBarrierRail(x, y, length = 2.4) {
      const g = new THREE.Group();

      const rail = new THREE.Mesh(new THREE.BoxGeometry(length, 0.12, 0.36), hazardMat);
      rail.position.set(0, 0, 0.48);
      rail.castShadow = true;
      g.add(rail);

      const leg1 = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.50), steelMat);
      const leg2 = leg1.clone();
      leg1.position.set(-length * 0.36, 0, 0.25);
      leg2.position.set(length * 0.36, 0, 0.25);
      leg1.castShadow = true;
      leg2.castShadow = true;
      g.add(leg1, leg2);

      const foot1 = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.22, 0.08), new THREE.MeshStandardMaterial({ color: 0x2f3338, roughness: 0.7 }));
      const foot2 = foot1.clone();
      foot1.position.set(-length * 0.36, 0, 0.04);
      foot2.position.set(length * 0.36, 0, 0.04);
      g.add(foot1, foot2);

      g.position.set(x, y, 0);
      siteGroup.add(g);
    }

    function addFencePanel(x, y) {
      const frame = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.05, 1.25), steelMat);
      frame.position.set(x, y, 0.75);
      frame.castShadow = true;
      siteGroup.add(frame);

      const postL = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.3, 12), steelMat);
      const postR = postL.clone();
      postL.rotation.x = Math.PI / 2;
      postR.rotation.x = Math.PI / 2;
      postL.position.set(x - 1.25, y, 0.65);
      postR.position.set(x + 1.25, y, 0.65);
      siteGroup.add(postL, postR);
    }

    function addPalletStack(x, y, levels = 2) {
      for (let i = 0; i < levels; i++) {
        const pallet = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.9, 0.12), woodMat);
        pallet.position.set(x, y, 0.06 + i * 0.15);
        pallet.castShadow = true;
        pallet.receiveShadow = true;
        siteGroup.add(pallet);
      }
      const load = new THREE.Mesh(
        new THREE.BoxGeometry(0.95, 0.65, 0.55),
        new THREE.MeshStandardMaterial({ color: 0xb4b8bc, roughness: 0.9 })
      );
      load.position.set(x, y, 0.55 + levels * 0.15);
      load.castShadow = true;
      siteGroup.add(load);
    }

    function addToolCrate(x, y, color = 0xd6551f) {
      const crate = new THREE.Mesh(
        new THREE.BoxGeometry(0.65, 0.45, 0.42),
        new THREE.MeshStandardMaterial({ color, roughness: 0.5 })
      );
      crate.position.set(x, y, 0.21);
      crate.castShadow = true;
      siteGroup.add(crate);
    }

    function addCableReel(x, y) {
      const reel = new THREE.Mesh(
        new THREE.TorusGeometry(0.22, 0.07, 14, 30),
        new THREE.MeshStandardMaterial({ color: 0x1a1d22, roughness: 0.45 })
      );
      reel.rotation.x = Math.PI / 2;
      reel.position.set(x, y, 0.22);
      reel.castShadow = true;
      siteGroup.add(reel);
    }

    function addLightTower(x, y) {
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.8, 14), steelMat);
      mast.rotation.x = Math.PI / 2;
      mast.position.set(x, y, 1.45);
      mast.castShadow = true;
      siteGroup.add(mast);

      const head = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 0.22, 0.28),
        new THREE.MeshStandardMaterial({ color: 0xeff4ff, emissive: new THREE.Color(0xc4dcff), emissiveIntensity: 0.9 })
      );
      head.position.set(x, y, 2.95);
      siteGroup.add(head);

      const light = new THREE.PointLight(0xaad0ff, 0.9, 18, 2);
      light.position.set(x, y - 0.15, 2.8);
      siteGroup.add(light);
    }

    const sideY = yWork - laneW * 0.82;
    for (let i = 0; i < 6; i++) {
      addBarrierRail(X_ZONE + 3.5 + i * 4.2, sideY, 2.5);
    }

    addFencePanel(X_WORK + 4.2, sideY - 0.55);
    addFencePanel(X_WORK + 8.0, sideY - 0.55);
    addPalletStack(X_WORK + 5.0, sideY - 1.1, 2);
    addPalletStack(X_WORK + 10.6, sideY - 1.0, 1);
    addToolCrate(X_WORK + 7.1, sideY - 1.2);
    addToolCrate(X_WORK + 11.8, sideY - 1.15, 0xf08a1b);
    addCableReel(X_WORK + 13.6, sideY - 1.0);
    addLightTower(X_WORK + 16.0, sideY - 1.35);

    function updateFlrSignal(active) {
      const t = performance.now() * 0.007;

      flrCamMat.emissiveIntensity = active ? 1.0 + 0.9 * (0.5 + 0.5 * Math.sin(t * 1.5)) : 0.35;

      for (const worker of workers) {
        const p = 0.5 + 0.5 * Math.sin(t + worker.phase);

        worker.link.material.opacity = active ? 0.2 + 0.55 * p : 0;
        worker.headsetMat.emissiveIntensity = active ? 0.7 + 1.5 * p : 0.2;

        if (active) {
          worker.pulse.scale.setScalar(0.45 + p * 1.05);
          worker.pulse.material.opacity = 0.40 * (1 - p * 0.5);
        } else {
          worker.pulse.scale.setScalar(0.001);
          worker.pulse.material.opacity = 0;
        }
      }
    }

    // ---------- Cars ----------
    const cars = [];
    const carGeom = new THREE.BoxGeometry(2.0, 0.9, 0.55);
    const roofGeom = new THREE.BoxGeometry(1.1, 0.8, 0.30);

    function createCar(i) {
      const g = new THREE.Group();
      const col = new THREE.Color(Math.random() * 0.7 + 0.2, Math.random() * 0.7 + 0.2, Math.random() * 0.7 + 0.2);
      const mat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.35 });
      const body = new THREE.Mesh(carGeom, mat);
      body.castShadow = true;
      g.add(body);

      const roof = new THREE.Mesh(roofGeom, new THREE.MeshStandardMaterial({ color: 0x202428, roughness: 0.25 }));
      roof.position.set(-0.1, 0, 0.32);
      roof.castShadow = true;
      g.add(roof);

      g.userData.lane = Math.floor(Math.random() * laneCount);
      g.userData.speedBase = 0.22 + Math.random() * 0.08;

      // spawn avant la route
      g.position.set(xStart - i * 6 - Math.random() * 2, laneCenter(g.userData.lane), 0.30);
      scene.add(g);
      cars.push(g);
    }

    for (let i = 0; i < 14; i++) createCar(i);

    // ---------- HUD ----------
    const riskEl = document.getElementById("risk");
    const pill = document.getElementById("pill");
    const sTraffic = document.getElementById("sTraffic");
    const sCars = document.getElementById("sCars");
    const sCam = document.getElementById("sCam");
    const sSim = document.getElementById("sSim");
    const sSignal = document.getElementById("sSignal");
    const sSignalChip = document.getElementById("sSignalChip");

    let flrSignalActive = false;

    let cinematicActive = false;
    let cinematicSegment = -1;

    function refreshTopStatus() {
      sTraffic.textContent = trafficSlider.value;
      sCars.textContent = String(cars.length);
      sCam.textContent = cinematicActive
        ? `CinÃ© ${Math.max(1, Math.min(3, cinematicSegment + 1))}/3`
        : (topMode ? "Top" : (followMode ? "Suivi" : "Libre"));
      sSim.textContent = paused ? "Pause" : "Active";
      sSignal.textContent = flrSignalActive ? "Alerte" : "Standby";
      sSignalChip.classList.toggle("sAlertOn", flrSignalActive);
    }

    function setRisk(pct) {
      pct = Math.max(0, Math.min(100, Math.floor(pct)));
      riskEl.textContent = pct + "%";
      pill.className = "";
      if (pct < 35) {
        pill.classList.add("ok");
        pill.textContent = "OK â€” surveillance active";
      } else if (pct < 70) {
        pill.classList.add("warn");
        pill.textContent = "ATTENTION â€” ouvriers vigilants";
      } else {
        pill.classList.add("bad");
        pill.textContent = "ALERTE OUVRIERS â€” risque Ã©levÃ©";
      }
    }

    // ---------- Traffic update (anti-collision par voie) ----------
    function updateTraffic(dt) {
      const lanes = Array.from({ length: laneCount }, () => []);
      cars.forEach(c => lanes[c.userData.lane].push(c));
      lanes.forEach(arr => arr.sort((a, b) => a.position.x - b.position.x));

      let alertActive = false;
      let maxRisk = 0;

      for (let lane = 0; lane < laneCount; lane++) {
        const arr = lanes[lane];
        for (let i = 0; i < arr.length; i++) {
          const car = arr[i];
          let speed = car.userData.speedBase;
          const x = car.position.x;
          const prevX = car.position.x;

          // ralentir sur tapis (voie chantier)
          if (lane === workLaneIndex && x >= X_TAPIS && x <= X_TAPIS + TAPIS_LEN) {
            speed *= 0.45;
            alertActive = true;
          }

          // distance sÃ©curitÃ©
          if (i < arr.length - 1) {
            const front = arr[i + 1];
            const dist = front.position.x - car.position.x;
            if (dist < 3.0) speed *= 0.10;
            else if (dist < 6.0) speed *= 0.55;
          }

          // rabattement automatique
          if (car.userData.lane === workLaneIndex && car.position.x > X_TAPIS + 2.5) {
            car.userData.laneTarget = workLaneIndex + 1;
          } else {
            car.userData.laneTarget = car.userData.lane;
          }

          // interpolation Y
          const targetY = laneCenter(car.userData.laneTarget);
          const dy = targetY - car.position.y;
          car.position.y += dy * 0.06;
          car.rotation.z = -dy * 0.08;

          if (Math.abs(dy) < 0.02) {
            car.userData.lane = car.userData.laneTarget;
            car.rotation.z = 0;
          }

          // avance
          car.position.x += speed * (dt * 60);

          if (lane === workLaneIndex && prevX < X_TAPIS && car.position.x >= X_TAPIS) {
            tryStartCinematic(car);
          }

          // boucle
          if (car.position.x > xEnd + 40) {
            car.position.x = xStart - 40; // Les voitures rÃ©apparaissent loin derriÃ¨re la camÃ©ra
          }

          // scoring risque : proche de la zone tampon sur voie chantier
          if (lane === workLaneIndex) {
            const dx = (car.position.x - (X_ZONE - 2));
            if (dx > -10 && dx < 18) {
              const r = Math.max(0, 100 - Math.floor(Math.abs(dx) * 7));
              maxRisk = Math.max(maxRisk, r);
            }
          }
        }
      }

      // gyro blink
      const t = performance.now() * 0.005;
      gyro.material.emissiveIntensity = (Math.sin(t) > 0 ? 2.8 : 0.4);

      // icon alert
      alertIcon.scale.setScalar(alertActive ? 1 : 0);
      flrSignalActive = alertActive;
      updateFlrSignal(alertActive);
      refreshTopStatus();

      setRisk(maxRisk);
    }

    // ---------- Camera modes ----------
    let followMode = false;
    let topMode = false;

    let cinematicTime = 0;
    let cinematicCooldownUntil = 0;
    let cinematicPlan1 = null;
    let cinematicPlan2 = null;
    let cinematicPlan3 = null;
    let cinematicStartPos = null;
    let cinematicStartTarget = null;

    const CIN_SEG_A = 1.0;
    const CIN_SEG_B = 1.0;
    const CIN_SEG_C = 1.0;
    const CIN_SEG_HOLD = 0.9;
    const CIN_SEG_OUT = 1.0;
    const CIN_COOLDOWN = 4.5;

    function easeInOutCubic(t) {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    function setCameraFrame(pos, target) {
      camera.position.copy(pos);
      controls.target.copy(target);
    }

    function mixCameraFrames(fromPos, fromTarget, toPos, toTarget, t) {
      const tt = easeInOutCubic(Math.max(0, Math.min(1, t)));
      camera.position.lerpVectors(fromPos, toPos, tt);
      controls.target.lerpVectors(fromTarget, toTarget, tt);
    }

    function tryStartCinematic(triggerCar) {
      const now = performance.now() * 0.001;
      if (cinematicActive || now < cinematicCooldownUntil || topMode || followMode) return;

      const helmet = workers[0]?.helmetTarget || new THREE.Vector3(X_WORK + 6.0, yWork - 0.95, 1.07);
      const carX = triggerCar ? triggerCar.position.x : (X_TAPIS + TAPIS_LEN * 0.5);

      cinematicPlan1 = {
        pos: new THREE.Vector3(carX - 3.2, yWork - 2.0, 1.55),
        target: new THREE.Vector3(carX + 1.8, yWork, 0.42)
      };

      cinematicPlan2 = {
        pos: new THREE.Vector3(truckX - 2.9, yWork - 2.05, 1.9),
        target: signalOrigin.clone()
      };

      cinematicPlan3 = {
        pos: helmet.clone().add(new THREE.Vector3(-1.25, -1.0, 0.55)),
        target: helmet.clone()
      };

      cinematicStartPos = camera.position.clone();
      cinematicStartTarget = controls.target.clone();
      cinematicTime = 0;
      cinematicSegment = 0;
      cinematicActive = true;
      controls.enabled = false;
      refreshTopStatus();
    }

    function updateCinematic(dt) {
      if (!cinematicActive) return;

      cinematicTime += dt;
      const tA = CIN_SEG_A;
      const tB = tA + CIN_SEG_B;
      const tC = tB + CIN_SEG_C;
      const tHold = tC + CIN_SEG_HOLD;
      const tOut = tHold + CIN_SEG_OUT;

      if (cinematicTime < tA) {
        cinematicSegment = 0;
        mixCameraFrames(cinematicStartPos, cinematicStartTarget, cinematicPlan1.pos, cinematicPlan1.target, cinematicTime / CIN_SEG_A);
      } else if (cinematicTime < tB) {
        cinematicSegment = 1;
        mixCameraFrames(cinematicPlan1.pos, cinematicPlan1.target, cinematicPlan2.pos, cinematicPlan2.target, (cinematicTime - tA) / CIN_SEG_B);
      } else if (cinematicTime < tC) {
        cinematicSegment = 2;
        mixCameraFrames(cinematicPlan2.pos, cinematicPlan2.target, cinematicPlan3.pos, cinematicPlan3.target, (cinematicTime - tB) / CIN_SEG_C);
      } else if (cinematicTime < tHold) {
        cinematicSegment = 2;
        setCameraFrame(cinematicPlan3.pos, cinematicPlan3.target);
      } else if (cinematicTime < tOut) {
        cinematicSegment = 2;
        mixCameraFrames(cinematicPlan3.pos, cinematicPlan3.target, new THREE.Vector3(-14, -24, 10.5), SCENE_CENTER, (cinematicTime - tHold) / CIN_SEG_OUT);
      } else {
        cinematicActive = false;
        cinematicSegment = -1;
        cinematicCooldownUntil = performance.now() * 0.001 + CIN_COOLDOWN;
        controls.enabled = true;
        setCameraFrame(new THREE.Vector3(-14, -24, 10.5), SCENE_CENTER);
        refreshTopStatus();
      }
    }

    function resetCamera() {
      followMode = false;
      topMode = false;
      cinematicActive = false;
      cinematicSegment = -1;
      controls.enabled = true;
      camera.position.set(-14, -24, 10.5); // vue diagonale plus haute comme le screen
      controls.target.copy(SCENE_CENTER);
      controls.update();
      refreshTopStatus();
    }

    // traffic slider
    const trafficSlider = document.getElementById("traffic");
    trafficSlider.addEventListener("input", () => {
      const desired = parseInt(trafficSlider.value, 10);
      while (cars.length < desired) createCar(cars.length);
      while (cars.length > desired) {
        const c = cars.pop();
        scene.remove(c);
      }
      refreshTopStatus();
    });

    let paused = false;
    const btnPlay = document.getElementById("btnPlay");
    btnPlay.onclick = () => {
      paused = !paused;
      btnPlay.textContent = paused ? "Play" : "Pause";
      refreshTopStatus();
    };

    // ---------- Animation loop ----------
    const clock = new THREE.Clock();
    function animate() {
      requestAnimationFrame(animate);
      const dt = clock.getDelta();
      if (!paused) updateTraffic(dt);

      if (cinematicActive) {
        updateCinematic(dt);
      }

      if (followMode && !cinematicActive) {
        // suit la voiture la plus avancÃ©e sur voie chantier
        let best = null;
        for (const c of cars) {
          if (c.userData.lane === workLaneIndex) {
            if (!best || c.position.x > best.position.x) best = c;
          }
        }
        if (best) {
          const desiredPos = new THREE.Vector3(best.position.x - 10, best.position.y - 10, 7.0);
          camera.position.lerp(desiredPos, 0.06);
          controls.target.lerp(new THREE.Vector3(best.position.x + 12, 0, 0), 0.06);
        }
      }

      if (topMode && !cinematicActive) {
        const desiredPos = new THREE.Vector3(40, -28, 28);
        camera.position.lerp(desiredPos, 0.06);
        controls.target.lerp(new THREE.Vector3(40, 0, 0), 0.06);
      }

      controls.update();
      composer.render();
    }
    animate();

    addEventListener("resize", () => {
      camera.aspect = innerWidth / innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(innerWidth, innerHeight);
      composer.setSize(innerWidth, innerHeight);
      bloom.setSize(innerWidth, innerHeight);
    });

    // sÃ©curitÃ©: reset au chargement
    resetCamera();
    refreshTopStatus();
