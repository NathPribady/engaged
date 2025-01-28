"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { NotebookCard } from "@/components/notebook-card"
import { CreateNotebookModal } from "@/components/create-notebook-modal"
import { getNotebooks, createNotebook } from "@/app/actions"
import { QueryClient, QueryClientProvider, useInfiniteQuery } from "@tanstack/react-query"

const queryClient = new QueryClient()

function DashboardContent() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const pageSize = 12

  const { data, fetchNextPage, hasNextPage, isLoading, isFetchingNextPage, error } = useInfiniteQuery({
    queryKey: ["notebooks"],
    queryFn: ({ pageParam = 1 }) => getNotebooks(pageParam, pageSize),
    getNextPageParam: (lastPage, allPages) => {
      const loadedCount = allPages.length * pageSize
      return loadedCount < lastPage.totalCount ? allPages.length + 1 : undefined
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  const handleCreateNotebook = async (files: File[]) => {
    const optimisticNotebook = {
      id: Date.now(), // Temporary ID
      title: "Processing...",
      created_at: new Date().toISOString(),
      sources: files.length,
    }

    queryClient.setQueryData(["notebooks"], (old: any) => ({
      pages: [{ notebooks: [optimisticNotebook, ...old.pages[0].notebooks] }, ...old.pages.slice(1)],
      pageParams: old.pageParams,
    }))

    const result = await createNotebook(files)

    if (result.success) {
      queryClient.invalidateQueries(["notebooks"])
    } else {
      console.error("Failed to create notebook:", result.error)
      queryClient.setQueryData(["notebooks"], (old: any) => ({
        pages: [
          { notebooks: old.pages[0].notebooks.filter((n: any) => n.id !== optimisticNotebook.id) },
          ...old.pages.slice(1),
        ],
        pageParams: old.pageParams,
      }))
    }
    return result
  }

  if (isLoading) return <div>Loading notebooks...</div>
  if (error) return <div>Error fetching notebooks: {error.message}</div>

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-teal-400 bg-clip-text text-transparent">
          Welcome to Engaged!
        </h1>
      </div>

      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">My Notebooks</h2>
          <Button variant="secondary" className="gap-2" onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="h-4 w-4" />
            Create new notebook
          </Button>
        </div>

        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {data?.pages
            .flatMap((page) => page.notebooks)
            .map((notebook) => (
              <NotebookCard
                key={notebook.id}
                notebook={{
                  id: notebook.id,
                  title: notebook.title,
                  date: new Date(notebook.created_at).toLocaleDateString(),
                  sources: notebook.sources,
                  color: "bg-zinc-800",
                  icon: "Notebook",
                }}
              />
            ))}
        </div>

        {hasNextPage && (
          <div className="mt-8 text-center">
            <Button onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
              {isFetchingNextPage ? "Loading more..." : "Load More"}
            </Button>
          </div>
        )}
      </div>

      <CreateNotebookModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onCreateNotebook={handleCreateNotebook}
      />
    </div>
  )
}

export default function Dashboard() {
  return (
    <QueryClientProvider client={queryClient}>
      <DashboardContent />
    </QueryClientProvider>
  )
}

