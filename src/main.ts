import { registerSW } from 'virtual:pwa-register'
import './styles.css'

registerSW({ immediate: true })

const app = document.querySelector<HTMLDivElement>('#app')

if (!app) {
  throw new Error('Missing #app mount point')
}

app.innerHTML = `
  <main class="boot-shell" aria-live="polite">
    <div class="boot-mark" aria-hidden="true">✦</div>
    <p class="boot-kicker">G01 · 拾光号坠落之前</p>
    <h1>星骸拾荒者：十二星门</h1>
    <p class="boot-status">正在校准星门航线……</p>
  </main>
`

