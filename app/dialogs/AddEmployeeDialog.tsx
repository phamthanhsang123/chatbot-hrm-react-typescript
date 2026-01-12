"use client"

import * as React from "react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/app/components/ui/dialog"
import { Button } from "@/app/components/ui/button"
import { Input } from "@/app/components/ui/input"
import { Label } from "@/app/components/ui/label"

type AddEmployeeDialogProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function AddEmployeeDialog({
    open,
    onOpenChange,
}: AddEmployeeDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Thêm nhân viên</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Tên nhân viên</Label>
                        <Input id="name" placeholder="Nguyễn Văn A" />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" placeholder="email@company.com" />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="role">Chức vụ</Label>
                        <select className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option>Tất cả phòng ban</option>
                            <option>IT</option>
                            <option>HR</option>
                            <option>Marketing</option>
                            <option>Sales</option>
                        </select>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Hủy
                    </Button>
                    <Button variant="outline">Thêm</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
