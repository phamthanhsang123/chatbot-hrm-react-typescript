export default function Dashboard() {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Dashboard</h2>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded shadow">👨‍💼 Nhân viên: 50</div>
        <div className="bg-white p-4 rounded shadow">💰 Quỹ lương</div>
        <div className="bg-white p-4 rounded shadow">📝 Nghỉ phép</div>
        <div className="bg-white p-4 rounded shadow">⏰ Chấm công</div>
      </div>
    </div>
  );
}
