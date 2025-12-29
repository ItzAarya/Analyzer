// src/lib/excelParser.ts

import * as XLSX from 'xlsx';

export interface AttendanceRecord {
  employeeName: string;
  date: Date;
  inTime: string | null;
  outTime: string | null;
  isLeave: boolean;
}

export function parseExcelFile(buffer: Buffer): AttendanceRecord[] {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false });
  
  const records: AttendanceRecord[] = [];
  
  for (const row of jsonData as any[]) {
    const employeeName = row['Employee Name']?.trim();
    const dateStr = row['Date'];
    const inTime = row['In-Time']?.trim() || null;
    const outTime = row['Out-Time']?.trim() || null;
    
    if (!employeeName || !dateStr) continue;
    
    // Parse date
    let date: Date;
    if (typeof dateStr === 'string') {
      date = new Date(dateStr);
    } else if (typeof dateStr === 'number') {
      // Excel serial date
      const parsed = XLSX.SSF.parse_date_code(dateStr);
      date = new Date(parsed.y, parsed.m - 1, parsed.d);
    } else {
      continue;
    }
    
    // Check if date is valid
    if (isNaN(date.getTime())) continue;
    
    const isLeave = !inTime || !outTime;
    
    records.push({
      employeeName,
      date,
      inTime,
      outTime,
      isLeave
    });
  }
  
  return records;
}

export function calculateWorkedHours(inTime: string | null, outTime: string | null): number {
  if (!inTime || !outTime) return 0;
  
  const parseTime = (timeStr: string): Date => {
    // Handle different time formats
    const cleanTime = timeStr.trim();
    let hours = 0;
    let minutes = 0;
    
    // Try HH:MM format
    if (cleanTime.includes(':')) {
      const parts = cleanTime.split(':');
      hours = parseInt(parts[0]);
      minutes = parseInt(parts[1]);
    } else if (cleanTime.length === 4) {
      // Try HHMM format
      hours = parseInt(cleanTime.substring(0, 2));
      minutes = parseInt(cleanTime.substring(2, 4));
    } else if (cleanTime.length === 3) {
      // Try HMM format
      hours = parseInt(cleanTime.substring(0, 1));
      minutes = parseInt(cleanTime.substring(1, 3));
    }
    
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  };
  
  try {
    const inDate = parseTime(inTime);
    const outDate = parseTime(outTime);
    
    const diffMs = outDate.getTime() - inDate.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    
    return Math.max(0, diffHours);
  } catch (error) {
    console.error('Error calculating worked hours:', error);
    return 0;
  }
}

export function getDayType(date: Date): 'weekday' | 'saturday' | 'sunday' {
  const day = date.getDay();
  if (day === 0) return 'sunday';
  if (day === 6) return 'saturday';
  return 'weekday';
}

export function getExpectedHours(dayType: 'weekday' | 'saturday' | 'sunday'): number {
  switch (dayType) {
    case 'weekday': return 8.5;
    case 'saturday': return 4;
    case 'sunday': return 0;
  }
}