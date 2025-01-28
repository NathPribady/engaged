"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Upload, Loader } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { createNotebook } from "@/app/actions"

interface CreateNotebookModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateNotebookModal({ open, onOpenChange }: CreateNotebookModalProps) {
  const [files, setFiles] = useState<File[]>([])
  const [dragActive, setDragActive] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const handleCreate = async (filesToUpload: File[]) => {
    if (filesToUpload.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one file to create a notebook.",
        variant: "destructive",
      })
      return
    }

    setIsCreating(true)
    try {
      const result = await createNotebook(filesToUpload)
      if (result.success) {
        setFiles([])
        onOpenChange(false) // Close the modal
        router.push(`/notebook/${result.notebook.id}/summary`)
        toast({
          title: "Success",
          description: "Notebook created successfully.",
        })
      } else {
        throw new Error(result.error || "Failed to create notebook")
      }
    } catch (error: any) {
      console.error("Create notebook error:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to create notebook. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      (file) =>
        file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        file.type === "application/msword",
    )
    setFiles(droppedFiles)
    if (droppedFiles.length > 0) {
      await handleCreate(droppedFiles)
    }
  }

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files).filter(
        (file) =>
          file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
          file.type === "application/msword",
      )
      setFiles(selectedFiles)
      if (selectedFiles.length > 0) {
        await handleCreate(selectedFiles)
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <div className="flex items-center justify-between border-b pb-4">
          <div className="flex items-center gap-2">
            <img src="/placeholder.svg?height=24&width=24" alt="Engaged!" className="h-6 w-6" />
            <h2 className="text-lg font-semibold">Upload Documents</h2>
          </div>
        </div>

        <div
          className={`mt-4 rounded-lg border-2 border-dashed p-8 text-center ${
            dragActive ? "border-primary bg-muted/50" : "border-muted-foreground/25"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {isCreating ? (
            <div className="flex flex-col items-center justify-center">
              <Loader className="h-8 w-8 animate-spin text-primary" />
              <p className="mt-2 text-sm text-muted-foreground">Creating notebook...</p>
            </div>
          ) : (
            <>
              <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
                Drag & drop or{" "}
                <label htmlFor="file-upload" className="text-blue-500 hover:underline cursor-pointer">
                  choose files
                </label>{" "}
                to upload
              </p>
              <Input
                id="file-upload"
                type="file"
                className="hidden"
                onChange={handleFileInput}
                multiple
                accept=".doc,.docx"
                disabled={isCreating}
              />
            </>
          )}
        </div>

        {files.length > 0 && !isCreating && (
          <div className="mt-4">
            <h3 className="text-sm font-semibold mb-2">Selected Files:</h3>
            <ul className="space-y-2">
              {files.map((file, index) => (
                <li key={index} className="flex items-center justify-between bg-muted p-2 rounded-md">
                  <span className="text-sm truncate">{file.name}</span>
                </li>
              ))}
            </ul>
            <Button className="mt-4 w-full" onClick={() => handleCreate(files)} disabled={isCreating}>
              Create Notebook
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

