import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createRobot } from './robot.js';
import { ANIMATIONS, ANIMATION_KEYS, resetPose } from './animations.js';

// ====== 全局状态 ======
const state = {
  currentAnim: 'idle',
  prevAnim: null,
  blendStart: 0,
  blendDuration: 0.35,
  startTime: performance.now() / 1000
};

// ====== 渲染器 ======
const canvas = document.getElementById('scene-canvas');
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: false,
  powerPreference: 'high-performance'
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// ====== 场景与雾 ======
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05080d);
scene.fog = new THREE.Fog(0x05080d, 6, 22);

// ====== 相机 ======
// 拉远 + fov 调整，确保整个 1.75 m 的机器人在画面中央且全身可见
const camera = new THREE.PerspectiveCamera(
  36,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(2.6, 1.55, 6.4);
camera.lookAt(0, 1.05, 0);

// ====== 控制器 ======
const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 1.05, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 2.2;
controls.maxDistance = 10;
controls.maxPolarAngle = Math.PI * 0.52;
controls.minPolarAngle = Math.PI * 0.15;
controls.autoRotate = false;
controls.autoRotateSpeed = 0.6;

// ====== 灯光 ======
// 环境
scene.add(new THREE.HemisphereLight(0x8ab4d4, 0x101820, 0.55));

// 主光（冷白）
const keyLight = new THREE.DirectionalLight(0xeaf4ff, 2.2);
keyLight.position.set(3, 5, 3);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
keyLight.shadow.camera.left = -2.5;
keyLight.shadow.camera.right = 2.5;
keyLight.shadow.camera.top = 3.5;
keyLight.shadow.camera.bottom = -0.5;
keyLight.shadow.camera.near = 0.5;
keyLight.shadow.camera.far = 12;
keyLight.shadow.bias = -0.0005;
keyLight.shadow.normalBias = 0.02;
scene.add(keyLight);

// 补光（青色边缘光）
const rimLight = new THREE.DirectionalLight(0x00d4ff, 1.4);
rimLight.position.set(-4, 2.5, -3);
scene.add(rimLight);

// 后侧光
const backLight = new THREE.DirectionalLight(0x3a6f9e, 0.7);
backLight.position.set(0, 3, -4);
scene.add(backLight);

// 顶补光
const topLight = new THREE.SpotLight(0xffffff, 0.6, 12, Math.PI / 5, 0.4, 1.4);
topLight.position.set(0, 6, 0);
topLight.target.position.set(0, 0, 0);
scene.add(topLight);
scene.add(topLight.target);

// ====== 地板 ======
const floorGroup = new THREE.Group();
scene.add(floorGroup);

// 主圆盘
const floorMat = new THREE.MeshStandardMaterial({
  color: 0x0a1018,
  metalness: 0.4,
  roughness: 0.65
});
const floor = new THREE.Mesh(new THREE.CircleGeometry(6, 64), floorMat);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
floorGroup.add(floor);

// 地面环形发光
function ring(radius, thickness, color, opacity = 0.55) {
  const geo = new THREE.RingGeometry(radius, radius + thickness, 96);
  const mat = new THREE.MeshBasicMaterial({
    color, transparent: true, opacity, side: THREE.DoubleSide
  });
  const m = new THREE.Mesh(geo, mat);
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.001;
  return m;
}
floorGroup.add(ring(0.7, 0.008, 0x00d4ff, 0.9));
floorGroup.add(ring(1.4, 0.005, 0x00d4ff, 0.5));
floorGroup.add(ring(2.6, 0.004, 0x00d4ff, 0.25));
floorGroup.add(ring(4.0, 0.003, 0x00d4ff, 0.15));

// 地面雕刻线（十字网格）
const gridGroup = new THREE.Group();
for (let i = -4; i <= 4; i++) {
  if (i === 0) continue;
  const bar = new THREE.Mesh(
    new THREE.BoxGeometry(0.004, 0.001, 7),
    new THREE.MeshBasicMaterial({ color: 0x0a3a52, transparent: true, opacity: 0.5 })
  );
  bar.position.set(i * 0.6, 0.001, 0);
  gridGroup.add(bar);
  const bar2 = bar.clone();
  bar2.rotation.y = Math.PI / 2;
  bar2.position.set(0, 0.001, i * 0.6);
  gridGroup.add(bar2);
}
floorGroup.add(gridGroup);

// 中央十字标记
const cross = new THREE.Group();
const crossMat = new THREE.MeshBasicMaterial({ color: 0x00d4ff, transparent: true, opacity: 0.8 });
const ch = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.002, 0.012), crossMat);
const cv = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.002, 0.42), crossMat);
ch.position.y = cv.position.y = 0.002;
cross.add(ch); cross.add(cv);
floorGroup.add(cross);

// 远景点状粒子（星空感）
function buildStars() {
  const count = 800;
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const r = 18 + Math.random() * 6;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(Math.random() * 2 - 1);
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.cos(phi) * 0.6 + 3;
    positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  }
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    color: 0x8ec5dc, size: 0.025, transparent: true, opacity: 0.7,
    sizeAttenuation: true, depthWrite: false
  });
  return new THREE.Points(geo, mat);
}
scene.add(buildStars());

// ====== 机器人 ======
const { root: robot, joints } = createRobot();
scene.add(robot);

// 机器人底部追加一道发光底座光环（强化科幻感）
const baseGlow = new THREE.Mesh(
  new THREE.CylinderGeometry(0.4, 0.6, 0.02, 32),
  new THREE.MeshBasicMaterial({ color: 0x00d4ff, transparent: true, opacity: 0.35 })
);
baseGlow.position.y = 0.01;
scene.add(baseGlow);

// ====== UI 接线 ======
const animGridEl = document.getElementById('anim-grid');
const currentActionEl = document.getElementById('current-action');

function buildAnimButtons() {
  ANIMATION_KEYS.forEach((key, idx) => {
    const meta = ANIMATIONS[key];
    const btn = document.createElement('button');
    btn.className = 'anim-btn';
    btn.dataset.anim = key;
    btn.innerHTML = `${meta.cn} · ${meta.label}<span class="key">${idx + 1}</span>`;
    if (key === state.currentAnim) btn.classList.add('active');
    btn.addEventListener('click', () => setAnim(key));
    animGridEl.appendChild(btn);
  });
}

function setAnim(key) {
  if (!ANIMATIONS[key] || key === state.currentAnim) return;
  state.prevAnim = state.currentAnim;
  state.currentAnim = key;
  state.blendStart = performance.now() / 1000;
  // 更新按钮高亮
  document.querySelectorAll('.anim-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.anim === key);
  });
  const meta = ANIMATIONS[key];
  currentActionEl.textContent = `${meta.label} · ${meta.cn}`;
}

buildAnimButtons();

// 键盘 1~9 切换
window.addEventListener('keydown', (e) => {
  const n = parseInt(e.key, 10);
  if (!isNaN(n) && n >= 1 && n <= ANIMATION_KEYS.length) {
    setAnim(ANIMATION_KEYS[n - 1]);
  } else if (e.key === 'r' || e.key === 'R') {
    controls.autoRotate = !controls.autoRotate;
  }
});

// ====== 主循环 ======
function blendPoses(targetFn, prevFn, t, blendT) {
  // 简单做法：先应用前一个动作，捕获快照 -> 应用目标动作 -> 线性插值
  // 为了流畅，先 reset，应用前一个动作并保存所有关节四元数，再应用新动作并插值
  const snapshots = new Map();
  resetPose(joints);
  prevFn(joints, t);
  for (const key in joints) {
    const j = joints[key];
    if (j && j.isObject3D) {
      snapshots.set(j, {
        q: j.quaternion.clone(),
        p: j.position.clone()
      });
    }
  }
  resetPose(joints);
  targetFn(joints, t);
  for (const [j, snap] of snapshots) {
    j.quaternion.slerp(snap.q, 1 - blendT); // 新姿态 * blendT + 旧姿态 * (1-blendT)? 我们要新姿态比例 = blendT
    // 上面那行实际是：把 j.quaternion（=新姿态）向 snap.q（=旧姿态）插值 (1-blendT)。
    // 当 blendT=1（动画末），new 与 snap 混合系数为0，保留新；blendT=0 时混合到旧。✔︎
    j.position.lerpVectors(snap.p, j.position, blendT);
  }
}

const clock = new THREE.Clock();
let time = 0;

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  time += dt;

  const animMeta = ANIMATIONS[state.currentAnim];
  const prevMeta = state.prevAnim ? ANIMATIONS[state.prevAnim] : null;

  if (prevMeta) {
    const elapsed = performance.now() / 1000 - state.blendStart;
    const blendT = Math.min(elapsed / state.blendDuration, 1);
    if (blendT >= 1) {
      state.prevAnim = null;
      resetPose(joints);
      animMeta.fn(joints, time);
    } else {
      blendPoses(animMeta.fn, prevMeta.fn, time, blendT);
    }
  } else {
    resetPose(joints);
    animMeta.fn(joints, time);
  }

  // 底座光晕随节奏微动
  const pulse = 0.32 + Math.sin(time * 2) * 0.06;
  baseGlow.material.opacity = pulse;
  baseGlow.scale.setScalar(1 + Math.sin(time * 1.5) * 0.04);

  controls.update();
  renderer.render(scene, camera);
}

// ====== 自适应 ======
// 机器人真实高度 ~ 1.95（脚到头），target 设在中心 1.05。
// HUD 底部动作面板 + 顶部品牌区会占掉一部分屏幕空间，所以世界视野要预留余量。
// 这里把"需框入的世界高度"放大到 3.0，再按屏宽再次保险，确保竖屏/带 HUD 时全身仍然可见。
const ROBOT_FRAME_HEIGHT = 3.0;
function fitCameraToRobot() {
  const aspect = camera.aspect;
  const vFov = THREE.MathUtils.degToRad(camera.fov);

  // 估算屏幕被 HUD 遮挡后的"安全垂直比例"
  // 底部面板 ~ 200 px、顶部 brand ~ 80 px，做一个粗略动态比例
  const h = window.innerHeight;
  const safeRatio = Math.max(0.55, (h - 280) / h);
  // 想让机器人占满安全区 -> 世界视野要等比放大
  const frameH = ROBOT_FRAME_HEIGHT / safeRatio;

  // 垂直方向需要的距离
  const distV = (frameH / 2) / Math.tan(vFov / 2);
  // 水平方向（竖屏 / 窄屏）
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);
  const distH = (ROBOT_FRAME_HEIGHT * 0.45) / Math.tan(hFov / 2);
  const dist = Math.max(distV, distH) * 1.04;

  // 保留当前观察方向，只调整距离
  const dir = new THREE.Vector3().subVectors(camera.position, controls.target).normalize();
  camera.position.copy(controls.target).add(dir.multiplyScalar(dist));
  camera.updateProjectionMatrix();
}

function onResize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
  fitCameraToRobot();
}
window.addEventListener('resize', onResize);
fitCameraToRobot();

// 启动
animate();

// 隐藏 loader
setTimeout(() => {
  document.getElementById('loader')?.classList.add('hidden');
}, 350);
