import * as THREE from 'three';

/**
 * 构建 ANDROID A-01 人形机器人
 * 整体身高约 1.75 单位（1 单位 = 1 米）
 * 比例参考三视图：肩宽 ~0.52，身高 1.75，侧面厚度 ~0.26
 *
 * 关键关节层级（便于动画驱动）：
 *  root -> pelvis
 *    pelvis -> spine -> chest -> neck -> head -> faceVisor
 *    chest  -> leftShoulder  -> leftUpperArm  -> leftElbow  -> leftForeArm  -> leftWrist  -> leftHand
 *    chest  -> rightShoulder -> rightUpperArm -> rightElbow -> rightForeArm -> rightWrist -> rightHand
 *    pelvis -> leftHip  -> leftThigh  -> leftKnee  -> leftShin  -> leftAnkle  -> leftFoot
 *    pelvis -> rightHip -> rightThigh -> rightKnee -> rightShin -> rightAnkle -> rightFoot
 */

const COLORS = {
  shellLight: 0xeef3f7,     // 主白装甲
  shellMid:   0xc8d2dc,     // 装甲过渡灰
  shellDark:  0x6f7c89,     // 装甲阴影
  jointDark:  0x14181f,     // 黑色关节
  jointMid:   0x262c36,     // 关节中灰
  accent:     0x00d4ff,     // 青色发光线
  accentDim:  0x0a8fb3,
  black:      0x0a0c10
};

const MATERIALS = {
  shell: new THREE.MeshStandardMaterial({
    color: COLORS.shellLight, metalness: 0.55, roughness: 0.35
  }),
  shellMid: new THREE.MeshStandardMaterial({
    color: COLORS.shellMid, metalness: 0.6, roughness: 0.4
  }),
  shellDark: new THREE.MeshStandardMaterial({
    color: COLORS.shellDark, metalness: 0.7, roughness: 0.4
  }),
  joint: new THREE.MeshStandardMaterial({
    color: COLORS.jointDark, metalness: 0.85, roughness: 0.35
  }),
  jointMid: new THREE.MeshStandardMaterial({
    color: COLORS.jointMid, metalness: 0.8, roughness: 0.4
  }),
  glow: new THREE.MeshStandardMaterial({
    color: COLORS.accent, emissive: COLORS.accent, emissiveIntensity: 1.6,
    metalness: 0.2, roughness: 0.2
  }),
  glowSoft: new THREE.MeshStandardMaterial({
    color: COLORS.accent, emissive: COLORS.accent, emissiveIntensity: 0.8,
    metalness: 0.2, roughness: 0.3
  }),
  visor: new THREE.MeshStandardMaterial({
    color: 0x021018, emissive: COLORS.accent, emissiveIntensity: 1.4,
    metalness: 0.5, roughness: 0.15
  }),
  black: new THREE.MeshStandardMaterial({
    color: COLORS.black, metalness: 0.6, roughness: 0.5
  })
};

// ---------- 基础工具 ----------

function box(w, h, d, mat, name) {
  const g = new THREE.BoxGeometry(w, h, d, 1, 1, 1);
  const m = new THREE.Mesh(g, mat);
  m.castShadow = true;
  m.receiveShadow = true;
  if (name) m.name = name;
  return m;
}

function sphere(r, mat, segs = 16) {
  const g = new THREE.SphereGeometry(r, segs, segs);
  const m = new THREE.Mesh(g, mat);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function cylinder(rTop, rBot, h, mat, segs = 20) {
  const g = new THREE.CylinderGeometry(rTop, rBot, h, segs);
  const m = new THREE.Mesh(g, mat);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function capsule(r, length, mat, capSegs = 8, radialSegs = 16) {
  const g = new THREE.CapsuleGeometry(r, length, capSegs, radialSegs);
  const m = new THREE.Mesh(g, mat);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

// 一个有斜切的板（用作装甲块），通过缩放 box 模拟梯形感
function panel(w, h, d, mat, beveled = false) {
  if (!beveled) return box(w, h, d, mat);
  // 由 box + 小斜面 box 拼出层次
  const g = new THREE.Group();
  const main = box(w, h, d, mat);
  g.add(main);
  return g;
}

// 关节球
function jointBall(r) {
  return sphere(r, MATERIALS.joint, 20);
}

// 在装甲上加一条青色发光线
function glowStrip(w, h, d) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), MATERIALS.glow);
  m.castShadow = false;
  return m;
}

// ---------- 头部 ----------

function buildHead() {
  const g = new THREE.Group();
  g.name = 'head';

  // 头骨主体（白色装甲）—— 上半部分稍微大，下半部分（下巴/口罩）小
  const skullTop = box(0.20, 0.14, 0.20, MATERIALS.shell);
  skullTop.position.y = 0.06;
  g.add(skullTop);

  // 头骨后部圆滑感
  const skullBack = sphere(0.115, MATERIALS.shell);
  skullBack.position.set(0, 0.07, -0.02);
  skullBack.scale.set(1.0, 1.05, 1.05);
  g.add(skullBack);

  // 头顶中央条带（深色）
  const topStrip = box(0.04, 0.145, 0.205, MATERIALS.jointMid);
  topStrip.position.set(0, 0.06, 0);
  g.add(topStrip);

  // 头顶发光小点
  const topDot = glowStrip(0.03, 0.005, 0.03);
  topDot.position.set(0, 0.137, 0.06);
  g.add(topDot);

  // 面罩（深色 V 形面板）
  const visor = box(0.165, 0.10, 0.02, MATERIALS.visor);
  visor.position.set(0, 0.03, 0.092);
  g.add(visor);

  // 面罩中央发光 V
  const eyeBar = glowStrip(0.10, 0.012, 0.005);
  eyeBar.position.set(0, 0.045, 0.103);
  g.add(eyeBar);

  // 鼻梁竖线
  const noseLine = glowStrip(0.008, 0.06, 0.005);
  noseLine.position.set(0, 0.01, 0.103);
  g.add(noseLine);

  // 下颌（白色，比头小一圈）
  const jaw = box(0.16, 0.06, 0.16, MATERIALS.shell);
  jaw.position.set(0, -0.04, 0);
  g.add(jaw);

  // 颌下黑色喉部
  const throat = box(0.08, 0.04, 0.08, MATERIALS.joint);
  throat.position.set(0, -0.08, 0);
  g.add(throat);

  // 耳侧装甲圆盘（左右）
  for (const side of [-1, 1]) {
    const ear = cylinder(0.045, 0.045, 0.04, MATERIALS.shellMid, 18);
    ear.rotation.z = Math.PI / 2;
    ear.position.set(0.105 * side, 0.04, -0.01);
    g.add(ear);

    const earDot = sphere(0.015, MATERIALS.glow);
    earDot.position.set(0.128 * side, 0.04, -0.01);
    g.add(earDot);
  }

  return g;
}

// ---------- 躯干 ----------

function buildTorso() {
  // 返回 { chest, spine, pelvis } 以及组合好的层级
  const pelvis = new THREE.Group();
  pelvis.name = 'pelvis';

  // 髋部装甲（梯形感）
  const hipPlate = box(0.34, 0.14, 0.22, MATERIALS.shell);
  hipPlate.position.y = 0;
  pelvis.add(hipPlate);

  // 髋部下沿黑色腰带
  const hipBelt = box(0.36, 0.04, 0.24, MATERIALS.joint);
  hipBelt.position.y = -0.08;
  pelvis.add(hipBelt);

  // 髋前发光斜线
  const hipGlowL = glowStrip(0.02, 0.10, 0.005);
  hipGlowL.position.set(-0.08, -0.02, 0.112);
  hipGlowL.rotation.z = 0.3;
  pelvis.add(hipGlowL);
  const hipGlowR = hipGlowL.clone();
  hipGlowR.position.x = 0.08;
  hipGlowR.rotation.z = -0.3;
  pelvis.add(hipGlowR);

  // 髋中央黑色核心
  const hipCore = box(0.10, 0.10, 0.22, MATERIALS.joint);
  hipCore.position.set(0, 0, 0);
  pelvis.add(hipCore);

  // 脊柱（隐形枢轴），位于髋上方
  const spine = new THREE.Group();
  spine.name = 'spine';
  spine.position.y = 0.10;
  pelvis.add(spine);

  // 腹部连接段（黑色窄段）
  const waist = box(0.22, 0.10, 0.18, MATERIALS.joint);
  waist.position.y = 0.05;
  spine.add(waist);

  // 腹部装甲两侧（白色斜板）
  for (const side of [-1, 1]) {
    const ab = box(0.07, 0.12, 0.18, MATERIALS.shell);
    ab.position.set(0.12 * side, 0.06, 0);
    spine.add(ab);
  }

  // 胸腔
  const chest = new THREE.Group();
  chest.name = 'chest';
  chest.position.y = 0.16;
  spine.add(chest);

  // 胸大装甲（白色），稍微宽于腹
  const chestPlate = box(0.46, 0.32, 0.26, MATERIALS.shell);
  chestPlate.position.y = 0.06;
  chest.add(chestPlate);

  // 胸口中央深色凹槽（黑色梯形）
  const chestCore = box(0.18, 0.30, 0.30, MATERIALS.joint);
  chestCore.position.set(0, 0.06, 0.001);
  chest.add(chestCore);

  // 胸口"A-01"标识区域（白色小标贴）
  const chestBadge = box(0.08, 0.04, 0.005, MATERIALS.shellMid);
  chestBadge.position.set(0.10, 0.16, 0.135);
  chest.add(chestBadge);

  // 胸口中央发光圆心
  const reactor = cylinder(0.035, 0.035, 0.02, MATERIALS.glow, 20);
  reactor.rotation.x = Math.PI / 2;
  reactor.position.set(0, 0.05, 0.135);
  chest.add(reactor);

  // 胸口竖向发光条
  const chestGlow = glowStrip(0.008, 0.18, 0.01);
  chestGlow.position.set(0, -0.05, 0.135);
  chest.add(chestGlow);

  // 锁骨/肩膀连接（两侧斜板）
  for (const side of [-1, 1]) {
    const collar = box(0.16, 0.10, 0.18, MATERIALS.shell);
    collar.position.set(0.18 * side, 0.18, 0);
    chest.add(collar);

    // 肩部装甲块
    const shoulderPad = box(0.16, 0.16, 0.20, MATERIALS.shell);
    shoulderPad.position.set(0.24 * side, 0.10, 0);
    chest.add(shoulderPad);

    // 肩侧凹槽（黑色）
    const shoulderSlit = box(0.025, 0.10, 0.16, MATERIALS.joint);
    shoulderSlit.position.set(0.325 * side, 0.10, 0);
    chest.add(shoulderSlit);
  }

  // 背部装甲（背视图所示厚装甲）
  const backPlate = box(0.42, 0.28, 0.04, MATERIALS.shellMid);
  backPlate.position.set(0, 0.06, -0.13);
  chest.add(backPlate);
  // 背部中央竖线
  const backGlow = glowStrip(0.012, 0.22, 0.01);
  backGlow.position.set(0, 0.06, -0.148);
  chest.add(backGlow);

  return { pelvis, spine, chest };
}

// ---------- 手臂 ----------

function buildArm(side) {
  // side: -1 = 左, 1 = 右
  const s = side;

  // shoulder（肩关节枢轴，绕 X/Z 转动）
  const shoulder = new THREE.Group();
  shoulder.name = s < 0 ? 'leftShoulder' : 'rightShoulder';
  // 相对 chest 的肩位置
  shoulder.position.set(0.26 * s, 0.10, 0);

  // 肩球
  const sBall = jointBall(0.075);
  shoulder.add(sBall);

  // 上臂枢轴
  const upperArm = new THREE.Group();
  upperArm.name = s < 0 ? 'leftUpperArm' : 'rightUpperArm';
  shoulder.add(upperArm);

  // 上臂几何（向下延伸 0.30）
  const upperLen = 0.30;
  const upperGeom = capsule(0.065, upperLen * 0.85, MATERIALS.shellMid);
  upperGeom.position.y = -upperLen / 2;
  upperArm.add(upperGeom);

  // 上臂装甲外片（白色）
  const upperShell = box(0.135, upperLen * 0.85, 0.135, MATERIALS.shell);
  upperShell.position.y = -upperLen / 2;
  upperArm.add(upperShell);

  // 上臂发光小点
  const upperDot = glowStrip(0.015, 0.04, 0.005);
  upperDot.position.set(0.069 * s, -upperLen * 0.6, 0);
  upperArm.add(upperDot);

  // elbow（肘部）
  const elbow = new THREE.Group();
  elbow.name = s < 0 ? 'leftElbow' : 'rightElbow';
  elbow.position.y = -upperLen;
  upperArm.add(elbow);

  const eBall = jointBall(0.058);
  elbow.add(eBall);

  // forearm
  const foreArm = new THREE.Group();
  foreArm.name = s < 0 ? 'leftForeArm' : 'rightForeArm';
  elbow.add(foreArm);

  const foreLen = 0.27;
  const foreShell = box(0.115, foreLen * 0.9, 0.115, MATERIALS.shell);
  foreShell.position.y = -foreLen / 2;
  foreArm.add(foreShell);

  // 前臂黑色芯
  const foreCore = box(0.07, foreLen * 0.95, 0.07, MATERIALS.joint);
  foreCore.position.y = -foreLen / 2;
  foreArm.add(foreCore);

  // 前臂发光线
  const foreGlow = glowStrip(0.008, foreLen * 0.55, 0.005);
  foreGlow.position.set(0, -foreLen * 0.5, 0.06);
  foreArm.add(foreGlow);

  // wrist
  const wrist = new THREE.Group();
  wrist.name = s < 0 ? 'leftWrist' : 'rightWrist';
  wrist.position.y = -foreLen;
  foreArm.add(wrist);

  const wBall = jointBall(0.05);
  wrist.add(wBall);

  // hand
  const hand = new THREE.Group();
  hand.name = s < 0 ? 'leftHand' : 'rightHand';
  wrist.add(hand);

  // 手掌
  const palm = box(0.10, 0.13, 0.06, MATERIALS.shell);
  palm.position.y = -0.07;
  hand.add(palm);

  // 拇指
  const thumb = box(0.03, 0.06, 0.03, MATERIALS.jointMid);
  thumb.position.set(0.05 * s, -0.05, 0.025);
  thumb.rotation.z = -0.4 * s;
  hand.add(thumb);

  // 四指（合并块）
  const fingers = box(0.085, 0.09, 0.04, MATERIALS.jointMid);
  fingers.position.set(0, -0.16, 0);
  hand.add(fingers);
  // 指节缝
  for (let i = 0; i < 3; i++) {
    const seam = box(0.085, 0.005, 0.045, MATERIALS.joint);
    seam.position.set(0, -0.13 - i * 0.022, 0);
    hand.add(seam);
  }

  return { shoulder, upperArm, elbow, foreArm, wrist, hand };
}

// ---------- 腿部 ----------

function buildLeg(side) {
  const s = side;

  const hip = new THREE.Group();
  hip.name = s < 0 ? 'leftHip' : 'rightHip';
  hip.position.set(0.10 * s, -0.10, 0);

  const hBall = jointBall(0.075);
  hip.add(hBall);

  // thigh
  const thigh = new THREE.Group();
  thigh.name = s < 0 ? 'leftThigh' : 'rightThigh';
  hip.add(thigh);

  const thighLen = 0.42;
  const thighShell = box(0.16, thighLen * 0.9, 0.18, MATERIALS.shell);
  thighShell.position.y = -thighLen / 2;
  thigh.add(thighShell);

  // 大腿内侧黑色（关节带）
  const thighCore = box(0.10, thighLen * 0.85, 0.10, MATERIALS.joint);
  thighCore.position.y = -thighLen / 2;
  thigh.add(thighCore);

  // 大腿外侧发光线
  const thighGlow = glowStrip(0.008, thighLen * 0.5, 0.005);
  thighGlow.position.set(0.083 * s, -thighLen * 0.5, 0);
  thigh.add(thighGlow);

  // knee
  const knee = new THREE.Group();
  knee.name = s < 0 ? 'leftKnee' : 'rightKnee';
  knee.position.y = -thighLen;
  thigh.add(knee);

  const kBall = jointBall(0.07);
  knee.add(kBall);

  // 膝盖装甲帽
  const kneeCap = box(0.14, 0.10, 0.10, MATERIALS.shell);
  kneeCap.position.set(0, 0, 0.04);
  knee.add(kneeCap);

  // shin
  const shin = new THREE.Group();
  shin.name = s < 0 ? 'leftShin' : 'rightShin';
  knee.add(shin);

  const shinLen = 0.40;
  const shinShell = box(0.13, shinLen * 0.92, 0.15, MATERIALS.shell);
  shinShell.position.y = -shinLen / 2;
  shin.add(shinShell);

  // 小腿前面竖线装饰（白色比例条）
  const shinAccent = box(0.04, shinLen * 0.85, 0.02, MATERIALS.shellMid);
  shinAccent.position.set(0, -shinLen / 2, 0.075);
  shin.add(shinAccent);

  // 小腿后侧发光
  const shinGlow = glowStrip(0.01, shinLen * 0.4, 0.005);
  shinGlow.position.set(0, -shinLen * 0.65, -0.072);
  shin.add(shinGlow);

  // 小腿肌腱黑芯
  const calf = box(0.07, shinLen * 0.7, 0.07, MATERIALS.joint);
  calf.position.y = -shinLen / 2;
  shin.add(calf);

  // ankle
  const ankle = new THREE.Group();
  ankle.name = s < 0 ? 'leftAnkle' : 'rightAnkle';
  ankle.position.y = -shinLen;
  shin.add(ankle);

  const aBall = jointBall(0.05);
  ankle.add(aBall);

  // foot
  const foot = new THREE.Group();
  foot.name = s < 0 ? 'leftFoot' : 'rightFoot';
  ankle.add(foot);

  const footBody = box(0.13, 0.06, 0.28, MATERIALS.shell);
  footBody.position.set(0, -0.04, 0.07);
  foot.add(footBody);

  // 脚趾段
  const toe = box(0.12, 0.045, 0.06, MATERIALS.shellMid);
  toe.position.set(0, -0.045, 0.22);
  foot.add(toe);

  // 脚跟黑底
  const heel = box(0.13, 0.04, 0.06, MATERIALS.joint);
  heel.position.set(0, -0.05, -0.05);
  foot.add(heel);

  // 脚面发光小点
  const footGlow = glowStrip(0.06, 0.005, 0.02);
  footGlow.position.set(0, -0.015, 0.18);
  foot.add(footGlow);

  return { hip, thigh, knee, shin, ankle, foot };
}

// ---------- 装配 ----------

export function createRobot() {
  const root = new THREE.Group();
  root.name = 'robot';

  const { pelvis, spine, chest } = buildTorso();
  root.add(pelvis);

  // 整个机器人提升使脚位于 y=0
  // 我们把 root 的原点放在脚底；pelvis 上抬约 0.92
  pelvis.position.y = 0.92;

  // 头与脖子
  const neck = new THREE.Group();
  neck.name = 'neck';
  neck.position.y = 0.28;
  chest.add(neck);

  const neckShaft = cylinder(0.045, 0.05, 0.08, MATERIALS.joint, 16);
  neckShaft.position.y = 0.04;
  neck.add(neckShaft);

  const head = buildHead();
  head.position.y = 0.12;
  neck.add(head);

  // 手臂
  const leftArm = buildArm(-1);
  const rightArm = buildArm(1);
  chest.add(leftArm.shoulder);
  chest.add(rightArm.shoulder);

  // 腿
  const leftLeg = buildLeg(-1);
  const rightLeg = buildLeg(1);
  pelvis.add(leftLeg.hip);
  pelvis.add(rightLeg.hip);

  // 全局微调
  root.traverse(obj => {
    if (obj.isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });

  // 导出可控关节
  const joints = {
    root,
    pelvis,
    spine,
    chest,
    neck,
    head,
    leftShoulder: leftArm.shoulder,
    leftUpperArm: leftArm.upperArm,
    leftElbow: leftArm.elbow,
    leftForeArm: leftArm.foreArm,
    leftWrist: leftArm.wrist,
    leftHand: leftArm.hand,
    rightShoulder: rightArm.shoulder,
    rightUpperArm: rightArm.upperArm,
    rightElbow: rightArm.elbow,
    rightForeArm: rightArm.foreArm,
    rightWrist: rightArm.wrist,
    rightHand: rightArm.hand,
    leftHip: leftLeg.hip,
    leftThigh: leftLeg.thigh,
    leftKnee: leftLeg.knee,
    leftShin: leftLeg.shin,
    leftAnkle: leftLeg.ankle,
    leftFoot: leftLeg.foot,
    rightHip: rightLeg.hip,
    rightThigh: rightLeg.thigh,
    rightKnee: rightLeg.knee,
    rightShin: rightLeg.shin,
    rightAnkle: rightLeg.ankle,
    rightFoot: rightLeg.foot
  };

  // 记录"静态默认姿态"作为复位基准
  for (const key in joints) {
    const j = joints[key];
    if (j && j.rotation) {
      j.userData.defaultRotation = j.rotation.clone();
      j.userData.defaultPosition = j.position.clone();
    }
  }

  // 让手臂自然下垂（默认 A-pose 略外展，更自然的 T-pose 修正）
  leftArm.upperArm.rotation.z = 0.08;
  rightArm.upperArm.rotation.z = -0.08;
  leftArm.upperArm.userData.defaultRotation = leftArm.upperArm.rotation.clone();
  rightArm.upperArm.userData.defaultRotation = rightArm.upperArm.rotation.clone();

  return { root, joints };
}
