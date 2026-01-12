"use client"

import * as React from "react"
import { Button } from "@/app/components/ui/button"
import { AddEmployeeDialog } from "@/app/dialogs/AddEmployeeDialog"

export default function EmployeesPage() {
  const [open, setOpen] = React.useState(false)

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold">Nhân viên</h1>
        <Button onClick={() => setOpen(true)}>Thêm nhân viên</Button>
      </div>

      <AddEmployeeDialog open={open} onOpenChange={setOpen} />
    </div>
  )
}
