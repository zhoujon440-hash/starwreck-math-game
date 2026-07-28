export type CharacterId = 'CHAR-XINGYU' | 'CHAR-QIMA'

export type XingyuPortraitState =
  | 'normal'
  | 'alert'
  | 'thinking'
  | 'nervous'
  | 'determined'

export type QimaPortraitState =
  | 'offline'
  | 'damaged'
  | 'booting'
  | 'normal'
  | 'question'
  | 'warning'
  | 'proud'
  | 'awkward'
  | 'scanning'

export type PortraitState = XingyuPortraitState | QimaPortraitState

export type CharacterDefinition = {
  character_id: CharacterId
  official_id: string | null
  name: string
  runtime_key: 'xingyu' | 'qima'
  portrait_states: Record<string, string>
  default_state: PortraitState
  available_states: PortraitState[]
  introduction_status: 'available'
  archive_status: 'locked_until_introduction'
  relationship_status: string
  introduction: string
  discoveries: string[]
  source_package: 'PKG-CHARACTERS-V2.1'
  source_entry: string
  source_sha256: string
}
