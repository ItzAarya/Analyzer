// src/app/api/upload/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseExcelFile, calculateWorkedHours, getDayType } from '@/lib/excelParser';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }
    
    // Validate file type
    if (!file.name.endsWith('.xlsx')) {
      return NextResponse.json(
        { error: 'Please upload an Excel (.xlsx) file' },
        { status: 400 }
      );
    }
    
    // Read file buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Parse Excel file
    const records = parseExcelFile(buffer);
    
    if (records.length === 0) {
      return NextResponse.json(
        { error: 'No valid records found in Excel file. Please check the format.' },
        { status: 400 }
      );
    }
    
    // Group records by employee
    const employeeMap = new Map<string, typeof records>();
    for (const record of records) {
      if (!employeeMap.has(record.employeeName)) {
        employeeMap.set(record.employeeName, []);
      }
      employeeMap.get(record.employeeName)!.push(record);
    }
    
    let totalRecordsCreated = 0;
    
    // Process each employee
    for (const [employeeName, empRecords] of employeeMap) {
      // Create or find employee
      const employee = await prisma.employee.upsert({
        where: { employeeId: employeeName.toLowerCase().replace(/\s+/g, '_') },
        update: { name: employeeName },
        create: {
          employeeId: employeeName.toLowerCase().replace(/\s+/g, '_'),
          name: employeeName
        }
      });
      
      // Delete existing attendance records for the same dates
      const dates = empRecords.map(r => r.date);
      await prisma.attendance.deleteMany({
        where: {
          employeeId: employee.id,
          date: { in: dates }
        }
      });
      
      // Create attendance records
      for (const record of empRecords) {
        const dayType = getDayType(record.date);
        const workedHours = calculateWorkedHours(record.inTime, record.outTime);
        
        await prisma.attendance.create({
          data: {
            employeeId: employee.id,
            date: record.date,
            inTime: record.inTime,
            outTime: record.outTime,
            workedHours,
            isLeave: record.isLeave,
            dayType
          }
        });
        
        totalRecordsCreated++;
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Successfully uploaded ${totalRecordsCreated} attendance records for ${employeeMap.size} employee(s)`,
      employeesProcessed: employeeMap.size,
      recordsCreated: totalRecordsCreated
    }, { status: 200 });
    
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process file. Please check your database connection.' },
      { status: 500 }
    );
  }
}

// Handle GET request (for testing)
export async function GET() {
  return NextResponse.json({
    message: 'Upload API is working. Use POST method to upload files.',
    endpoint: '/api/upload',
    method: 'POST',
    accepts: '.xlsx files'
  });
}