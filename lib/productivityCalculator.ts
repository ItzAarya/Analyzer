// src/lib/productivityCalculator.ts

import { getDayType, getExpectedHours } from './excelParser';

export interface MonthlyAnalysis {
  employeeId: string;
  employeeName: string;
  month: number;
  year: number;
  totalExpectedHours: number;
  totalActualHours: number;
  leavesUsed: number;
  productivity: number;
  dailyBreakdown: DailyRecord[];
}

export interface DailyRecord {
  date: Date;
  dayType: string;
  inTime: string | null;
  outTime: string | null;
  expectedHours: number;
  actualHours: number;
  isLeave: boolean;
}

export function calculateMonthlyProductivity(
  attendanceRecords: any[],
  month: number,
  year: number
): MonthlyAnalysis | null {
  
  if (attendanceRecords.length === 0) return null;
  
  const dailyBreakdown: DailyRecord[] = [];
  let totalExpectedHours = 0;
  let totalActualHours = 0;
  let leavesUsed = 0;
  
  // Get all days in the month
  const daysInMonth = new Date(year, month, 0).getDate();
  const recordMap = new Map(
    attendanceRecords.map(r => [r.date.toISOString().split('T')[0], r])
  );
  
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    const dateKey = date.toISOString().split('T')[0];
    const dayType = getDayType(date);
    const expectedHours = getExpectedHours(dayType);
    
    const record = recordMap.get(dateKey);
    
    if (dayType === 'sunday') {
      // Sunday - no work expected
      dailyBreakdown.push({
        date,
        dayType,
        inTime: null,
        outTime: null,
        expectedHours: 0,
        actualHours: 0,
        isLeave: false
      });
      continue;
    }
    
    if (!record || record.isLeave) {
      // Missing attendance = leave
      leavesUsed++;
      dailyBreakdown.push({
        date,
        dayType,
        inTime: null,
        outTime: null,
        expectedHours,
        actualHours: 0,
        isLeave: true
      });
      totalExpectedHours += expectedHours;
      continue;
    }
    
    // Normal working day
    totalExpectedHours += expectedHours;
    totalActualHours += record.workedHours;
    
    dailyBreakdown.push({
      date,
      dayType,
      inTime: record.inTime,
      outTime: record.outTime,
      expectedHours,
      actualHours: record.workedHours,
      isLeave: false
    });
  }
  
  const productivity = totalExpectedHours > 0 
    ? (totalActualHours / totalExpectedHours) * 100 
    : 0;
  
  return {
    employeeId: attendanceRecords[0]?.employee?.employeeId || '',
    employeeName: attendanceRecords[0]?.employee?.name || '',
    month,
    year,
    totalExpectedHours,
    totalActualHours,
    leavesUsed,
    productivity: Math.round(productivity * 100) / 100,
    dailyBreakdown
  };
}