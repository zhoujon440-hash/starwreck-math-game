import { registerSW } from 'virtual:pwa-register'
import { G01 } from './content/g01'
import { GameEngine } from './game/engine'
import { LocalSaveRepository } from './game/save'
import './styles.css'
import { GameView } from './ui/GameView'

registerSW({ immediate: true })

const app = document.querySelector<HTMLDivElement>('#app')

if (!app) {
  throw new Error('Missing #app mount point')
}

const engine = new GameEngine(G01, new LocalSaveRepository(G01.id))
const view = new GameView(app, engine)

view.mount()
