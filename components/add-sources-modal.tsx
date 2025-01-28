"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { X, Upload } from "lucide-react"
import { processFile } from "@/app/actions"
import { useToast } from "@/components/ui/use-toast"
import { extractTextFromFile } from "@/utils/fileProcessing"

interface AddSourcesModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onFileProcessed: () => void
  notebookId: string
}

export function AddSourcesModal({ open, onOpenChange, onFileProcessed, notebookId }: AddSourcesModalProps) {
  const [dragActive, setDragActive] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  // Reset state when the modal is opened
  useEffect(() => {
    if (open) {
      setDragActive(false)
      setUploading(false)
      setProgress(0)
      setError(null)
    }
  }, [open])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    const files = e.dataTransfer.files
    if (files?.length) {
      handleFiles(files)
    }
  }

  const handleFiles = async (files: FileList) => {
    setUploading(true)
    setProgress(0)
    setError(null)

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        setProgress((prev) => Math.min(prev + 30, 90))

        console.log(`Processing file: ${file.name}`)
        const { text, fileName } = await extractTextFromFile(file)

        console.log(`File extracted, sending to server: ${fileName}`)
        const result = await processFile({
          fileName,
          fileType: file.type,
          content: text,
          notebookId,
        })

        console.log("Process file result:", result) // Add this line for debugging

        setProgress(100)

        if (!result.success) {
          throw new Error(result.error || "Unknown error occurred while processing the file")
        }

        toast({
          title: "File processed successfully",
          description: `Processed ${result.chunks} chunks from ${fileName}`,
        })
      }

      onFileProcessed()
      onOpenChange(false)
    } catch (error: any) {
      console.error("Error processing file:", error)
      setError(error.message || "An unexpected error occurred while processing the file.")
      toast({
        title: "Error processing file",
        description: error.message || "An unexpected error occurred while processing the file.",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
      setProgress(0)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <div className="flex items-center justify-between border-b pb-4">
          <div className="flex items-center gap-2">
            <img src="/placeholder.svg?height=24&width=24" alt="Engaged!" className="h-6 w-6" />
            <h2 className="text-lg font-semibold">Add sources</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <p className="text-sm text-muted-foreground">
          Sources let Engaged! base its responses on the information that matters most to you.
          <br />
          (Examples: marketing plans, course reading, research notes, meeting transcripts, sales documents, etc.)
        </p>

        <div
          className={`mt-4 rounded-lg border-2 border-dashed p-8 text-center ${
            dragActive ? "border-primary bg-muted/50" : "border-muted-foreground/25"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">Upload sources</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Drag & drop or{" "}
            <button
              className="text-blue-500 hover:underline"
              onClick={() => document.getElementById("file-upload")?.click()}
            >
              choose file
            </button>{" "}
            to upload
          </p>
          <Input
            id="file-upload"
            type="file"
            className="hidden"
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
            multiple
            accept=".doc,.docx,.pdf,.txt"
          />
          <p className="mt-2 text-xs text-muted-foreground">Supported file types: DOC, DOCX, PDF, TXT</p>
        </div>
        {error && (
          <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            <p className="font-bold">Error:</p>
            <p>{error}</p>
          </div>
        )}

        <div className="mt-4">
          <div className="flex items-center justify-between text-sm">
            <span>{uploading ? "Processing..." : "Ready"}</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="mt-2" />
        </div>
      </DialogContent>
    </Dialog>
  )
}

