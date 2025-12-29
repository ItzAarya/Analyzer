'use client';

import { useState } from 'react';
import { Upload, TrendingUp, Clock, Calendar, AlertCircle, FileSpreadsheet, Sparkles, BarChart3 } from 'lucide-react';
import * as XLSX from 'xlsx';

interface AttendanceRecord {
  employeeName: string;
  date: string;
  inTime: string | null;
  outTime: string | null;
  workedHours: number;
  isLeave: boolean;
  dayOfWeek: number;
  expectedHours: number;
}

export default function Home() {
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [loading, setLoading] = useState(false);

  const WORKING_HOURS = { weekday: 8.5, saturday: 4, sunday: 0 };
  const LEAVES_PER_MONTH = 2;

  const getExpectedHours = (dayOfWeek: number): number => {
    if (dayOfWeek === 0) return WORKING_HOURS.sunday;
    if (dayOfWeek === 6) return WORKING_HOURS.saturday;
    return WORKING_HOURS.weekday;
  };

  const parseTime = (timeStr: string): Date => {
    const today = new Date();
    const [hours, minutes] = timeStr.toString().split(':');
    today.setHours(parseInt(hours), parseInt(minutes || '0'), 0, 0);
    return today;
  };

  const calculateWorkedHours = (inTime: string, outTime: string): number => {
    if (!inTime || !outTime) return 0;
    try {
      const inDate = parseTime(inTime);
      const outDate = parseTime(outTime);
      const hours = (outDate.getTime() - inDate.getTime()) / (1000 * 60 * 60);
      return Math.max(0, hours);
    } catch {
      return 0;
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData: any[] = XLSX.utils.sheet_to_json(sheet);

        const processed: AttendanceRecord[] = jsonData.map((row: any) => {
          const date = new Date(row.Date || row.date);
          const inTime = row['In-Time'] || row['in-time'] || row.InTime || null;
          const outTime = row['Out-Time'] || row['out-time'] || row.OutTime || null;
          const employeeName = row['Employee Name'] || row.EmployeeName || row.name;

          const dayOfWeek = date.getDay();
          const expectedHours = getExpectedHours(dayOfWeek);
          const isLeave = !inTime || !outTime;
          const workedHours = isLeave ? 0 : calculateWorkedHours(inTime, outTime);

          return {
            employeeName,
            date: date.toISOString().split('T')[0],
            inTime,
            outTime,
            workedHours,
            isLeave,
            dayOfWeek,
            expectedHours
          };
        });

        setAttendanceData(processed);
        
        if (processed.length > 0) {
          setSelectedEmployee(processed[0].employeeName);
          const firstDate = new Date(processed[0].date);
          setSelectedMonth(`${firstDate.getFullYear()}-${String(firstDate.getMonth() + 1).padStart(2, '0')}`);
        }
      } catch (error) {
        alert('Error parsing Excel file. Please check the format.');
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    
    reader.readAsArrayBuffer(file);
  };

  const filteredData = attendanceData.filter(
    r => r.employeeName === selectedEmployee && r.date.startsWith(selectedMonth)
  ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const stats = filteredData.reduce((acc, record) => {
    acc.totalExpected += record.expectedHours;
    acc.totalActual += record.workedHours;
    if (record.isLeave && record.expectedHours > 0) acc.leavesUsed++;
    return acc;
  }, { totalExpected: 0, totalActual: 0, leavesUsed: 0 });

  const productivity = stats.totalExpected > 0 
    ? (stats.totalActual / stats.totalExpected) * 100 
    : 0;

  const uniqueEmployees = [...new Set(attendanceData.map(r => r.employeeName))];
  const uniqueMonths = [...new Set(attendanceData.map(r => r.date.substring(0, 7)))].sort();

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 md:p-8 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-yellow-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-20 left-1/2 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header with glassmorphism */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-6 mb-6 border border-white/20">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
                  <BarChart3 className="text-white" size={28} />
                </div>
                <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2">
                  Leave & Productivity Analyzer
                  <Sparkles className="text-yellow-400 animate-pulse" size={24} />
                </h1>
              </div>
              <p className="text-sm md:text-base text-purple-200 ml-14">Track attendance with style</p>
            </div>
          </div>
          
          {/* Ultra Fancy Upload Section */}
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-pink-600 via-purple-600 to-blue-600 rounded-2xl blur-lg opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-tilt"></div>
            <div className="relative border-2 border-dashed border-purple-300/50 rounded-2xl p-6 md:p-8 text-center bg-gradient-to-br from-purple-900/50 to-pink-900/50 backdrop-blur-sm hover:border-purple-400/80 transition-all duration-300">
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
                disabled={loading}
              />
              <label htmlFor="file-upload" className="cursor-pointer block">
                <div className="relative mb-4 inline-block">
                  <div className="absolute inset-0 bg-gradient-to-r from-pink-500 to-purple-500 rounded-2xl blur-md opacity-75 group-hover:opacity-100 transition-opacity"></div>
                  <div className="relative p-4 bg-gradient-to-br from-purple-500 via-pink-500 to-purple-600 rounded-2xl shadow-2xl transform group-hover:scale-110 transition-transform duration-300">
                    <Upload className={`text-white ${loading ? 'animate-spin' : 'animate-bounce'}`} size={40} />
                  </div>
                </div>
                <p className="text-base md:text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-300 via-purple-300 to-blue-300 mb-2">
                  {loading ? 'Processing your data...' : 'Upload Excel Attendance File'}
                </p>
                <p className="text-xs md:text-sm text-purple-200 font-medium">
                  Drag & drop or click to browse (.xlsx, .xls)
                </p>
                <div className="mt-4 flex justify-center gap-2">
                  <span className="inline-block w-2 h-2 bg-pink-400 rounded-full animate-pulse"></span>
                  <span className="inline-block w-2 h-2 bg-purple-400 rounded-full animate-pulse delay-75"></span>
                  <span className="inline-block w-2 h-2 bg-blue-400 rounded-full animate-pulse delay-150"></span>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Fancy Filters with glassmorphism */}
        {attendanceData.length > 0 && !loading && (
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-6 mb-6 border border-white/20">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="relative group">
                <label className="block text-sm font-bold text-purple-200 mb-3 flex items-center gap-2">
                  <span className="inline-block w-2 h-2 bg-purple-400 rounded-full animate-pulse"></span>
                  Select Employee
                </label>
                <div className="relative">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl blur opacity-30 group-hover:opacity-60 transition duration-300"></div>
                  <select
                    value={selectedEmployee}
                    onChange={(e) => setSelectedEmployee(e.target.value)}
                    className="relative w-full px-4 py-3 border-2 border-purple-400/40 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-400 transition-all duration-300 bg-gradient-to-br from-purple-900/60 to-pink-900/40 backdrop-blur-sm text-black font-semibold shadow-lg hover:shadow-purple-500/50 cursor-pointer appearance-none"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='white'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 0.75rem center',
                      backgroundSize: '1.5em 1.5em',
                      paddingRight: '2.5rem'
                    }}
                  >
                    {uniqueEmployees.map(emp => (
                      <option key={emp} value={emp} className="bg-slate-900 text-white py-2">{emp}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="relative group">
                <label className="block text-sm font-bold text-purple-200 mb-3 flex items-center gap-2">
                  <span className="inline-block w-2 h-2 bg-blue-400 rounded-full animate-pulse delay-75"></span>
                  Select Month
                </label>
                <div className="relative">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl blur opacity-30 group-hover:opacity-60 transition duration-300"></div>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="relative w-full px-4 py-3 border-2 border-blue-400/40 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-400 transition-all duration-300 bg-gradient-to-br from-blue-900/60 to-cyan-900/40 backdrop-blur-sm text-black font-semibold shadow-lg hover:shadow-blue-500/50 cursor-pointer appearance-none"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='white'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 0.75rem center',
                      backgroundSize: '1.5em 1.5em',
                      paddingRight: '2.5rem'
                    }}
                  >
                    {uniqueMonths.map(month => (
                      <option key={month} value={month} className="bg-slate-900 text-white py-2">
                        {new Date(month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Fancy Stats Cards */}
        {filteredData.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              {/* Expected Hours Card */}
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl blur opacity-60 group-hover:opacity-100 transition duration-300"></div>
                <div className="relative bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl shadow-2xl p-4 md:p-6 transform transition hover:scale-105">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs md:text-sm font-bold text-white/90">Expected Hours</h3>
                    <Clock className="text-white" size={20} />
                  </div>
                  <p className="text-2xl md:text-3xl font-black text-white">{stats.totalExpected.toFixed(1)}</p>
                  <p className="text-xs text-white/80 mt-1">Total working hours</p>
                </div>
              </div>

              {/* Actual Hours Card */}
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl blur opacity-60 group-hover:opacity-100 transition duration-300"></div>
                <div className="relative bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl shadow-2xl p-4 md:p-6 transform transition hover:scale-105">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs md:text-sm font-bold text-white/90">Actual Hours</h3>
                    <TrendingUp className="text-white" size={20} />
                  </div>
                  <p className="text-2xl md:text-3xl font-black text-white">{stats.totalActual.toFixed(1)}</p>
                  <p className="text-xs text-white/80 mt-1">Hours worked</p>
                </div>
              </div>

              {/* Leaves Card */}
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-600 to-red-600 rounded-2xl blur opacity-60 group-hover:opacity-100 transition duration-300"></div>
                <div className="relative bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl shadow-2xl p-4 md:p-6 transform transition hover:scale-105">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs md:text-sm font-bold text-white/90">Leaves Used</h3>
                    <Calendar className="text-white" size={20} />
                  </div>
                  <p className="text-2xl md:text-3xl font-black text-white">
                    {stats.leavesUsed} <span className="text-lg text-white/70">/ {LEAVES_PER_MONTH}</span>
                  </p>
                  <p className="text-xs text-white/80 mt-1">{LEAVES_PER_MONTH - stats.leavesUsed} remaining</p>
                </div>
              </div>

              {/* Productivity Card */}
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl blur opacity-60 group-hover:opacity-100 transition duration-300"></div>
                <div className="relative bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl shadow-2xl p-4 md:p-6 transform transition hover:scale-105">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs md:text-sm font-bold text-white/90">Productivity</h3>
                    <AlertCircle className="text-white" size={20} />
                  </div>
                  <p className="text-2xl md:text-3xl font-black text-white">{productivity.toFixed(1)}%</p>
                  <div className="w-full bg-white/30 rounded-full h-2 mt-2 overflow-hidden">
                    <div
                      className="bg-white h-2 rounded-full transition-all duration-1000 shadow-lg"
                      style={{ width: `${Math.min(100, productivity)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Fancy Table */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-4 md:p-6 border border-white/20">
              <h2 className="text-lg md:text-xl font-bold text-white mb-4 flex items-center gap-2">
                <FileSpreadsheet className="text-purple-400" size={20} />
                Daily Attendance Breakdown
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-purple-400/30">
                      <th className="text-left py-3 px-2 md:px-4 font-bold text-purple-200 text-xs md:text-sm">Date</th>
                      <th className="text-left py-3 px-2 md:px-4 font-bold text-purple-200 text-xs md:text-sm">Day</th>
                      <th className="text-left py-3 px-2 md:px-4 font-bold text-purple-200 text-xs md:text-sm">In</th>
                      <th className="text-left py-3 px-2 md:px-4 font-bold text-purple-200 text-xs md:text-sm">Out</th>
                      <th className="text-left py-3 px-2 md:px-4 font-bold text-purple-200 text-xs md:text-sm">Exp</th>
                      <th className="text-left py-3 px-2 md:px-4 font-bold text-purple-200 text-xs md:text-sm">Work</th>
                      <th className="text-left py-3 px-2 md:px-4 font-bold text-purple-200 text-xs md:text-sm">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.map((record, idx) => (
                      <tr key={idx} className="border-b border-purple-400/20 hover:bg-white/5 transition-colors">
                        <td className="py-3 px-2 md:px-4 font-semibold text-white text-xs md:text-sm">
                          {new Date(record.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </td>
                        <td className="py-3 px-2 md:px-4 text-purple-200 text-xs md:text-sm">{dayNames[record.dayOfWeek].substring(0, 3)}</td>
                        <td className="py-3 px-2 md:px-4 text-white text-xs md:text-sm">{record.inTime || '-'}</td>
                        <td className="py-3 px-2 md:px-4 text-white text-xs md:text-sm">{record.outTime || '-'}</td>
                        <td className="py-3 px-2 md:px-4 font-semibold text-cyan-300 text-xs md:text-sm">{record.expectedHours}h</td>
                        <td className="py-3 px-2 md:px-4 font-semibold text-green-300 text-xs md:text-sm">{record.workedHours.toFixed(1)}h</td>
                        <td className="py-3 px-2 md:px-4">
                          <span className={`px-2 py-1 rounded-lg text-xs font-bold ${
                            record.isLeave 
                              ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white' 
                              : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
                          }`}>
                            {record.isLeave ? 'No' : 'Yes'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Fancy Empty State */}
        {attendanceData.length === 0 && !loading && (
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 md:p-12 text-center border border-white/20">
            <div className="mb-4 inline-block p-6 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl animate-pulse">
              <FileSpreadsheet className="text-white" size={48} />
            </div>
            <h3 className="text-xl md:text-2xl font-bold text-white mb-2">No Data Yet</h3>
            <p className="text-sm md:text-base text-purple-200">Upload an Excel file to start analyzing</p>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        @keyframes tilt {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(1deg); }
          75% { transform: rotate(-1deg); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        .animate-tilt {
          animation: tilt 10s infinite linear;
        }
        .delay-75 {
          animation-delay: 75ms;
        }
        .delay-150 {
          animation-delay: 150ms;
        }
      `}</style>
    </main>
  );
}