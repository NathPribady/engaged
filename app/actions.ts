"use server"

import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { openai } from "@ai-sdk/openai"
import { generateText } from "ai"
import { embed } from "ai"
import { chunkText } from "@/utils/chunk"
import { extractTextFromFile } from "@/utils/fileProcessing"
import type { SyllabusOptions } from "@/components/syllabus-creation-modal"
import type { Database } from "@/types/supabase"

export async function createNotebook(files: File[]) {
  const supabase = createServerComponentClient({ cookies })
  try {
    if (files.length === 0) {
      throw new Error("No files provided")
    }

    const { data: notebook, error: notebookError } = await supabase
      .from("notebooks")
      .insert({ title: "Processing..." })
      .select()
      .single()

    if (notebookError) {
      throw notebookError
    }

    const fileSummaries = []
    for (const file of files) {
      const { text, fileName } = await extractTextFromFile(file)

      const result = await processFile({
        fileName,
        fileType: file.type,
        content: text,
        notebookId: notebook.id,
      })

      if (!result.success) {
        throw new Error(`Failed to process file ${fileName}: ${result.error}`)
      }

      fileSummaries.push(result.summary)
    }

    const { title: generatedTitle } = await generateTitle(fileSummaries)

    const { error: updateError } = await supabase
      .from("notebooks")
      .update({ title: generatedTitle })
      .eq("id", notebook.id)

    if (updateError) {
      throw updateError
    }

    return { success: true, notebook: { ...notebook, title: generatedTitle } }
  } catch (error: any) {
    console.error("Create notebook error:", error)
    return { success: false, error: error.message }
  }
}

export async function getNotebooks(page = 1, pageSize = 12) {
  const supabase = createServerComponentClient({ cookies })
  try {
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const { data, error, count } = await supabase
      .from("notebooks")
      .select(
        `
        id,
        title,
        created_at,
        sources (count)
      `,
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .range(from, to)

    if (error) {
      throw error
    }

    return {
      success: true,
      notebooks: data.map((notebook) => ({
        ...notebook,
        sources: notebook.sources[0].count,
      })),
      totalCount: count,
    }
  } catch (error: any) {
    console.error("Get notebooks error:", error)
    return { success: false, error: error.message }
  }
}

export async function getNotebookSummary(notebookId: string) {
  const supabase = createServerComponentClient<Database>({ cookies })
  try {
    const { data: notebook, error: notebookError } = await supabase
      .from("notebooks")
      .select("*, sources(*)")
      .eq("id", notebookId)
      .single()

    if (notebookError) {
      throw notebookError
    }

    if (!notebook) {
      throw new Error("Notebook not found")
    }

    const fileSummaries = notebook.sources?.map((source: any) => source.summary) || []
    const { summary: overallSummary } = await generateOverallSummary(fileSummaries)

    return {
      success: true,
      summary: {
        id: notebook.id,
        title: notebook.title,
        overallSummary: overallSummary,
        sources: notebook.sources || [],
      },
    }
  } catch (error: any) {
    console.error("Get notebook summary error:", error)
    return { success: false, error: error.message }
  }
}

export async function generateChatResponse(notebookId: string, query: string) {
  const supabase = createServerComponentClient({ cookies })
  try {
    const { data: notebook, error: notebookError } = await supabase
      .from("notebooks")
      .select(`
        id,
        title,
        sources (
          id,
          file_name,
          file_type,
          summary
        )
      `)
      .eq("id", notebookId)
      .single()

    if (notebookError) {
      throw notebookError
    }

    if (!notebook || !notebook.sources || notebook.sources.length === 0) {
      return { text: "I couldn't find any information in this notebook. Please try adding some sources first." }
    }

    const { success, conversation, error } = await getOrCreateConversation(notebookId)
    if (!success || !conversation) {
      throw new Error(error || "Failed to get or create conversation")
    }

    const { success: historySuccess, messages: conversationHistory } = await getConversationHistory(notebookId)
    if (!historySuccess) {
      throw new Error("Failed to fetch conversation history")
    }

    await supabase.from("messages").insert({
      conversation_id: conversation.id,
      role: "user",
      content: query,
    })

    const fullConversation = [...conversationHistory, { role: "user", content: query }]

    const sourceSummaries = notebook.sources.map((source) => `${source.file_name}: ${source.summary}`).join("\n\n")

    const conversationContext = fullConversation.map((msg) => `${msg.role}: ${msg.content}`).join("\n")

    const { text } = await generateText({
      model: openai("gpt-4o"),
      prompt: `You are an AI assistant helping with a notebook of documents. Use the following summaries of all the documents and the full conversation history to answer the user's latest question. If the answer cannot be found in the summaries or conversation history, say so.
               Format your response with proper paragraphs and use Markdown for emphasis.
               Use double line breaks between paragraphs and convert *asterisks* to **bold** text.
               When referencing information from the documents, mention the source file name.
               
               Document Summaries:
               ${sourceSummaries}

               Full Conversation History:
               ${conversationContext}
               
               Assistant: Based on the document summaries and the full conversation, here's my response to the latest question:`,
    })

    const formattedText = text.replace(/\n{2,}/g, "\n\n").replace(/\*{1,2}(.*?)\*{1,2}/g, "**$1**")

    await supabase.from("messages").insert({
      conversation_id: conversation.id,
      role: "assistant",
      content: formattedText,
    })

    return { text: formattedText }
  } catch (error: any) {
    console.error("Generate chat response error:", error)
    return { error: error.message || "An unexpected error occurred while generating the response" }
  }
}

export async function processFile(fileData: {
  fileName: string
  fileType: string
  content: string
  notebookId: string
}) {
  const supabase = createServerComponentClient({ cookies })
  try {
    if (!fileData.content) {
      throw new Error("File content is empty")
    }

    if (
      fileData.fileType !== "application/vnd.openxmlformats-officedocument.wordprocessingml.document" &&
      fileData.fileType !== "application/msword"
    ) {
      throw new Error("Unsupported file type. Please upload a DOC or DOCX file.")
    }

    const chunks = chunkText(fileData.content)

    if (chunks.length === 0) {
      throw new Error("No text content found in the file")
    }

    const { text: summary } = await generateText({
      model: openai("gpt-4o"),
      prompt: `Summarize the following text in about 30 words:\n\n${fileData.content.slice(0, 2000)}...`,
    })

    const { data: sourceData, error: sourceError } = await supabase
      .from("sources")
      .insert({
        notebook_id: fileData.notebookId,
        file_name: fileData.fileName,
        file_type: fileData.fileType,
        summary: summary,
      })
      .select()
      .single()

    if (sourceError) {
      throw sourceError
    }

    const processedChunks = await Promise.all(
      chunks.map(async (chunk) => {
        const { embedding } = await embed({
          model: openai.embedding("text-embedding-3-small"),
          value: chunk,
        })
        return { content: chunk, embedding, source_id: sourceData.id }
      }),
    )

    const { error: chunksError } = await supabase.from("chunks").insert(
      processedChunks.map((chunk) => ({
        source_id: chunk.source_id,
        content: chunk.content,
        embedding: chunk.embedding,
      })),
    )

    if (chunksError) {
      throw chunksError
    }

    return {
      success: true,
      fileName: fileData.fileName,
      fileType: fileData.fileType,
      summary,
      chunks: chunks.length,
      preview: chunks[0].slice(0, 200) + "...",
    }
  } catch (error: any) {
    console.error("Process file error:", error)
    return { success: false, error: error.message || "An unexpected error occurred while processing the file" }
  }
}

export async function getOrCreateConversation(notebookId: string) {
  const supabase = createServerComponentClient({ cookies })
  try {
    let { data: conversation, error } = await supabase
      .from("conversations")
      .select("*")
      .eq("notebook_id", notebookId)
      .single()

    if (error && error.code !== "PGRST116") {
      throw error
    }

    if (!conversation) {
      const { data: newConversation, error: insertError } = await supabase
        .from("conversations")
        .insert({ notebook_id: notebookId })
        .select()
        .single()

      if (insertError) throw insertError
      conversation = newConversation
    }

    return { success: true, conversation }
  } catch (error: any) {
    console.error("Get or create conversation error:", error)
    return { success: false, error: error.message }
  }
}

export async function getConversationHistory(notebookId: string) {
  const supabase = createServerComponentClient({ cookies })
  try {
    const { data: conversation, error: conversationError } = await supabase
      .from("conversations")
      .select("id")
      .eq("notebook_id", notebookId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    if (conversationError) {
      if (conversationError.code === "PGRST116") {
        return { success: true, messages: [] }
      }
      throw conversationError
    }

    if (!conversation) {
      return { success: true, messages: [] }
    }

    const { data: messages, error: messagesError } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversation.id)
      .order("created_at", { ascending: true })

    if (messagesError) throw messagesError

    return { success: true, messages: messages || [] }
  } catch (error: any) {
    console.error("Get conversation history error:", error)
    return { success: false, error: error.message }
  }
}

export async function generateSyllabus(notebookId: string, options: SyllabusOptions) {
  const supabase = createServerComponentClient<Database>({ cookies })
  try {
    const { data: notebook, error: notebookError } = await supabase
      .from("notebooks")
      .select("*, sources(*)")
      .eq("id", notebookId)
      .single()

    if (notebookError) {
      throw new Error(`Error fetching notebook: ${notebookError.message}`)
    }

    if (!notebook) {
      throw new Error("Notebook not found")
    }

    const fileSummaries = notebook.sources.map((source: any) => source.summary).join("\n\n")

    const syllabusContent = await generateSyllabusContent(fileSummaries, options)

    const { data: syllabus, error: syllabusError } = await supabase
      .from("syllabi")
      .insert({ notebook_id: notebookId, content: syllabusContent })
      .select()
      .single()

    if (syllabusError) {
      throw new Error(`Error creating syllabus: ${syllabusError.message}`)
    }

    const { error: featureError } = await saveGeneratedFeature(notebookId, {
      name: "Syllabus",
      description: "Create a comprehensive course syllabus",
      type: "syllabus",
      referenceId: syllabus.id,
    })

    if (featureError) {
      throw new Error(`Error saving generated feature: ${featureError.message}`)
    }

    const activitiesToInsert = [
      ...options.activities.map((name) => ({ syllabus_id: syllabus.id, name })),
      ...(options.customActivity ? [{ syllabus_id: syllabus.id, name: options.customActivity }] : []),
    ]
    const { error: activitiesError } = await supabase.from("activities").insert(activitiesToInsert)

    if (activitiesError) {
      throw new Error(`Error inserting activities: ${activitiesError.message}`)
    }

    const approachesToInsert = [
      ...options.pedagogies.map((name) => ({ syllabus_id: syllabus.id, name })),
      ...(options.customPedagogy ? [{ syllabus_id: syllabus.id, name: options.customPedagogy }] : []),
    ]
    const { error: approachesError } = await supabase.from("pedagogical_approaches").insert(approachesToInsert)

    if (approachesError) {
      throw new Error(`Error inserting pedagogical approaches: ${approachesError.message}`)
    }

    const { data: completeSyllabus, error: completeSyllabusError } = await supabase
      .from("syllabi")
      .select(`
        *,
        activities(*),
        pedagogical_approaches(*)
      `)
      .eq("id", syllabus.id)
      .single()

    if (completeSyllabusError) {
      throw new Error(`Error fetching complete syllabus: ${completeSyllabusError.message}`)
    }

    return { success: true, syllabus: completeSyllabus }
  } catch (error: any) {
    console.error("Generate syllabus error:", error)
    return { success: false, error: error.message || "An unexpected error occurred while generating the syllabus" }
  }
}

async function generateSyllabusContent(fileSummaries: string, options: SyllabusOptions): Promise<string> {
  const sections = [
    {
      title: "Course Description",
      prompt: "Generate a comprehensive course description based on the provided content summaries.",
    },
    {
      title: "Learning Objectives",
      prompt: "Create a list of specific and measurable learning objectives for the course.",
    },
    {
      title: "Course Structure",
      prompt: "Outline the overall structure of the course, including major topics and their sequence.",
    },
    {
      title: "Assessment Methods",
      prompt:
        "Describe the assessment methods for the course, incorporating the selected activities and Universal Design for Learning principles.",
    },
    {
      title: "Weekly Schedule",
      prompt:
        "Create a detailed 14-week schedule with at least 5 different class activities for each week, based on Universal Design of Learning principles.",
    },
    {
      title: "Required Readings and Materials",
      prompt:
        "Compile a list of required readings and materials for the course, based on the content summaries provided.",
    },
  ]

  let syllabusContent = ""

  for (const section of sections) {
    const { text } = await generateText({
      model: openai("gpt-4o"),
      prompt: `${section.prompt}

Content summaries:
${fileSummaries}

Activities: ${options.activities.join(", ")}${options.customActivity ? ", " + options.customActivity : ""}
Pedagogical approaches: ${options.pedagogies.join(", ")}${options.customPedagogy ? ", " + options.customPedagogy : ""}

Ensure that the content reflects the chosen pedagogical approaches and incorporates the selected activities appropriately. Use Markdown formatting for better readability.`,
    })

    syllabusContent += `## ${section.title}

${text}

`
  }

  return syllabusContent.trim()
}

export async function getSyllabi(notebookId: string) {
  const supabase = createServerComponentClient<Database>({ cookies })
  try {
    const { data: syllabi, error } = await supabase
      .from("syllabi")
      .select(`
        *,
        activities(*),
        pedagogical_approaches(*)
      `)
      .eq("notebook_id", notebookId)
      .order("created_at", { ascending: false })

    if (error) {
      throw error
    }

    return { success: true, syllabi }
  } catch (error: any) {
    console.error("Get syllabi error:", error)
    return { success: false, error: error.message }
  }
}

export async function saveGeneratedFeature(
  notebookId: string,
  feature: {
    name: string
    description: string
    type: string
    referenceId: string
  },
) {
  const supabase = createServerComponentClient<Database>({ cookies })
  try {
    const { data, error } = await supabase
      .from("generated_features")
      .insert({
        notebook_id: notebookId,
        name: feature.name,
        description: feature.description,
        type: feature.type,
        reference_id: feature.referenceId,
      })
      .select()
      .single()

    if (error) throw error
    return { success: true, feature: data }
  } catch (error: any) {
    console.error("Save generated feature error:", error)
    return { success: false, error: error.message }
  }
}

export async function getGeneratedFeatures(notebookId: string) {
  const supabase = createServerComponentClient<Database>({ cookies })
  try {
    const { data, error } = await supabase
      .from("generated_features")
      .select("*")
      .eq("notebook_id", notebookId)
      .order("created_at", { ascending: false })

    if (error) throw error

    const featuresWithContent = await Promise.all(
      data.map(async (feature) => {
        if (feature?.type === "syllabus" && feature.reference_id) {
          const { data: syllabus } = await supabase.from("syllabi").select("*").eq("id", feature.reference_id).single()

          if (syllabus) {
            const title = syllabus.content.split("\n")[0].replace(/^#\s*/, "").replace(/\*\*/g, "")
            return {
              ...feature,
              description: title,
              syllabi: syllabus,
            }
          }
        }
        return feature
      }),
    )

    return { success: true, features: featuresWithContent.filter(Boolean) }
  } catch (error: any) {
    console.error("Get generated features error:", error)
    return { success: false, error: error.message }
  }
}

export async function getSyllabus(syllabusId: string) {
  const supabase = createServerComponentClient<Database>({ cookies })
  try {
    const { data: syllabus, error } = await supabase
      .from("syllabi")
      .select(`
        *,
        activities(*),
        pedagogical_approaches(*)
      `)
      .eq("id", syllabusId)
      .single()

    if (error) {
      throw error
    }

    return { success: true, syllabus }
  } catch (error: any) {
    console.error("Get syllabus error:", error)
    return { success: false, error: error.message }
  }
}

async function generateTitle(fileSummaries: string[]) {
  try {
    const combinedSummaries = fileSummaries.join("\n\n")
    const { text: title } = await generateText({
      model: openai("gpt-4o"),
      prompt: `Based on the following summaries of all uploaded files, generate a concise and relevant title for a notebook or study session. The title should be no more than 6 words long and reflect the overall theme or topic of all the documents combined. If there's only one summary, make sure the title is still general enough to allow for future additions.

Summaries:
${combinedSummaries}

Title:`,
    })

    return { title: title.trim() }
  } catch (error: any) {
    console.error("Generate title error:", error)
    return { title: "Untitled Notebook" }
  }
}

async function generateOverallSummary(fileSummaries: string[]) {
  try {
    const combinedSummaries = fileSummaries.join("\n\n")
    const { text: summary } = await generateText({
      model: openai("gpt-4o"),
      prompt: `Based on the following summaries of all uploaded files, generate a concise summary that captures the main themes and key points across all documents. The summary should be exactly 2 sentences long.

Summaries:
${combinedSummaries}

Overall Summary (2 sentences):`,
    })

    return { summary: summary.trim() }
  } catch (error: any) {
    console.error("Generate overall summary error:", error)
    return { summary: "Unable to generate summary." }
  }
}

