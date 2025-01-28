"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { FileText, Plus, BookOpen, ArrowLeft, Loader } from "lucide-react"
import { getNotebookSummary, generateSyllabus, getSyllabi, getGeneratedFeatures, getSyllabus } from "@/app/actions"
import { SummaryChat } from "@/components/summary-chat"
import { AddSourcesModal } from "@/components/add-sources-modal"
import { SyllabusCreationModal, type SyllabusOptions } from "@/components/syllabus-creation-modal"
import { useToast } from "@/components/ui/use-toast"
import ReactMarkdown from "react-markdown"

interface Source {
  id: string
  file_name: string
  summary: string
}

interface Syllabus {
  id: string
  content: string
  activities: { id: string; name: string; description: string | null }[]
  pedagogical_approaches: { id: string; name: string; description: string | null }[]
}

interface NotebookSummary {
  id: string
  title: string
  overallSummary: string
  sources: Source[]
  syllabus?: Syllabus
}

interface GeneratedFeature {
  id: string
  name: string
  description: string
  type: string
  reference_id: string | null
  created_at: string
  syllabi?: {
    id: string
    content: string
    created_at: string
  } | null
}

export default function NotebookSummaryPage({ params }: { params: { id: string } }) {
  const [summary, setSummary] = useState<NotebookSummary | null>(null)
  const [selectedSources, setSelectedSources] = useState<string[]>([])
  const [isAddSourcesOpen, setIsAddSourcesOpen] = useState(false)
  const [isSyllabusModalOpen, setIsSyllabusModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSyllabusLoading, setIsSyllabusLoading] = useState(false)
  const [generatedFeatures, setGeneratedFeatures] = useState<GeneratedFeature[]>([])
  const [activeView, setActiveView] = useState<"overview" | "syllabus">("overview")
  const { toast } = useToast()

  const fetchSummary = async () => {
    setIsLoading(true)
    try {
      const summaryResult = await getNotebookSummary(params.id)
      const syllabiResult = await getSyllabi(params.id)

      if (summaryResult.success) {
        setSummary(summaryResult.summary)
        setSelectedSources(summaryResult.summary.sources.map((s: Source) => s.id))
      } else {
        console.error("Failed to fetch notebook summary:", summaryResult.error)
        toast({
          title: "Error",
          description: "Failed to fetch notebook summary. Please try again.",
          variant: "destructive",
        })
      }

      if (syllabiResult.success && syllabiResult.syllabi) {
        if (syllabiResult.syllabi.length > 0) {
          setSummary((prev) => (prev ? { ...prev, syllabus: syllabiResult.syllabi[0] } : null))
        }
      }

      await fetchGeneratedFeatures()
    } catch (error) {
      console.error("Error fetching summary and syllabi:", error)
      toast({
        title: "Error",
        description: "An error occurred while fetching data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const fetchGeneratedFeatures = async () => {
    const result = await getGeneratedFeatures(params.id)
    if (result.success) {
      setGeneratedFeatures(result.features)
    }
  }

  useEffect(() => {
    fetchSummary()
  }, [params.id])

  const toggleSource = (sourceId: string) => {
    setSelectedSources((prev) => (prev.includes(sourceId) ? prev.filter((id) => id !== sourceId) : [...prev, sourceId]))
  }

  const toggleAllSources = () => {
    if (summary) {
      setSelectedSources((prev) =>
        prev.length === summary.sources.length ? [] : summary.sources.map((s: Source) => s.id),
      )
    }
  }

  const handleFileProcessed = () => {
    fetchSummary()
    setIsAddSourcesOpen(false)
  }

  const handleSyllabusCreation = async (options: SyllabusOptions) => {
    if (!summary) return

    setIsSyllabusLoading(true)
    try {
      const result = await generateSyllabus(params.id, options)
      if (result.success && result.syllabus) {
        await fetchSummary()
        setActiveView("syllabus")
        toast({
          title: "Syllabus Generated",
          description: "Your syllabus has been created successfully.",
        })
      } else {
        throw new Error(result.error || "Failed to generate syllabus")
      }
    } catch (error: any) {
      console.error("Error generating syllabus:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to generate syllabus. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSyllabusLoading(false)
      setIsSyllabusModalOpen(false)
    }
  }

  const handleFeatureClick = async (feature: GeneratedFeature) => {
    if (feature.type === "syllabus" && feature.reference_id) {
      try {
        const result = await getSyllabus(feature.reference_id)
        if (result.success && result.syllabus) {
          setSummary((prev) => (prev ? { ...prev, syllabus: result.syllabus } : null))
          setActiveView("syllabus")
        }
      } catch (error) {
        console.error("Error fetching syllabus:", error)
        toast({
          title: "Error",
          description: "Failed to load the syllabus. Please try again.",
          variant: "destructive",
        })
      }
    }
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sources Sidebar */}
      <div className="w-[300px] border-r border-border bg-card overflow-hidden flex flex-col">
        <div className="p-4 flex-shrink-0">
          <h2 className="text-lg font-semibold mb-4">Sources</h2>
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
            {isLoading
              ? Array(3)
                  .fill(0)
                  .map((_, index) => (
                    <div key={index} className="flex items-center gap-2 p-2">
                      <div className="h-4 w-4 rounded-sm bg-muted" />
                      <div className="h-4 w-full rounded bg-muted" />
                    </div>
                  ))
              : summary?.sources.map((source: Source) => (
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
        <div className="p-8">
          {!isLoading && summary && (
            <>
              <h1 className="text-3xl font-bold mb-6">{summary.title || "Untitled Notebook"}</h1>
              {activeView === "overview" ? (
                <>
                  <Card className="p-6 mb-8">
                    <h2 className="text-xl font-semibold mb-4">Overview</h2>
                    <p className="text-muted-foreground">
                      {summary.overallSummary || "No summary available. Try adding some sources."}
                    </p>
                  </Card>
                </>
              ) : summary.syllabus ? (
                <>
                  <Button variant="outline" className="mb-4" onClick={() => setActiveView("overview")}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Overview
                  </Button>
                  <Card className="p-6 mb-8">
                    <h2 className="text-xl font-semibold mb-4">Syllabus</h2>
                    <ScrollArea className="h-[60vh]">
                      <ReactMarkdown className="prose dark:prose-invert">{summary.syllabus.content}</ReactMarkdown>
                    </ScrollArea>

                  </Card>
                </>
              ) : null}
            </>
          )}
        </div>
        <div className="flex-grow overflow-hidden">
          <SummaryChat notebookId={params.id} />
        </div>
      </div>

      {/* Features Panel */}
      <div className="w-[300px] border-l border-border bg-card">
        <div className="p-4 space-y-6">
          <h2 className="text-lg font-semibold">Features</h2>
          <div className="space-y-4">
            <div>
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => setIsSyllabusModalOpen(true)}
                disabled={isSyllabusLoading}
              >
                <BookOpen className="h-4 w-4" />
                {isSyllabusLoading ? "Generating..." : "Syllabus Creation"}
              </Button>
              <p className="text-xs text-muted-foreground mt-1">
                Based on constructivism + your own pedagogical framework
              </p>
            </div>
          </div>
        </div>
        <div className="p-4 border-t border-border">
          <h2 className="text-2xl font-bold mb-6">Generated Features</h2>
          <div className="space-y-4">
            {generatedFeatures.map((feature) => (
              <Card
                key={feature.id}
                className="p-4 cursor-pointer transition-colors hover:bg-accent"
                onClick={() => handleFeatureClick(feature)}
              >
                <h3 className="text-lg font-semibold mb-1">{feature.name}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{new Date(feature.created_at).toLocaleString()}</span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
      <AddSourcesModal
        open={isAddSourcesOpen}
        onOpenChange={setIsAddSourcesOpen}
        onFileProcessed={handleFileProcessed}
        notebookId={params.id}
      />
      <SyllabusCreationModal
        open={isSyllabusModalOpen}
        onOpenChange={setIsSyllabusModalOpen}
        onSubmit={handleSyllabusCreation}
        isLoading={isSyllabusLoading}
      />
    </div>
  )
}

