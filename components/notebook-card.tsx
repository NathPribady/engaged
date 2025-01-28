import { File, Book, MoreVertical } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import Link from "next/link"

interface NotebookCardProps {
  notebook: {
    id: number
    title: string
    date: string
    sources: number
    color: string
    icon: "File" | "Notebook"
  }
}

export function NotebookCard({ notebook }: NotebookCardProps) {
  const Icon = notebook.icon === "File" ? File : Book

  return (
    <Link href={`/notebook/${notebook.id}/summary`} className="block">
      <div className={`${notebook.color} rounded-2xl p-6 group relative transition-transform hover:scale-105`}>
        <div className="flex justify-between items-start">
          <Icon className="h-6 w-6 text-white/80" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white/80 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.preventDefault()} // Prevent navigation when clicking the dropdown
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={(e) => e.preventDefault()}>Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="mt-4">
          <h3 className="text-lg font-semibold text-white mb-2">{notebook.title}</h3>
          <p className="text-sm text-white/60">
            {notebook.date}
            {notebook.icon === "Notebook" && ` · ${notebook.sources} source${notebook.sources !== 1 ? "s" : ""}`}
          </p>
        </div>
      </div>
    </Link>
  )
}

