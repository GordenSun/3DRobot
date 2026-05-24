/**
 * 程序化动画系统
 *
 * === 机器人坐标约定 ===
 *   +X 向右、+Y 向上、+Z 向相机（机器人前方）。
 *   机器人面朝 +Z 方向静站。
 *
 * === 关键关节旋转规则 ===
 *   upperArm / thigh 默认朝 -Y 延伸。
 *
 *   rotation.x  (绕 X 轴): 大腿/上臂在 YZ 平面前后摆
 *     >0 → 朝 -Z (后)        <0 → 朝 +Z (前)
 *     ⇒ 抬手向前: upperArm.x = 负
 *     ⇒ 抬腿向前: thigh.x   = 负
 *
 *   rotation.z  (绕 Z 轴): 在 XY 平面内（左右上下展开）
 *     旋转后方向 = (sinθ, -cosθ, 0)
 *     ⇒ 左侧肢体「外展」(向 -X)：z < 0
 *     ⇒ 右侧肢体「外展」(向 +X)：z > 0
 *     ⇒ 双臂举过头（朝 +Y）：|z| ≈ π （左为 -π+δ，右为 +π-δ）
 *
 *   rotation.y  (绕 Y 轴): 沿铅垂方向扭转
 *
 *   knee / elbow 绕 X 轴弯曲：
 *     正值 → 子段朝 -Z 弯（自然弯曲方向，膝盖朝后、肘弯朝身前）
 *     负值 → 反折（避免使用）
 */

const TAU = Math.PI * 2;
const PI = Math.PI;

const sin = (t, f = 1, p = 0) => Math.sin(t * f + p);
const cos = (t, f = 1, p = 0) => Math.cos(t * f + p);

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

// ====================== 动画 ======================

// 1. IDLE 待机：呼吸 + 微微晃动
function idle(joints, t) {
  const breath = sin(t, 1.4) * 0.025;
  setPos(joints.pelvis, 0, breath, 0);

  set(joints.spine,  sin(t, 1.4) * 0.015, sin(t, 0.6) * 0.03, 0);
  set(joints.chest,  sin(t, 1.4) * 0.012, 0, sin(t, 0.6) * 0.015);
  set(joints.head,   sin(t, 0.5) * 0.04, sin(t, 0.4) * 0.06, 0);

  // 手臂自然下垂 + 微微随节奏前后晃
  const armSwing = sin(t, 1.0) * 0.04;
  set(joints.leftUpperArm,  armSwing, 0, 0);
  set(joints.rightUpperArm, -armSwing, 0, 0);
  set(joints.leftElbow,  0.06 + Math.abs(sin(t, 1.0)) * 0.03, 0, 0);
  set(joints.rightElbow, 0.06 + Math.abs(sin(t, 1.0, PI)) * 0.03, 0, 0);

  // 腿 — 站姿微小摆动
  set(joints.leftThigh, sin(t, 0.7) * 0.01, 0, 0);
  set(joints.rightThigh, -sin(t, 0.7) * 0.01, 0, 0);
}

// 2. WAVE 挥手（右手）
//   - 右上臂举到头侧（z 接近 +π，朝右上方），同时小幅左右摇摆挥手
//   - 肘部弯曲 ~0.6 rad 让前臂在头顶
//   - 左臂自然下垂
//   - 重心略右移、头微转向右
function wave(joints, t) {
  const breath = sin(t, 1.4) * 0.015;
  setPos(joints.pelvis, 0, breath, 0);

  // 身体微转 + 头转向挥手侧（右）
  set(joints.spine,  -0.03, 0.10, 0);
  set(joints.chest,   0.0,  0.05, -0.03);
  set(joints.head,   -0.08, 0.20 + sin(t, 0.8) * 0.04, 0);

  // 重心略偏左腿（让右脚轻，体态更自然）
  set(joints.leftThigh,  0, 0, -0.04);   // 左腿外展
  set(joints.rightThigh, 0, 0,  0.04);   // 右腿外展
  set(joints.leftKnee,   0.06, 0, 0);
  set(joints.rightKnee,  0.14, 0, 0);

  // 左臂：自然下垂带轻微随节奏摆动
  set(joints.leftUpperArm, sin(t, 1.2) * 0.05, 0, 0);
  set(joints.leftElbow,    0.18, 0, 0);

  // 右臂：举过头侧
  //   z 在 [+2.5, +3.0] 之间晃动，让上臂在「头顶 -- 右斜上方」之间挥
  const freq = 9.0;
  const swing = sin(t * freq) * 0.28;
  // 默认 right.z = +0.08，所以这里写 (+2.55 - 0.08) = 2.47，加 swing
  set(joints.rightUpperArm, -0.10, 0, 2.47 + swing);
  set(joints.rightElbow,    0.55, 0, 0);   // 前臂朝身前弯一点
  // 前臂在 upperArm 局部坐标里再微摆（X 转，让手指向头顶上方）
  set(joints.rightForeArm,  -0.20, 0, 0);
  set(joints.rightWrist,    0, sin(t * freq + 0.6) * 0.20, 0);
}

// 3. WALK 行走（原地踏步）
//   思路：
//   - 大腿前后摆 (thigh.x)：负=前，正=后
//   - 摆动腿（向前抬时）膝盖弯曲明显，支撑腿(向后蹬)膝盖伸直
//   - 手臂与对侧腿同步前后摆
//   - pelvis 上下颠簸
function walk(joints, t) {
  const speed = 3.6;
  const phase = t * speed;
  const sp = Math.sin(phase);   // 主相位
  const cp = Math.cos(phase);

  // 上下颠簸（落地瞬间下沉）
  const bob = (1 - Math.abs(cp)) * 0.05;
  setPos(joints.pelvis, 0, -bob, 0);

  // 髋左右扭转、上身反向扭转
  set(joints.spine, 0, -sp * 0.15, 0);
  set(joints.chest, sp * 0.05, sp * 0.18, 0);
  set(joints.head,  0, sp * 0.08, 0);

  // 腿（左右反相）
  const legAmp = 0.65;
  // 当 sp>0：左腿向前抬（thigh.x = -sp*amp），右腿向后蹬（thigh.x = +sp*amp）
  const lThigh = -sp * legAmp;
  const rThigh =  sp * legAmp;
  set(joints.leftThigh,  lThigh, 0, 0);
  set(joints.rightThigh, rThigh, 0, 0);

  // 膝盖：摆动腿（在身前抬起、thigh<0）膝盖弯曲；支撑腿伸直
  //   弯曲量 = max(0.15, -thigh*1.2)
  const lKnee = Math.max(0.12, -lThigh * 1.4);
  const rKnee = Math.max(0.12, -rThigh * 1.4);
  set(joints.leftKnee,  lKnee, 0, 0);
  set(joints.rightKnee, rKnee, 0, 0);

  // 脚踝补偿，让脚底保持大致水平贴地
  set(joints.leftAnkle,  -(lThigh + lKnee) * 0.5, 0, 0);
  set(joints.rightAnkle, -(rThigh + rKnee) * 0.5, 0, 0);

  // 手臂（与对侧腿同步：左腿前抬 → 右臂向前）
  const armAmp = 0.55;
  set(joints.leftUpperArm,  sp * armAmp, 0, 0);   // sp>0 → 左臂向后(+)
  set(joints.rightUpperArm, -sp * armAmp, 0, 0);  // sp>0 → 右臂向前(-)
  set(joints.leftElbow,  0.25 + Math.abs(sp) * 0.25, 0, 0);
  set(joints.rightElbow, 0.25 + Math.abs(sp) * 0.25, 0, 0);
}

// 4. RUN 奔跑：更快、更大、身体前倾
function run(joints, t) {
  const speed = 7.5;
  const phase = t * speed;
  const sp = Math.sin(phase);
  const cp = Math.cos(phase);

  const bob = (1 - Math.abs(cp)) * 0.09;
  setPos(joints.pelvis, 0, -bob + 0.04, 0);

  // 身体前倾
  set(joints.spine, -0.28, -sp * 0.18, 0);
  set(joints.chest,  0.08, sp * 0.22, 0);
  set(joints.head,   0.20, sp * 0.08, 0);

  const legAmp = 1.1;
  const lThigh = -sp * legAmp - 0.05;
  const rThigh =  sp * legAmp - 0.05;
  set(joints.leftThigh,  lThigh, 0, 0);
  set(joints.rightThigh, rThigh, 0, 0);

  const lKnee = Math.max(0.25, -lThigh * 1.6 + 0.3);
  const rKnee = Math.max(0.25, -rThigh * 1.6 + 0.3);
  set(joints.leftKnee,  lKnee, 0, 0);
  set(joints.rightKnee, rKnee, 0, 0);

  set(joints.leftAnkle,  -(lThigh + lKnee) * 0.4, 0, 0);
  set(joints.rightAnkle, -(rThigh + rKnee) * 0.4, 0, 0);

  // 手臂：大幅摆动 + 肘部强弯（"跑步姿势"）
  const armAmp = 1.2;
  set(joints.leftUpperArm,  sp * armAmp, 0, 0);
  set(joints.rightUpperArm, -sp * armAmp, 0, 0);
  set(joints.leftElbow,  1.4 + Math.abs(sp) * 0.2, 0, 0);
  set(joints.rightElbow, 1.4 + Math.abs(sp) * 0.2, 0, 0);
}

// 5. JUMP 跳跃：蹲 → 起跳 → 空中 → 落地缓冲
function jump(joints, t) {
  const cycle = 1.6;
  const p = (t % cycle) / cycle; // 0..1

  let crouch = 0, lift = 0, armUp = 0;
  if (p < 0.25) {
    // 蓄力下蹲
    const k = p / 0.25;
    crouch = k;
  } else if (p < 0.5) {
    // 起跳上升
    const k = (p - 0.25) / 0.25;
    crouch = 1 - k;
    lift = k;
    armUp = k;
  } else if (p < 0.75) {
    // 空中下落
    const k = (p - 0.5) / 0.25;
    lift = 1 - k;
    armUp = 1 - k * 0.5;
  } else {
    // 落地缓冲
    const k = (p - 0.75) / 0.25;
    crouch = (1 - k) * 0.6;
  }

  // 高度
  setPos(joints.pelvis, 0, lift * 0.6 - crouch * 0.32, 0);

  // 身体
  set(joints.spine, -crouch * 0.25 + armUp * 0.15, 0, 0);
  set(joints.chest, armUp * 0.10, 0, 0);
  set(joints.head,  -crouch * 0.10 + armUp * 0.15, 0, 0);

  // 腿：蹲下时大腿向前抬+膝盖弯曲，落地后逐渐展开
  // 蹲下：thigh.x ≈ -0.9*crouch（前抬），knee 弯曲 ~1.5*crouch
  set(joints.leftThigh,  -crouch * 0.9, 0, -0.10);
  set(joints.rightThigh, -crouch * 0.9, 0,  0.10);
  set(joints.leftKnee,   crouch * 1.6, 0, 0);
  set(joints.rightKnee,  crouch * 1.6, 0, 0);
  set(joints.leftAnkle,  -crouch * 0.7, 0, 0);
  set(joints.rightAnkle, -crouch * 0.7, 0, 0);

  // 手臂：蓄力时收紧、起跳时上举
  //   armUp=1 → 双臂高举过头：左 z = -2.7，右 z = +2.7
  set(joints.leftUpperArm,   crouch * 0.3 - armUp * 0.05, 0, -2.7 * armUp);
  set(joints.rightUpperArm,  crouch * 0.3 - armUp * 0.05, 0,  2.7 * armUp);
  set(joints.leftElbow,  (1 - armUp) * 0.6 + crouch * 0.4, 0, 0);
  set(joints.rightElbow, (1 - armUp) * 0.6 + crouch * 0.4, 0, 0);
}

// 6. DANCE 舞蹈：节奏感强，髋扭转 + 上身摆动 + 双臂高低交错挥
function dance(joints, t) {
  const beat = t * 3.0;
  const sb = Math.sin(beat);
  const cb = Math.cos(beat);
  const sb2 = Math.sin(beat * 2);

  // 髋 / 身体随节奏
  setPos(joints.pelvis, sb * 0.04, Math.abs(sb2) * 0.04, 0);
  set(joints.pelvis, 0, sb * 0.25, sb2 * 0.05);
  set(joints.spine,  0, -sb * 0.25, sb2 * 0.10);
  set(joints.chest,  sb2 * 0.05, sb * 0.10, 0);
  set(joints.head,   sb2 * 0.08, sb * 0.20, sb2 * 0.06);

  // 双臂高低交错挥：sb>0 时左臂在上、右臂在下
  //   左臂"上扬" → z ≈ -2.2 (头顶左侧)
  //   左臂"下"   → z ≈ -0.5 (外展)
  const lUp = (sb + 1) * 0.5;       // 0..1，sb>0 → 1
  const rUp = 1 - lUp;              // 反相
  set(joints.leftUpperArm,
      0,
      0,
      -(0.5 + 1.7 * lUp));          // 左臂外展 → 高举
  set(joints.rightUpperArm,
      0,
      0,
      (0.5 + 1.7 * rUp));           // 右臂外展 → 高举
  set(joints.leftElbow,  0.4 + lUp * 0.5, 0, 0);
  set(joints.rightElbow, 0.4 + rUp * 0.5, 0, 0);
  set(joints.leftWrist,  0, 0, sb2 * 0.25);
  set(joints.rightWrist, 0, 0, -sb2 * 0.25);

  // 腿：左右轻踏
  set(joints.leftThigh,  -Math.max(0, sb) * 0.3, 0, -0.06);
  set(joints.rightThigh, -Math.max(0, -sb) * 0.3, 0,  0.06);
  set(joints.leftKnee,   Math.max(0.1, Math.max(0, sb) * 0.5), 0, 0);
  set(joints.rightKnee,  Math.max(0.1, Math.max(0, -sb) * 0.5), 0, 0);
}

export const ANIMATIONS = {
  idle:  { label: 'IDLE',   cn: '待机',   fn: idle },
  wave:  { label: 'WAVE',   cn: '挥手',   fn: wave },
  walk:  { label: 'WALK',   cn: '行走',   fn: walk },
  run:   { label: 'RUN',    cn: '奔跑',   fn: run  },
  jump:  { label: 'JUMP',   cn: '跳跃',   fn: jump },
  dance: { label: 'DANCE',  cn: '舞蹈',   fn: dance}
};

export const ANIMATION_KEYS = Object.keys(ANIMATIONS);
