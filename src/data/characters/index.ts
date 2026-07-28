import type {
  CharacterDefinition,
  CharacterId,
  PortraitState,
} from '../../types/character'

const SOURCE_ENTRY =
  '星骸拾荒者_人物形象设计全集_V2.1_补齐版/01_十二星球人物三视图/G02_锈环星_人物三视图.png'
const SOURCE_SHA256 =
  'c549fe94157daea3606a1b7b32562e28108c9e54f2dac1b156b38c8097c0a0b3'

const portraitMap = <T extends readonly string[]>(
  runtimeKey: string,
  states: T,
): Record<T[number], string> =>
  Object.fromEntries(
    states.map((state) => [
      state,
      `/assets/characters/${runtimeKey}/${runtimeKey}_${state}.png`,
    ]),
  ) as Record<T[number], string>

const xingyuStates = [
  'normal',
  'alert',
  'thinking',
  'nervous',
  'determined',
] as const
const qimaStates = [
  'offline',
  'damaged',
  'booting',
  'normal',
  'question',
  'warning',
  'proud',
  'awkward',
  'scanning',
] as const

export const CHARACTERS: Record<CharacterId, CharacterDefinition> = {
  'CHAR-XINGYU': {
    character_id: 'CHAR-XINGYU',
    official_id: null,
    name: '星宇',
    runtime_key: 'xingyu',
    portrait_states: portraitMap('xingyu', xingyuStates),
    default_state: 'normal',
    available_states: [...xingyuStates],
    introduction_status: 'available',
    archive_status: 'locked_until_introduction',
    relationship_status: '拾光号修复者',
    introduction: '行动迅速的少年拾荒者。习惯先观察、验证，再动手修复。',
    discoveries: ['纽扣眼与青蓝电子镜片', '随身携带维修工具'],
    source_package: 'PKG-CHARACTERS-V2.1',
    source_entry: SOURCE_ENTRY,
    source_sha256: SOURCE_SHA256,
  },
  'CHAR-QIMA': {
    character_id: 'CHAR-QIMA',
    official_id: 'EDU-0077',
    name: '七码',
    runtime_key: 'qima',
    portrait_states: portraitMap('qima', qimaStates),
    default_state: 'offline',
    available_states: [...qimaStates],
    introduction_status: 'available',
    archive_status: 'locked_until_introduction',
    relationship_status: '星宇的搜寻与记录搭档',
    introduction: '旧显示屏样式的导航机器人，认真记录每一次修复和每一句回答。',
    discoveries: ['编号 EDU-0077', '当前导航核心离线'],
    source_package: 'PKG-CHARACTERS-V2.1',
    source_entry: SOURCE_ENTRY,
    source_sha256: SOURCE_SHA256,
  },
}

export class CharacterDataStore {
  get(characterId: string): CharacterDefinition {
    const character = CHARACTERS[characterId as CharacterId]
    if (!character) throw new Error(`Unknown character: ${characterId}`)
    return character
  }

  portrait(characterId: string, state: string): string {
    const character = this.get(characterId)
    if (!character.available_states.includes(state as PortraitState)) {
      throw new Error(`Unknown portrait state: ${characterId}/${state}`)
    }
    const path = character.portrait_states[state]
    if (!path || path.includes('/art/source/')) {
      throw new Error(`Invalid runtime portrait: ${characterId}/${state}`)
    }
    return path
  }
}

export const characterData = new CharacterDataStore()
