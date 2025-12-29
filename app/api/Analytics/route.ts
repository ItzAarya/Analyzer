// src/app/api/analytics/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateMonthlyProductivity } from '@/lib/productivityCalculator';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const employeeId = searchParams.get('employeeId');
    const month = parseInt(searchParams.get('month') || new Date().getMonth().toString()) + 1;
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
    
    if (!employeeId) {
      // Get all employees
      const employees = await prisma.employee.findMany({
        select: {
          id: true,
          name: true,
          employeeId: true
        },
        orderBy: {
          name: 'asc'
        }
      });
      
      return NextResponse.json({ 
        employees,
        message: employees.length === 0 ? 'No employees found. Please upload attendance data.' : undefined
      });
    }
    
    // Get employee
    const employee = await prisma.employee.findUnique({
      where: { employeeId }
    });
    
    if (!employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }
    
    // Get attendance records for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);
    
    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        employeeId: employee.id,
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        employee: true
      },
      orderBy: {
        date: 'asc'
      }
    });
    
    // Calculate monthly productivity
    const analysis = calculateMonthlyProductivity(attendanceRecords, month, year);
    
    if (!analysis) {
      return NextResponse.json({
        error: 'No attendance data found for the selected period',
        message: 'Please upload attendance records for this employee and month.'
      }, { status: 404 });
    }
    
    return NextResponse.json(analysis);
    
  } catch (error: any) {
    console.error('Analytics error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch analytics. Please check your database connection.' },
      { status: 500 }
    );
  }
}