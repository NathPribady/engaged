"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { FileText, Plus, Maximize2, BookOpen, HelpCircle, Clock, Mic } from "lucide-react"
import { getNotebookSummary } from "@/app/actions"
import { SummaryChat } from "@/components/summary-chat"
import { AddSourcesModal } from "@/components/add-sources-modal"

interface Source {
  id: string
  file_name: string
  summary: string
}

interface NotebookSummary {
  id: string
  title: string
  overallSummary: string
  sources: Source[]
}

export default function NotebookPage({ params }: { params: { id: string } }) {
  const [summary, setSummary] = useState<NotebookSummary | null>(null)
  const [selectedSources, setSelectedSources] = useState<string[]>([])
  const [isAddSourcesOpen, setIsAddSourcesOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetchSummary()
  }, [params.id])

  const fetchSummary = async () => {
    setIsLoading(true)
    try {
      const result = await getNotebookSummary(params.id)
      if (result.success) {
        setSummary(result.summary)
        setSelectedSources(result.summary.sources.map((s: Source) => s.id))
      } else {
        console.error("Failed to fetch notebook summary:", result.error)
      }
    } catch (error) {
      console.error("Error fetching summary:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const toggleSource = (sourceId: string) => {
    setSelectedSources((prev) => (prev.includes(sourceId) ? prev.filter((id) => id !== sourceId) : [...prev, sourceId]))
  }

  const toggleAllSources = () => {
    if (summary) {
      setSelectedSources((prev) => (prev.length === summary.sources.length ? [] : summary.sources.map((s) => s.id)))
    }
  }

  const handleFileProcessed = () => {
    fetchSummary()
    setIsAddSourcesOpen(false)
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-pulse text-lg">Loading notebook...</div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sources Panel */}
      <div className="w-[300px] border-r border-border bg-card overflow-hidden flex flex-col">
        <div className="p-4 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Sources</h2>
            <Button variant="ghost" size="icon">
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
          <Button
            className="w-full justify-start gap-2 mb-4"
            variant="secondary"
            onClick={() => setIsAddSourcesOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Add source
          </Button>
          <div className="flex items-center gap-2 mb-2">
            <Checkbox
              checked={summary?.sources && selectedSources.length === summary.sources.length}
              onCheckedChange={toggleAllSources}
            />
            <span className="text-sm text-muted-foreground">Select all sources</span>
          </div>
        </div>
        <ScrollArea className="flex-grow">
          <div className="space-y-2 p-4">
            {summary?.sources.map((source) => (
              <div key={source.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent">
                <Checkbox
                  checked={selectedSources.includes(source.id)}
                  onCheckedChange={() => toggleSource(source.id)}
                />
                <div className="flex items-center gap-2 flex-1">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm truncate">{source.file_name}</span>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="p-8 flex-shrink-0">
          <h1 className="text-3xl font-bold mb-6">{summary?.title || "Untitled Notebook"}</h1>
          <Card className="p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Overview</h2>
            <p className="text-muted-foreground">
              {summary?.overallSummary || "No summary available. Try adding some sources."}
            </p>
          </Card>
        </div>
        <div className="flex-grow overflow-hidden">
          <SummaryChat notebookId={params.id} />
        </div>
      </div>

      {/* Studio Panel */}
      <div className="w-[300px] border-l border-border bg-card overflow-hidden flex flex-col">
        <div className="p-4 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Studio</h2>
            <Button variant="ghost" size="icon">
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <ScrollArea className="flex-grow">
          <div className="space-y-2 p-4">
            <Button variant="outline" className="w-full justify-start gap-2">
              <Mic className="h-4 w-4" />
              Audio Overview
            </Button>
            <Button variant="outline" className="w-full justify-start gap-2">
              <BookOpen className="h-4 w-4" />
              Study guide
            </Button>
            <Button variant="outline" className="w-full justify-start gap-2">
              <HelpCircle className="h-4 w-4" />
              FAQ
            </Button>
            <Button variant="outline" className="w-full justify-start gap-2">
              <Clock className="h-4 w-4" />
              Timeline
            </Button>
          </div>
        </ScrollArea>
      </div>

      <AddSourcesModal
        open={isAddSourcesOpen}
        onOpenChange={setIsAddSourcesOpen}
        onFileProcessed={handleFileProcessed}
        notebookId={params.id}
      />
    </div>
  )
}

