import { registerSW } from 'virtual:pwa-register'
import { G01 } from './content/g01'
import { LocalSaveRepository } from './game/save'
import { LocalUiMetaRepository } from './game/uiMetaSave'
import './styles.css'
import { TrialExperienceApp } from './ui/TrialExperienceApp'

registerSW({ immediate: true })

const app = document.querySelector<HTMLDivElement>('#app')

if (!app) {
  throw new Error('Missing #app mount point')
}

const experience = new TrialExperienceApp(
  app,
  G01,
  new LocalSaveRepository(G01.id),
  new LocalUiMetaRepository(),
)

experience.mount()
