/**
 * 程序化动画系统
 * 每个动画接收 (joints, time, params)，直接设置关节的局部旋转
 * 所有动画都基于"默认姿态"叠加角度
 */

const TAU = Math.PI * 2;

function sin(t, freq = 1, phase = 0) {
  return Math.sin(t * freq + phase);
}

// 把目标旋转量（角度，弧度）写到关节上：基于默认姿态偏移
function set(joint, dx, dy, dz) {
  if (!joint) return;
  const d = joint.userData.defaultRotation;
  joint.rotation.x = (d ? d.x : 0) + dx;
  joint.rotation.y = (d ? d.y : 0) + dy;
  joint.rotation.z = (d ? d.z : 0) + dz;
}

function setPos(joint, dx, dy, dz) {
  if (!joint) return;
  const d = joint.userData.defaultPosition;
  joint.position.x = (d ? d.x : 0) + dx;
  joint.position.y = (d ? d.y : 0) + dy;
  joint.position.z = (d ? d.z : 0) + dz;
}

// 把所有关节恢复到默认姿态
export function resetPose(joints) {
  for (const key in joints) {
    const j = joints[key];
    if (!j) continue;
    if (j.userData && j.userData.defaultRotation) {
      j.rotation.copy(j.userData.defaultRotation);
    }
    if (j.userData && j.userData.defaultPosition) {
      j.position.copy(j.userData.defaultPosition);
    }
  }
}

// ====== 各动画 ======

// 1. IDLE 待机：呼吸 + 微微晃动
function idle(joints, t) {
  const breath = sin(t, 1.6) * 0.025;
  setPos(joints.pelvis, 0, breath, 0);
  set(joints.chest, sin(t, 1.6) * 0.02, sin(t, 0.7) * 0.03, 0);
  set(joints.spine, 0, 0, sin(t, 0.7) * 0.02);
  set(joints.head, sin(t, 0.5) * 0.04, sin(t, 0.4) * 0.06, 0);

  // 手臂自然摆动
  const armSwing = sin(t, 0.7) * 0.04;
  set(joints.leftUpperArm, armSwing, 0, 0);
  set(joints.rightUpperArm, -armSwing, 0, 0);
  set(joints.leftElbow, 0.05 + Math.abs(sin(t, 0.7)) * 0.04, 0, 0);
  set(joints.rightElbow, 0.05 + Math.abs(sin(t, 0.7, 0.5)) * 0.04, 0, 0);

  // 腿 — 站姿微小摆动
  set(joints.leftThigh, sin(t, 0.7) * 0.01, 0, 0);
  set(joints.rightThigh, -sin(t, 0.7) * 0.01, 0, 0);
}

// 2. WAVE 挥手（右手）
//   姿态：右臂高举过头，肘略弯，前臂自然指向斜上方；
//   动态：上臂在举起的姿势上做小幅 z 摇摆，前臂同相加大摇摆，腕部跟随；
//   重心：身体微微向左让出空间、转头看观众、左臂自然下垂。
function wave(joints, t) {
  // 基础呼吸（半幅，避免和挥动叠在一起显得太抖）
  const breath = sin(t, 1.4) * 0.012;
  setPos(joints.pelvis, 0, breath, 0);

  // 身体：稍微转向观众侧，头略仰、转头
  set(joints.spine,  -0.04, -0.10, 0);
  set(joints.chest,   0.02, -0.10, 0.04);
  set(joints.neck,   -0.05,  0.00, 0);
  set(joints.head,   -0.10, -0.20 + sin(t, 0.8) * 0.04, 0);

  // 重心略偏到左腿（挥手时身体自然倾斜的细节）
  set(joints.leftThigh,  0.00, 0,  0.04);
  set(joints.rightThigh, 0.00, 0, -0.06);
  set(joints.leftKnee,   0.05, 0, 0);
  set(joints.rightKnee,  0.12, 0, 0);
  set(joints.leftAnkle, -0.03, 0, 0);

  // 左臂：自然下垂带轻微随节奏摆动
  const idleSwing = sin(t, 1.2) * 0.05;
  set(joints.leftUpperArm,  idleSwing, 0, 0.04);
  set(joints.leftElbow,     0.18, 0, 0);
  set(joints.leftWrist,     0, 0, 0);

  // 右臂：举起挥手
  //   节奏：每秒约 1.6 次完整往返
  const freq = 10.0;        // 摇摆频率
  const swing = sin(t * freq) * 0.30;          // 上臂横向小摇
  const swingFore = sin(t * freq + 0.5) * 0.45; // 前臂跟随主摆动（同相、加幅）
  const swingWrist = sin(t * freq + 0.8) * 0.25;

  // 上臂：举到接近垂直向上（z ≈ -2.55 rad ≈ -146°），略前倾
  set(joints.rightUpperArm, 0.20, -0.10, -2.55 + swing);
  // 肘弯一点，让前臂自然斜向头顶
  set(joints.rightElbow, -0.35, 0, 0);
  // 前臂沿掌心面摇摆（核心挥动）
  set(joints.rightForeArm, 0, 0, swingFore);
  // 腕部跟随，加点活力
  set(joints.rightWrist, 0, swingWrist * 0.4, swingWrist);
  set(joints.rightHand, 0, 0, 0);
}

// 3. WALK 行走（原地踏步）
function walk(joints, t) {
  const speed = 4.0;
  const tt = t * speed;

  // 上下颠簸
  const bob = Math.abs(Math.sin(tt)) * 0.04;
  setPos(joints.pelvis, 0, -bob, 0);

  // 髋（脊柱）左右扭转
  set(joints.spine, 0, sin(tt) * 0.15, 0);
  set(joints.chest, sin(tt, 2) * 0.04, -sin(tt) * 0.15, 0);
  set(joints.head, 0, sin(tt) * 0.08, 0);

  // 腿
  const legAmp = 0.7;
  set(joints.leftThigh,  Math.sin(tt) * legAmp, 0, 0);
  set(joints.rightThigh, -Math.sin(tt) * legAmp, 0, 0);

  // 膝盖在落地侧弯曲（用 max 让支撑腿稍微伸直）
  const lk = Math.max(0.15, -Math.sin(tt) * 0.7 + 0.4);
  const rk = Math.max(0.15, Math.sin(tt) * 0.7 + 0.4);
  set(joints.leftKnee, lk, 0, 0);
  set(joints.rightKnee, rk, 0, 0);

  // 踝部微调
  set(joints.leftAnkle, Math.sin(tt) * -0.2, 0, 0);
  set(joints.rightAnkle, -Math.sin(tt) * -0.2, 0, 0);

  // 手臂反向摆动
  const armAmp = 0.7;
  set(joints.leftUpperArm,  -Math.sin(tt) * armAmp, 0, 0);
  set(joints.rightUpperArm, Math.sin(tt) * armAmp, 0, 0);

  // 肘弯
  set(joints.leftElbow, 0.4 + Math.abs(Math.sin(tt)) * 0.2, 0, 0);
  set(joints.rightElbow, 0.4 + Math.abs(Math.sin(tt + Math.PI)) * 0.2, 0, 0);
}

// 4. RUN 跑步：更快更夸张，前倾
function run(joints, t) {
  const speed = 7.0;
  const tt = t * speed;

  const bob = Math.abs(Math.sin(tt)) * 0.07;
  setPos(joints.pelvis, 0, -bob + 0.02, 0);

  // 整体身体前倾
  set(joints.spine, 0.25, sin(tt) * 0.18, 0);
  set(joints.chest, sin(tt, 2) * 0.06, -sin(tt) * 0.18, 0);
  set(joints.head, -0.15, sin(tt) * 0.08, 0);

  const legAmp = 1.1;
  set(joints.leftThigh,  Math.sin(tt) * legAmp - 0.1, 0, 0);
  set(joints.rightThigh, -Math.sin(tt) * legAmp - 0.1, 0, 0);

  // 膝盖更夸张地弯曲
  const lk = Math.max(0.3, -Math.sin(tt) * 1.5 + 1.0);
  const rk = Math.max(0.3, Math.sin(tt) * 1.5 + 1.0);
  set(joints.leftKnee, lk, 0, 0);
  set(joints.rightKnee, rk, 0, 0);

  set(joints.leftAnkle, Math.sin(tt) * -0.3, 0, 0);
  set(joints.rightAnkle, -Math.sin(tt) * -0.3, 0, 0);

  // 手臂大幅摆动
  const armAmp = 1.3;
  set(joints.leftUpperArm,  -Math.sin(tt) * armAmp, 0, 0.1);
  set(joints.rightUpperArm, Math.sin(tt) * armAmp, 0, -0.1);

  set(joints.leftElbow,  1.2 + Math.abs(Math.sin(tt)) * 0.2, 0, 0);
  set(joints.rightElbow, 1.2 + Math.abs(Math.sin(tt + Math.PI)) * 0.2, 0, 0);
}

// 5. PUNCH 出拳（左右交替）
function punch(joints, t) {
  const cycle = (t * 2.2) % TAU;
  const isLeft = cycle < Math.PI;
  const local = isLeft ? cycle : cycle - Math.PI;
  // 0→π 内：0→0.3 蓄力, 0.3→0.45 爆发, 0.45→1 收回
  let phase;
  if (local < 0.9) phase = local / 0.9 * 0.5; // 蓄力
  else if (local < 1.4) phase = 0.5 + (local - 0.9) / 0.5 * 0.5; // 出拳
  else phase = 1 - (local - 1.4) / (Math.PI - 1.4); // 收回

  // 基础姿态
  set(joints.chest, sin(t, 1.6) * 0.02, isLeft ? -0.25 : 0.25, 0);
  set(joints.spine, 0, isLeft ? -0.15 : 0.15, 0);
  set(joints.head, 0, isLeft ? -0.2 : 0.2, 0);

  // 出拳的臂
  if (isLeft) {
    set(joints.leftShoulder, 0, 0, 0);
    set(joints.leftUpperArm, -1.5 * phase, 0, 0.3 * (1 - phase));
    set(joints.leftElbow, (1 - phase) * 1.6, 0, 0);
    set(joints.leftForeArm, 0, 0, 0);
    set(joints.leftHand, 0, 0, 0);
    // 防守臂（右）抬起护脸
    set(joints.rightUpperArm, -1.0, 0, -0.8);
    set(joints.rightElbow, 1.6, 0, 0);
  } else {
    set(joints.rightShoulder, 0, 0, 0);
    set(joints.rightUpperArm, -1.5 * phase, 0, -0.3 * (1 - phase));
    set(joints.rightElbow, (1 - phase) * 1.6, 0, 0);
    set(joints.rightForeArm, 0, 0, 0);
    set(joints.rightHand, 0, 0, 0);
    set(joints.leftUpperArm, -1.0, 0, 0.8);
    set(joints.leftElbow, 1.6, 0, 0);
  }

  // 腿马步
  set(joints.leftThigh, 0, 0, 0.15);
  set(joints.rightThigh, 0, 0, -0.15);
  set(joints.leftKnee, 0.35, 0, 0);
  set(joints.rightKnee, 0.35, 0, 0);
  set(joints.leftAnkle, -0.2, 0, 0);
  set(joints.rightAnkle, -0.2, 0, 0);
}

// 6. JUMP 跳跃（蹲下→起跳→空中→落地）
function jump(joints, t) {
  const cycle = 1.6;
  const p = (t % cycle) / cycle; // 0..1

  let crouch = 0, lift = 0, armUp = 0;
  if (p < 0.25) {
    // 蹲下
    const k = p / 0.25;
    crouch = k;
  } else if (p < 0.5) {
    // 起跳，离地
    const k = (p - 0.25) / 0.25;
    crouch = 1 - k;
    lift = k;
    armUp = k;
  } else if (p < 0.75) {
    // 空中下降
    const k = (p - 0.5) / 0.25;
    lift = 1 - k;
    armUp = 1 - k * 0.5;
    crouch = 0;
  } else {
    // 落地缓冲
    const k = (p - 0.75) / 0.25;
    crouch = (1 - k) * 0.6;
    lift = 0;
    armUp = 0;
  }

  // 整体高度
  setPos(joints.pelvis, 0, lift * 0.6 - crouch * 0.35, 0);

  // 上半身前倾蓄力
  set(joints.spine, crouch * 0.25, 0, 0);
  set(joints.chest, -armUp * 0.1, 0, 0);
  set(joints.head, -crouch * 0.15 + armUp * 0.1, 0, 0);

  // 腿蹲
  set(joints.leftThigh, crouch * 0.9, 0, 0.12);
  set(joints.rightThigh, crouch * 0.9, 0, -0.12);
  set(joints.leftKnee, crouch * 1.6, 0, 0);
  set(joints.rightKnee, crouch * 1.6, 0, 0);
  set(joints.leftAnkle, -crouch * 0.6, 0, 0);
  set(joints.rightAnkle, -crouch * 0.6, 0, 0);

  // 手臂：起跳时上举
  set(joints.leftUpperArm, -armUp * 2.6 + crouch * 0.5, 0, 0.1);
  set(joints.rightUpperArm, -armUp * 2.6 + crouch * 0.5, 0, -0.1);
  set(joints.leftElbow, (1 - armUp) * 0.6 + crouch * 0.4, 0, 0);
  set(joints.rightElbow, (1 - armUp) * 0.6 + crouch * 0.4, 0, 0);
}

// 7. DANCE 跳舞（手挥+扭胯）
function dance(joints, t) {
  const beat = t * 3.0;
  const wob = sin(beat) * 0.25;

  setPos(joints.pelvis, sin(beat * 2) * 0.04, Math.abs(sin(beat)) * 0.05, 0);
  set(joints.pelvis, 0, sin(beat) * 0.3, sin(beat * 2) * 0.1);
  set(joints.spine, 0, -sin(beat) * 0.3, sin(beat * 2) * 0.15);
  set(joints.chest, sin(beat * 2) * 0.05, sin(beat) * 0.1, 0);
  set(joints.head, sin(beat * 2) * 0.1, sin(beat) * 0.2, sin(beat * 2) * 0.08);

  // 两臂高低交错
  set(joints.leftUpperArm,  -1.6 + sin(beat) * 0.6, 0, 0.7);
  set(joints.rightUpperArm, -1.6 - sin(beat) * 0.6, 0, -0.7);
  set(joints.leftElbow, 0.8 + sin(beat) * 0.5, 0, 0);
  set(joints.rightElbow, 0.8 - sin(beat) * 0.5, 0, 0);
  set(joints.leftWrist, 0, 0, sin(beat * 2) * 0.4);
  set(joints.rightWrist, 0, 0, -sin(beat * 2) * 0.4);

  // 腿 — 左右踏
  set(joints.leftThigh, sin(beat) * 0.25, 0, 0.1);
  set(joints.rightThigh, -sin(beat) * 0.25, 0, -0.1);
  set(joints.leftKnee, Math.max(0.1, sin(beat) * 0.4 + 0.3), 0, 0);
  set(joints.rightKnee, Math.max(0.1, -sin(beat) * 0.4 + 0.3), 0, 0);
}

export const ANIMATIONS = {
  idle:  { label: 'IDLE',   cn: '待机',   fn: idle },
  wave:  { label: 'WAVE',   cn: '挥手',   fn: wave },
  walk:  { label: 'WALK',   cn: '行走',   fn: walk },
  run:   { label: 'RUN',    cn: '奔跑',   fn: run  },
  punch: { label: 'PUNCH',  cn: '出拳',   fn: punch},
  jump:  { label: 'JUMP',   cn: '跳跃',   fn: jump },
  dance: { label: 'DANCE',  cn: '舞蹈',   fn: dance}
};

export const ANIMATION_KEYS = Object.keys(ANIMATIONS);
