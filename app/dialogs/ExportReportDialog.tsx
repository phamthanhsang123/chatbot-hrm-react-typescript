"use client"

import * as React from "react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/app/components/ui/dialog"

type ExportReportDialogProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function ExportReportDialog({
    open,
    onOpenChange,
}: ExportReportDialogProps) {
    const reports = [
        { title: "Báo cáo nhân sự", desc: "Tổng quan nhân sự", icon: "👥" },
        { title: "Báo cáo lương", desc: "Chi tiết lương thưởng", icon: "💰" },
        { title: "Báo cáo nghỉ phép", desc: "Thống kê nghỉ phép", icon: "📅" },
        { title: "Báo cáo hiệu suất", desc: "Đánh giá KPI", icon: "📊" },
    ]

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Xuất báo cáo</DialogTitle>
                </DialogHeader>

                <div className="space-y-3">
                    {reports.map((item, index) => (
                        <button
                            key={index}
                            className="w-full p-4 border rounded-lg text-left hover:bg-gray-50"
                            onClick={() => {
                                alert(`Đang xuất ${item.title}`)
                                onOpenChange(false)
                            }}
                        >
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">{item.icon}</span>
                                <div>
                                    <p className="font-semibold">{item.title}</p>
                                    <p className="text-sm text-gray-600">{item.desc}</p>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    )
}
