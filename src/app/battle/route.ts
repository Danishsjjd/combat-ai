import { NextRequest, NextResponse } from "next/server"
import {
  createParser,
  ParsedEvent,
  ReconnectInterval,
} from "eventsource-parser"
import { PromptTemplate } from "@langchain/core/prompts"

class OpenAIError extends Error {
  type: string
  param: string
  code: string

  constructor(message: string, type: string, param: string, code: string) {
    super(message)
    this.name = "OpenAIError"
    this.type = type
    this.param = param
    this.code = code
  }
}
const template = `You're a professional fighting judge from pakistan and you speak mostly with professional slang.
Who would win in a fight between {opponent1} ("opponent1") and {opponent2} ("opponent2")?
Only tell me who the winner is and a short reason only.

Format the response like this:
"winner: opponent1 or opponent2. reason: the reason they won.

Return the winner using only their label ("opponent1" or "opponent2") and not their name`

const promptTemplate = new PromptTemplate({
  template,
  inputVariables: ["opponent1", "opponent2"],
})

export async function POST(req: NextRequest) {
  const { opponent1, opponent2 } = (await req.json()) as {
    opponent1?: string
    opponent2?: string
  }

  if (!opponent1 || !opponent2)
    return NextResponse.json({ message: "Both opponents is required" })

  const prompt = await promptTemplate.invoke({ opponent1, opponent2 })

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "post",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "user",
          content: prompt.value,
        },
      ],
      stream: true,
      max_tokens: 200,
      temperature: 1,
    }),
  })

  const encoder = new TextEncoder()
  const decoder = new TextDecoder()

  if (res.status !== 200) {
    const result = await res.json()
    if (result.error) {
      throw new OpenAIError(
        result.error.message,
        result.error.type,
        result.error.param,
        result.error.code
      )
    } else {
      throw new Error(
        `OpenAI API returned an error: ${
          decoder.decode(result?.value) || result.statusText
        }`
      )
    }
  }

  const stream = new ReadableStream({
    async start(controller) {
      const onParse = (event: ParsedEvent | ReconnectInterval) => {
        if (event.type === "event") {
          const data = event.data

          if (data === "[DONE]") {
            controller.close()
            return
          }

          try {
            const json = JSON.parse(data)
            const text = json.choices[0].delta.content
            const queue = encoder.encode(text)
            controller.enqueue(queue)
          } catch (e) {
            controller.error(e)
          }
        }
      }

      const parser = createParser(onParse)

      for await (const chunk of res.body as any) {
        parser.feed(decoder.decode(chunk))
      }
    },
  })

  return new Response(stream)
}
