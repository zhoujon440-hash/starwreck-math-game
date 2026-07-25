import { registerSW } from 'virtual:pwa-register'
import { G01_ADVENTURE } from './content/g01-adventure'
import { GameEngine } from './game/engine'
import { LocalSaveRepository } from './game/save'
import './styles.css'
import { GameView } from './ui/GameView'

registerSW({ immediate: true })

const app = document.querySelector<HTMLDivElement>('#app')

if (!app) {
  throw new Error('Missing #app mount point')
}

const engine = new GameEngine(G01_ADVENTURE, new LocalSaveRepository(G01_ADVENTURE.id))
const view = new GameView(app, engine)

view.mount()
