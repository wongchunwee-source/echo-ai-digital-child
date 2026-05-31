# Project ECHO Beta

ECHO 是一个移动端优先的 AI 数字孩子成长网页 App Beta 版本。

当前版本使用 React + Tailwind CSS + Vite 构建，数据暂时保存在浏览器 `localStorage`。没有接入真实 AI API、Firebase 或后端服务，适合先发给朋友用手机体验产品概念。

## 项目目录结构

```text
echo-ai-app-react-tailwind-css/
├─ index.html
├─ package.json
├─ package-lock.json
├─ postcss.config.js
├─ tailwind.config.js
├─ README.md
├─ src/
│  ├─ App.jsx
│  ├─ index.css
│  ├─ main.jsx
│  └─ assets/
│     └─ echo-room.png
├─ dist/
│  └─ production build output
└─ node_modules/
   └─ local dependencies
```

说明：

- `src/App.jsx`：主要 App 页面、交互、模拟回复、事件、商城、报告逻辑。
- `src/index.css`：Tailwind 入口和全局样式。
- `src/assets/echo-room.png`：启动页、出生页、房间页使用的主视觉图。
- `dist/`：执行 `npm run build` 后生成的部署产物。
- `node_modules/`：本机依赖目录，不需要手动上传到 Vercel。

## package.json

```json
{
  "name": "echo-ai-digital-child",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite --host 127.0.0.1",
    "build": "vite build",
    "preview": "vite preview --host 127.0.0.1"
  },
  "dependencies": {
    "@vitejs/plugin-react": "^5.0.0",
    "vite": "^7.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "lucide-react": "^0.468.0"
  },
  "devDependencies": {
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.17"
  }
}
```

## 本机运行

先安装依赖：

```bash
npm install
```

启动开发环境：

```bash
npm run dev
```

浏览器打开：

```text
http://127.0.0.1:5173/
```

生成生产版本：

```bash
npm run build
```

本机预览生产版本：

```bash
npm run preview
```

默认预览地址通常是：

```text
http://127.0.0.1:4173/
```

如果想清空本机测试数据，可以访问：

```text
http://127.0.0.1:4173/?reset=1
```

## 部署到 Vercel

推荐方式：把项目上传到 GitHub，再用 Vercel 导入。

1. 在 GitHub 创建一个新仓库。
2. 把当前项目提交并推送到 GitHub。
3. 打开 Vercel：https://vercel.com
4. 选择 `Add New Project`。
5. 选择刚才的 GitHub 仓库。
6. Vercel 会自动识别为 Vite 项目。
7. 确认配置：

```text
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

8. 点击 `Deploy`。
9. 部署完成后，Vercel 会生成一个公网地址，例如：

```text
https://echo-ai-digital-child.vercel.app
```

把这个地址发给朋友，朋友就可以用手机浏览器访问测试版。

## 当前 Beta 限制

- 当前没有账号系统。
- 当前数据存在访问者自己的浏览器里。
- 不同手机、不同浏览器之间不会同步同一个孩子数据。
- 当前聊天是模拟回复，没有调用真实 OpenAI API。
- 后续如果要支持登录、跨设备同步、真实 AI 回复，建议接入 Firebase Auth、Firestore 和 OpenAI API。

## 推荐测试方式

朋友手机打开 Vercel 地址后，可以按这个流程测试：

1. 打开启动页。
2. 点击「开始创造」。
3. 上传照片或跳过。
4. 选择性别、性格，输入孩子名字。
5. 点击「让 ECHO 诞生」。
6. 进入首页查看房间、年龄、亲密度、快乐值、成长值。
7. 测试聊天、每日事件、成长相册、商城和家长报告。

