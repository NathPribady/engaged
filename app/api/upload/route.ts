import { NextResponse } from "next/server"
import { openai } from "@ai-sdk/openai"
import { embed } from "ai"
import { chunkText } from "@/utils/chunk"

export const maxDuration = 30

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const text = await file.text()
    const chunks = chunkText(text)
    const { embedding } = await embed({
      model: openai.embedding("text-embedding-3-small"),
      value: chunks[0],
    })

    return NextResponse.json({
      success: true,
      preview: chunks[0].slice(0, 200) + "...",
      totalChunks: chunks.length,
      embedding: embedding.slice(0, 5),
    })
  } catch (error: any) {
    console.error("Upload error:", error)
    return NextResponse.json({ error: error.message || "Error processing file" }, { status: 500 })
  }
}

