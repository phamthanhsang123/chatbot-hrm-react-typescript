"use client";

import { useEffect, useState } from "react";
import { API_BASE } from "@/services/apiBase";
import { fetchEmployees, type EmployeeApiItem } from "@/services/employees";

export default function ApiSmokeTest() {
  const [employees, setEmployees] = useState<EmployeeApiItem[]>([]);
  const [message, setMessage] = useState("Đang kiểm tra Railway API...");

  useEffect(() => {
    fetchEmployees()
      .then((data) => {
        setEmployees(data);
        setMessage(`Kết nối thành công ${API_BASE}`);
      })
      .catch((error) => {
        setMessage(error instanceof Error ? error.message : "Không kết nối được Railway API.");
      });
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="mx-auto max-w-3xl rounded-lg bg-white p-6 shadow">
        <h1 className="mb-2 text-2xl font-bold">HRM API Smoke Test</h1>
        <p className="mb-4 text-sm text-gray-600">{message}</p>

        <div className="space-y-2">
          {employees.slice(0, 10).map((employee) => (
            <div key={employee.id} className="rounded border p-3">
              <p className="font-semibold">{employee.fullName}</p>
              <p className="text-sm text-gray-500">
                {employee.email} - {employee.departmentName || "Chưa có phòng ban"}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
