import { PromptTemplate } from "@langchain/core/prompts"
import axios from "axios"
import { createWriteStream } from "fs"
import { NextRequest, NextResponse } from "next/server"
import path from "path"
import { cwd } from "process"
import * as stream from "stream"
import { promisify } from "util"

const finished = promisify(stream.finished)

export async function downloadFile(
  fileUrl: string,
  outputLocationPath: string
): Promise<any> {
  const writer = createWriteStream(outputLocationPath)
  return axios({
    method: "get",
    url: fileUrl,
    responseType: "stream",
  }).then((response) => {
    response.data.pipe(writer)
    return finished(writer)
  })
}

const mods = [
  /** Style */
  //   "Abstract",
  //   "Academic",
  //   "Action painting",
  //   "Aesthetic",
  //   "Angular",
  //   "Automatism",
  //   "Avant-garde",
  //   "Baroque",
  //   "Bauhaus",
  //   "Contemporary",
  //   "Cubism",
  //   "Cyberpunk",
  //   "Digital art",
  //   "photo",
  //  "vector art",
  //   "Expressionism",
  //   "Fantasy",
  //   "Impressionism",
  //   "kiyo-e",
  //   "Medieval",
  //   "Minimal",
  //   "Modern",
  //   "Pixel art",
  "Realism",
  //   "sci-fi",
  //   "Surrealism",
  //   "synthwave",
  //   "3d-model",
  //   "analog-film",
  //   "anime",
  //   "comic-book",
  //   "enhance",
  //   "fantasy-art",
  //   "isometric",
  //   "line-art",
  //   "low-poly",
  //   "modeling-compound",
  //   "origami",
  //   "photographic",
  //   "tile-texture",

  /** Format */
  //   "3D render",
  //   "Blender Model",
  //   "CGI rendering",
  "cinematic",
  //   "Detailed render",
  //   "oil painting",
  //   "unreal engine 5",
  //   "watercolor",
  //   "cartoon",
  //   "anime",
  //   "colored pencil",

  /** Quality */
  "high resolution",
  //   "high-detail",
  //   "low-poly",
  //   "photographic",
  //   "photorealistic",
  "realistic",

  /** Effects */
  //   "Beautiful lighting",
  //   "Cinematic lighting",
  //   "Dramatic",
  //   "dramatic lighting",
  //   "Dynamic lighting",
  "epic",
  //   "Portrait lighting",
  //   "Volumetric lighting",
]

const promptTemplate = new PromptTemplate({
  template: `{opponent1} and {opponent2} in a battle to the death, ${mods.join(
    ", "
  )}`,
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

  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "post",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "dall-e-2",
      size: "512x512",
      prompt: prompt.value,
    }),
  }).then(
    async (data) =>
      (await data.json()) as {
        created: number
        data: { url: string }[]
      }
  )

  const imageName = `/images/generated/${crypto.randomUUID()}.png`

  await downloadFile(res.data[0].url, path.join(cwd(), `/public${imageName}`))
  return new Response(imageName)
}
