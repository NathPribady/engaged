import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"

interface SyllabusCreationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: SyllabusOptions) => void
  isLoading: boolean
}

export interface SyllabusOptions {
  activities: string[]
  customActivity: string
  pedagogies: string[]
  customPedagogy: string
}

export function SyllabusCreationModal({ open, onOpenChange, onSubmit, isLoading }: SyllabusCreationModalProps) {
  const [activities, setActivities] = useState<string[]>([])
  const [customActivity, setCustomActivity] = useState("")
  const [pedagogies, setPedagogies] = useState<string[]>([])
  const [customPedagogy, setCustomPedagogy] = useState("")
  const [progress, setProgress] = useState(0)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      activities,
      customActivity,
      pedagogies,
      customPedagogy,
    })
  }

  const totalSteps = 6 // Total number of syllabus sections
  const stepProgress = 100 / totalSteps

  // Simulating progress updates (you'll need to implement actual progress tracking in your backend)
  const updateProgress = () => {
    if (isLoading && progress < 100) {
      setProgress((prevProgress) => Math.min(prevProgress + stepProgress, 100))
      setTimeout(updateProgress, 2000) // Update every 2 seconds (adjust as needed)
    }
  }

  // Start progress updates when loading begins
  if (isLoading && progress === 0) {
    updateProgress()
  }

  // Reset progress when modal is closed
  if (!open && progress !== 0) {
    setProgress(0)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Syllabus</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <Label>What do you want to do?</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="assignments"
                  checked={activities.includes("assignments")}
                  onCheckedChange={(checked) =>
                    setActivities(
                      checked ? [...activities, "assignments"] : activities.filter((a) => a !== "assignments"),
                    )
                  }
                />
                <label htmlFor="assignments">Weekly Assignments</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="exams"
                  checked={activities.includes("exams")}
                  onCheckedChange={(checked) =>
                    setActivities(checked ? [...activities, "exams"] : activities.filter((a) => a !== "exams"))
                  }
                />
                <label htmlFor="exams">Exams</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="project"
                  checked={activities.includes("project")}
                  onCheckedChange={(checked) =>
                    setActivities(checked ? [...activities, "project"] : activities.filter((a) => a !== "project"))
                  }
                />
                <label htmlFor="project">Projects</label>
              </div>
              <Input
                placeholder="Custom activity"
                value={customActivity}
                onChange={(e) => setCustomActivity(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-4">
            <Label>How do you want to design your pedagogy?</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="engaged"
                  checked={pedagogies.includes("engaged")}
                  onCheckedChange={(checked) =>
                    setPedagogies(checked ? [...pedagogies, "engaged"] : pedagogies.filter((p) => p !== "engaged"))
                  }
                />
                <label htmlFor="engaged">Engaged pedagogy</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="critical"
                  checked={pedagogies.includes("critical")}
                  onCheckedChange={(checked) =>
                    setPedagogies(checked ? [...pedagogies, "critical"] : pedagogies.filter((p) => p !== "critical"))
                  }
                />
                <label htmlFor="critical">Critical pedagogy</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="constructivism"
                  checked={pedagogies.includes("constructivism")}
                  onCheckedChange={(checked) =>
                    setPedagogies(
                      checked ? [...pedagogies, "constructivism"] : pedagogies.filter((p) => p !== "constructivism"),
                    )
                  }
                />
                <label htmlFor="constructivism">Constructivism</label>
              </div>
              <Input
                placeholder="Custom pedagogy"
                value={customPedagogy}
                onChange={(e) => setCustomPedagogy(e.target.value)}
              />
            </div>
          </div>
          {isLoading ? (
            <div className="space-y-2">
              <Progress value={progress} className="w-full" />
              <p className="text-sm text-center">Generating syllabus... {Math.round(progress)}% complete</p>
            </div>
          ) : (
            <Button type="submit" disabled={isLoading}>
              Generate Syllabus
            </Button>
          )}
        </form>
      </DialogContent>
    </Dialog>
  )
}

