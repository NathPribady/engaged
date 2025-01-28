"use client"

import { useState } from "react"
import { Upload, AlertCircle, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/components/ui/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export function UploadForm() {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const { toast } = useToast()

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files?.length) return

    setUploading(true)
    setProgress(0)
    setError(null)
    setSuccess(null)

    const file = e.target.files[0]
    const formData = new FormData()
    formData.append("file", file)

    try {
      // Check file size before upload
      if (file.size > 10 * 1024 * 1024) {
        // 10MB limit
        throw new Error("File too large. Please upload a file smaller than 10MB.")
      }

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 10, 90))
      }, 500)

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      clearInterval(progressInterval)
      setProgress(100)

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "Upload failed")
      }

      const data = await res.json()

      setSuccess(`File uploaded successfully. Content split into ${data.totalChunks} chunks for processing.`)
      toast({
        title: "File uploaded successfully",
        description: `Content split into ${data.totalChunks} chunks for processing`,
      })

      // Reset form
      e.target.value = ""
    } catch (error: any) {
      setError(error.message || "An unexpected error occurred. Please try again.")
      toast({
        title: "Upload failed",
        description: error.message || "Please try again",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed p-8">
      <Upload className="h-8 w-8 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">Drag & drop files or click to upload (max 10MB)</p>
      <Input
        type="file"
        className="hidden"
        id="file-upload"
        onChange={handleUpload}
        accept=".txt,.pdf,.md"
        disabled={uploading}
      />
      <Button variant="secondary" onClick={() => document.getElementById("file-upload")?.click()} disabled={uploading}>
        {uploading ? "Uploading..." : "Choose File"}
      </Button>
      {uploading && (
        <div className="w-full max-w-xs">
          <Progress value={progress} className="h-2" />
          <p className="mt-2 text-center text-sm text-muted-foreground">Processing file... {progress}%</p>
        </div>
      )}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert variant="default" className="border-green-500 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <AlertTitle className="text-green-700">Success</AlertTitle>
          <AlertDescription className="text-green-600">{success}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}

