import mammoth from "mammoth"

export async function extractTextFromFile(file: File): Promise<{ text: string; fileName: string }> {
  console.log(`Processing file: ${file.name}, type: ${file.type}`)
  const fileType = file.type

  if (
    fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    fileType === "application/msword"
  ) {
    return extractTextFromDOCX(file)
  } else {
    throw new Error("Unsupported file type. Please upload a DOC or DOCX file.")
  }
}

async function extractTextFromDOCX(file: File): Promise<{ text: string; fileName: string }> {
  const arrayBuffer = await file.arrayBuffer()
  const result = await mammoth.extractRawText({ arrayBuffer })
  return { text: result.value, fileName: file.name }
}

