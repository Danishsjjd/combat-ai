import { create } from "zustand"
import { persist } from "zustand/middleware"

export type Fight = {
  opponent1: string
  opponent2: string
  response: string
  id: string
  image?: string
  winner: null | string
}

export const initialBattle = () => ({
  id: crypto.randomUUID(),
  opponent1: "",
  opponent2: "",
  response: "",
  winner: null,
})
const useBattle = create(
  persist<{
    battles: Fight[]
    setBattle: (e: Partial<Fight>, id: string) => void
    pushEmptyBattle: () => void
    cleanBattles: () => void
    hydrated: boolean
  }>(
    (set) => ({
      hydrated: false,
      battles: [initialBattle()],
      setBattle(e, id) {
        set((state) => ({
          battles: state.battles.map((j) => (j.id === id ? { ...j, ...e } : j)),
        }))
      },
      pushEmptyBattle() {
        set((state) => ({
          battles:
            state.battles.at(-1)?.response === ""
              ? state.battles
              : state.battles.concat(initialBattle()),
        }))
      },
      cleanBattles() {
        set((state) => ({
          battles: state.battles.filter(
            (e, i, ar) => i === ar.length - 1 || !!e.response
          ),
        }))
      },
    }),
    {
      name: "battle",
      onRehydrateStorage(state) {
        if (state) {
          state.hydrated = true
        }
      },
    }
  )
)

export default useBattle
