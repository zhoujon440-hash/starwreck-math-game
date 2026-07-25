export type CharacterSide = 'left' | 'right'

export type CharacterProfileSection = {
  id: string
  label: string
  value: string
  unlockFlag?: string
}

export type CharacterDefinition<PortraitState extends string = string> = {
  characterId: string
  displayName: string
  fullName: string
  role: string
  shortIntroduction: string
  personality: string
  visualDescription: string
  portraitStates: Record<PortraitState, string>
  defaultPortrait: PortraitState
  defaultSide: CharacterSide
  firstAppearanceScene: string
  unlockedProfileSections: CharacterProfileSection[]
}
