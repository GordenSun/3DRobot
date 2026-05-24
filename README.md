# 3DRobot · ANDROID A-01

基于 Three.js 程序化建模并驱动的人形机器人「ANDROID A-01」演示页。
模型参照原始三视图（正/侧/背）一比一构建主要比例：身高 1750 mm，肩宽 520 mm，侧厚 260 mm。

> Live Demo · GitHub Pages: <https://gordensun.github.io/3DRobot/>

## 特性

- **纯几何体程序化建模** — 不依赖任何外部 3D 资产，全部由 `BoxGeometry`/`CapsuleGeometry`/`SphereGeometry` 等基础体素装配而成。
- **完整人形骨架** — 头、颈、胸、腹、髋、双臂（肩-上臂-肘-前臂-腕-手）、双腿（髋-大腿-膝-小腿-踝-脚），层级化 `Group` 结构，可逐关节驱动。
- **9 种程序化动画**：
  1. IDLE · 待机（呼吸 + 微摆）
  2. WAVE · 挥手
  3. WALK · 行走（原地踏步）
  4. RUN · 奔跑
  5. PUNCH · 出拳（左右交替）
  6. JUMP · 跳跃（蹲-起-空中-落地）
  7. DANCE · 舞蹈
  8. POWER · 蓄力姿态
  9. SCAN · 扫描展示
- **动画混合（pose blending）** — 切换动作时基于四元数 `slerp` 在 0.35 s 内平滑过渡。
- **科幻 HUD 界面** — 顶部品牌+规格、左下动作库、右下状态、四角发光装饰。
- **响应式相机** — `OrbitControls` 拖拽旋转 / 滚轮缩放，键盘 `1`~`9` 一键切换动作，`R` 切换自动旋转。

## 文件结构

```
3DRobot/
├── index.html        # 入口：HUD/UI、importmap、加载 main.js
├── src/
│   ├── main.js       # 渲染器、场景、灯光、地板、UI 接线、主循环
│   ├── robot.js      # 程序化构建 A-01 人形模型
│   └── animations.js # 9 种关节驱动动画 + 姿态复位
└── robot.png         # 原始三视图参考稿
```

## 本地运行

由于使用 ES Module 与 importmap，请通过本地静态服务器访问（不能直接 `file://` 打开）：

```bash
python3 -m http.server 8765
# 然后访问 http://127.0.0.1:8765
```

## 部署到 GitHub Pages

仓库根目录即为静态站点根，无需构建。在仓库 *Settings → Pages* 中选择：
- Source: `Deploy from a branch`
- Branch: `main` / `(root)`

## 致谢

- 渲染：[three.js](https://threejs.org/)
- 字体：Orbitron / Rajdhani（Google Fonts）
- 设计参考：原始三视图 `robot.png`
