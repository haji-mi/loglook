# LogLook · Apple Log LUT 对比器

> 纯前端、硬件级 WebGL2 渲染的 iPhone Apple Log 调色 LUT 一屏对比与导出工具。

![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?style=flat-square)
![React](https://img.shields.io/badge/React-18-61dafb?style=flat-square)
![WebGL2](https://img.shields.io/badge/WebGL2-3D_Texture-green?style=flat-square)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38bdf8?style=flat-square)
![Privacy](https://img.shields.io/badge/100%25-Local_Privacy-emerald?style=flat-square)

---

## 💡 项目简介

**LogLook** 专为拍摄 iPhone Apple Log 的创作者打造。只需在浏览器中上传一张 Apple Log 原图和多个 `.cube` LUT 文件，即可在同一屏幕下实时并列预览各种电影滤镜效果，快速挑选出最满意的色调，并支持一键按相机原始物理分辨率无损导出。

所有计算均在浏览器本地借助 GPU WebGL2 3D 纹理完成，无需后端、无需登录，零数据上传，全程断网可用。

---

## ✨ 核心特性

- 🔒 **100% 本地纯前端处理**：图片与 LUT 文件仅在浏览器本地内存中解析，绝不上传云端，保障个人素材与隐私安全。
- ⚡ **WebGL2 3D 纹理三线性插值**：采用原生 3D 纹理硬件插值渲染，禁止逐像素 JS/CPU 循环，60fps 丝滑交互。
- 🎯 **精准色彩还原**：专为 Apple Log 素材设计，绝不额外叠加任何 Apple Log → Rec.709 转换、gamma 变换或自动曝光校正，真实还原本色。
- 📐 **大图左右分割对比**：点击任意格子进入全屏大图，配备可自由拖动的左右分割对比滑杆（左侧原图、右侧 LUT 效果），支持桌面鼠标与手机触控手势。
- 🎚️ **全局 LUT 强度联动**：0~100% 强度自由微调，网格视图与大图模式双向实时同步；强度拖至 0% 时所有格子与原图完全一致。
- 🖼️ **全分辨率成品图导出**：
  - **大图模式**：按相机原始物理像素分辨率（如 4032×3024）重新硬件渲染导出无损 PNG 成品图，而非预览缩放图。
  - **网格模式**：一键导出包含原图与各 LUT 标注、当前强度的深色精致排版对比总图。
- 📱 **多端全适配**：适配桌面端主流浏览器（Chrome / Edge 等）与移动端（iPhone Safari、iPad、Android 手机），支持安全区域与抗手势冲突。

---

## 🛠️ .cube 解析规范

- 兼容 **17 / 33 / 65** 点 3D LUT 文件。
- 自动处理 `DOMAIN_MIN` 与 `DOMAIN_MAX`，数值安全 clamp 到 `0.0 ~ 1.0`。
- 首格固定为 Apple Log 原图，后接各 LUT 预览；匹配以下 5 个常见风格时按推荐顺序优先排列：
  1. `Clean709`（标准色彩还原）
  2. `WarmFilm`（暖调胶片）
  3. `TealOrange`（经典青橙冷暖对比）
  4. `FadedVintage`（复古褪色）
  5. `MonoBW`（纯正中性黑白）
- 健全的错误拦截机制：若文件损坏或格式非法，弹出中文友好提示并清晰标出问题文件名。

---

## 🚀 快速开始

### 1. 克隆仓库
```bash
git clone https://github.com/haji-mi/loglook.git
cd loglook
```

### 2. 安装依赖
```bash
npm install
```

### 3. 本地运行
```bash
npm run dev
```
打开浏览器访问：`http://127.0.0.1:5173` 即可开始使用。

### 4. 生产打包
```bash
npm run build
npm run preview
```

---

## 📱 手机端访问方式（局域网测试）

确保手机与电脑处于同一个 Wi-Fi / 局域网下：
1. 启动命令加上 host 参数：
   ```bash
   npm run dev -- --host
   ```
2. 终端会显示局域网 IP（例如 `http://192.168.x.x:5173`）。
3. 在手机（iPhone / Redmi / Android）浏览器中打开该地址即可畅快体验。

---

## 📄 License

MIT License. 仅供个人学习与影视创作使用。
