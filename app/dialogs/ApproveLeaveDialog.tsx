"use client"

import * as React from "react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/app/components/ui/dialog"
import { Button } from "@/app/components/ui/button"

type ApproveLeaveDialogProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function ApproveLeaveDialog({
    open,
    onOpenChange,
}: ApproveLeaveDialogProps) {
    const requests = [
        { name: "Nguyễn Văn A", date: "10/01 - 12/01", reason: "Du lịch" },
        { name: "Trần Thị B", date: "15/01 - 16/01", reason: "Việc cá nhân" },
        { name: "Lê Văn C", date: "20/01 - 22/01", reason: "Nghỉ ngơi" },
    ]

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Duyệt đơn nghỉ phép</DialogTitle>
                </DialogHeader>

                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {requests.map((item, index) => (
                        <div
                            key={index}
                            className="p-4 border rounded-lg flex justify-between items-start"
                        >
                            <div>
                                <p className="font-semibold">{item.name}</p>
                                <p className="text-sm text-gray-600">{item.date}</p>
                                <p className="text-sm text-gray-500">{item.reason}</p>
                            </div>

                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    className="bg-green-500 hover:bg-green-700 text-white"
                                    onClick={() => alert(`Đã duyệt ${item.name}`)}
                                >
                                    Duyệt
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-red-600"
                                    onClick={() => alert(`Đã từ chối ${item.name}`)}
                                >
                                    Từ chối
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    )
}
