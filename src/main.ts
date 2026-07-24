import "./styles/main.css";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("Missing #app root");

app.innerHTML = `
  <main class="project-entry">
    <p class="eyebrow">G01 · 正式HOPA开发入口</p>
    <h1>星骸拾荒者：十二星门</h1>
    <p>Codex请执行 tasks/TASK-001_G01正式HOPA重构.md。</p>
  </main>
`;
