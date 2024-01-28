"use client"

import useBattle, { initialBattle, type Fight } from "@/hooks/useBattle"
import { toast } from "sonner"
import axios from "axios"
import { confetti } from "party-js"
import { ComponentPropsWithoutRef, useEffect, useId, useState } from "react"
import { Loader } from "lucide-react"
import {
  array,
  minLength,
  nullable,
  object,
  optional,
  safeParse,
  string,
} from "valibot"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog"
import Image from "next/image"

const battleSchema = array(
  object({
    opponent1: string(),
    opponent2: string([minLength(1)]),
    response: string(),
    image: optional(string()),
    winner: nullable(string()),
  })
)

const BattlePage = () => {
  const { battles, hydrated } = useBattle((state) => ({
    battles: state.battles,
    hydrated: state.hydrated,
  }))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!hydrated) return

    const { cleanBattles, pushEmptyBattle, battles } = useBattle.getState()
    const data = safeParse(battleSchema, battles)
    if (!data.success)
      useBattle.setState({
        battles: [initialBattle()],
      })
    cleanBattles()
    pushEmptyBattle()

    setLoading(false)
  }, [hydrated])

  if (loading)
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader className="animate-spin duration-1000 w-10 opacity-90" />
      </div>
    )

  return (
    <main className="max-w-4xl mx-auto p-4 pb-96">
      <h3 className="text-4xl">CombatAI</h3>
      <p>Ai that can predict who will win in a fight</p>
      {battles.map((battle) => (
        <Battle key={battle.id} {...battle} />
      ))}
    </main>
  )
}

const Battle = ({
  id,
  opponent1,
  opponent2,
  response,
  image,
  winner,
}: Fight) => {
  const [isLoading, setIsLoading] = useState(false)
  const [imageLoading, setImageLoading] = useState(false)
  const { setBattle, pushEmptyBattle } = useBattle((state) => ({
    setBattle: state.setBattle,
    pushEmptyBattle: state.pushEmptyBattle,
  }))
  const opponent1Id = useId()
  const opponent2Id = useId()

  const submitHandler = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!opponent1 || !opponent2) return

    try {
      setIsLoading(true)
      const data = await fetch("/battle", {
        method: "post",
        body: JSON.stringify({ opponent1, opponent2 }),
        headers: {
          "Content-Type": "application/json",
        },
      })

      const reader = data.body?.getReader()

      setBattle({ response: "" }, id)
      let responseTxt = ""
      while (true) {
        const data = await reader?.read()
        if (!data) break

        const { done, value } = data
        if (!value || done) {
          if (done) {
            const winnerRegex = /winner:\s(.*)reason:\s(.*)/g.exec(responseTxt)
            const winner = winnerRegex?.[1][8]
            if (winner) {
              setBattle({ winner }, id)
              const opponent = document.getElementById(
                winner === "1" ? opponent1Id : opponent2Id
              )
              if (opponent)
                confetti(opponent as HTMLElement, {
                  count: 40,
                  size: 2,
                  spread: 15,
                })
            }
          }
          break
        }

        const textDecoder = new TextDecoder()
        const res = textDecoder.decode(value)
        setBattle({ response: responseTxt.concat(res).slice(27) }, id)
        responseTxt += res
      }
    } catch (e) {
      toast.error("Something went wrong while creating response!")
    } finally {
      setIsLoading(false)
      pushEmptyBattle()
    }
  }

  const imageLoader = async () => {
    if (imageLoading || image) return
    setImageLoading(true)
    try {
      const res = await axios.post<string>("/battle/image/create", {
        opponent1,
        opponent2,
      })
      setBattle({ image: res.data }, id)
    } catch (e) {
      toast.error("Something went wrong while creating image!")
    } finally {
      setImageLoading(false)
    }
  }

  const disabled = isLoading || !!response
  return (
    <div>
      <form onSubmit={submitHandler}>
        <div className="grid grid-cols-2 gap-8 mt-8">
          <Input
            id={opponent1Id}
            label="Opponent 1"
            name="opponent1"
            value={opponent1}
            onChange={(e) => setBattle({ opponent1: e.target.value }, id)}
            className={winner === "1" ? "rainbow" : ""}
            disabled={disabled}
          />
          <Input
            id={opponent2Id}
            label="Opponent 2"
            name="opponent2"
            value={opponent2}
            onChange={(e) => setBattle({ opponent2: e.target.value }, id)}
            className={winner === "2" ? "rainbow" : ""}
            disabled={disabled}
          />
        </div>
        <button className="mt-4" disabled={disabled}>
          send{isLoading && "ding..."}
        </button>
      </form>
      {response && (
        <div className="mt-4 border-2 rounded-lg p-4 bg-[canvas]">
          <p>{response}</p>
        </div>
      )}
      {!isLoading && !!response && (
        <Dialog>
          <DialogTrigger asChild>
            <button
              className="mt-4"
              onClick={imageLoader}
              disabled={imageLoading}
            >
              {imageLoading ? "Generating image..." : "Load image"}
            </button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Image</DialogTitle>
              <DialogDescription>Ai generated image</DialogDescription>

              {image ? (
                <Image
                  src={image}
                  alt={`${opponent1} vs ${opponent2}`}
                  width={512}
                  height={512}
                />
              ) : (
                <div className="max-w-[512px] mx-auto h-[512px] flex items-center justify-center">
                  <Loader className="text-white animate-spin" />
                </div>
              )}
            </DialogHeader>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

const Input = ({
  label,
  id,
  ...props
}: { label: string } & ComponentPropsWithoutRef<"textarea">) => (
  <div>
    <label htmlFor={id}>{label}</label>
    <textarea id={id} {...props} />
  </div>
)

export default BattlePage
