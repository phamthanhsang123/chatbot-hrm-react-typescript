"use client"

import * as React from "react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/app/components/ui/dialog"
import { Button } from "@/app/components/ui/button"
import { Input } from "@/app/components/ui/input"
import { Label } from "@/app/components/ui/label"

type CalculateSalaryDialogProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function CalculateSalaryDialog({
    open,
    onOpenChange,
}: CalculateSalaryDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Tính lương</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label>Tháng</Label>
                        <Input type="month" defaultValue="2026-01" />
                    </div>

                    <div className="p-4 bg-blue-50 rounded-lg border">
                        <p className="text-sm font-semibold mb-2">
                            Thông tin dự kiến:
                        </p>
                        <ul className="text-sm space-y-1">
                            <li>• Tổng nhân viên: 125</li>
                            <li>• Tổng lương cơ bản: 1.85 tỷ</li>
                            <li>• Thưởng dự kiến: 320M</li>
                        </ul>
                    </div>
                </div>

                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Hủy
                    </Button>
                    <Button
                        className="bg-orange-600 hover:bg-orange-700"
                        onClick={() => {
                            alert("Đang tính lương...")
                            onOpenChange(false)
                        }}
                    >
                        Tính lương
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
