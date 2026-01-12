"use client"

import { Button } from "@/app/components/ui/button"

type PaginationProps = {
    currentPage: number
    totalPages: number
    onPageChange: (page: number) => void
}

export function Pagination({
    currentPage,
    totalPages,
    onPageChange,
}: PaginationProps) {
    if (totalPages <= 1) return null

    return (
        <div className="flex gap-2">
            <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => onPageChange(currentPage - 1)}
            >
                Trước
            </Button>

            {Array.from({ length: totalPages }).map((_, index) => {
                const page = index + 1
                const isActive = page === currentPage

                return (
                    <Button
                        key={page}
                        size="sm"
                        variant={isActive ? "default" : "outline"}
                        className={
                            isActive
                                ? "bg-blue-600 text-white hover:bg-blue-700"
                                : ""
                        }
                        onClick={() => onPageChange(page)}
                    >
                        {page}
                    </Button>
                )
            })}

            <Button
                variant="outline"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => onPageChange(currentPage + 1)}
            >
                Sau
            </Button>
        </div>
    )
}
