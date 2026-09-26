/**
 * Centralized Tenant Management Data & Calculation Helpers
 * UrbanNest Hostel Operations CRM
 */

export const BASE_OPERATION_DATE = new Date('2026-09-26T00:00:00')

/**
 * Dynamic calculation of stay duration and notice period urgency
 * Evaluates days remaining or overdue from expectedEndDate
 */
export function calculateStayDuration(endDateStr) {
  if (!endDateStr) {
    return {
      label: 'Flexible Stay',
      daysDiff: null,
      isEndingSoon: false,
      isOverdue: false,
      badgeClass: 'stay-neutral',
    }
  }

  const today = new Date(BASE_OPERATION_DATE)
  today.setHours(0, 0, 0, 0)

  const end = new Date(endDateStr)
  end.setHours(0, 0, 0, 0)

  const diffTime = end.getTime() - today.getTime()
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    const overdueCount = Math.abs(diffDays)
    return {
      label: `Overdue stay (${overdueCount}d past)`,
      daysDiff: diffDays,
      isEndingSoon: true,
      isOverdue: true,
      badgeClass: 'stay-overdue',
    }
  }

  if (diffDays === 0) {
    return {
      label: 'Stay ends today',
      daysDiff: 0,
      isEndingSoon: true,
      isOverdue: false,
      badgeClass: 'stay-today',
    }
  }

  if (diffDays <= 30) {
    return {
      label: `Ends in ${diffDays} day${diffDays === 1 ? '' : 's'}`,
      daysDiff: diffDays,
      isEndingSoon: true,
      isOverdue: false,
      badgeClass: 'stay-ending-soon',
    }
  }

  return {
    label: `${diffDays} days remaining`,
    daysDiff: diffDays,
    isEndingSoon: false,
    isOverdue: false,
    badgeClass: 'stay-normal',
  }
}

export const initialTenants = [
  {
    id: 'TEN-101',
    name: 'Rahul Kumar',
    phone: '+91 98765 43210',
    email: 'rahul.kumar@gmail.com',
    occupation: 'Software Engineer • Tech Mahindra',
    emergencyContact: '+91 98765 00001 (Father)',
    roomId: 'RM-204',
    roomNumber: 'Room 204',
    bedId: '204-A',
    bedCode: 'Bed A',
    roomType: 'Double Sharing',
    floor: 'Floor 2',
    moveInDate: '2026-07-01',
    expectedEndDate: '2026-10-05', // 9 days remaining!
    noticePeriod: '30 Days Notice Served',
    monthlyRent: 8500,
    securityDeposit: 8500,
    nextDueDate: '2026-09-24',
    outstandingAmount: 8500,
    paymentStatus: 'OVERDUE',
    status: 'NOTICE_PERIOD',
    notes: 'Relocating to Pune office. Deposit inspection scheduled for Oct 04.',
  },
  {
    id: 'TEN-102',
    name: 'Priya Reddy',
    phone: '+91 98123 45678',
    email: 'priya.reddy@outlook.com',
    occupation: 'Lead Designer • Deloitte Digital',
    emergencyContact: '+91 98123 00002 (Mother)',
    roomId: 'RM-302',
    roomNumber: 'Room 302',
    bedId: '302-A',
    bedCode: 'Bed A',
    roomType: 'Single Sharing',
    floor: 'Floor 3',
    moveInDate: '2026-09-28', // 2 days in future
    expectedEndDate: '2027-09-28',
    noticePeriod: '1 Month',
    monthlyRent: 14000,
    securityDeposit: 14000,
    nextDueDate: '2026-10-28',
    outstandingAmount: 0,
    paymentStatus: 'PAID',
    status: 'PENDING', // Moving in soon
    notes: 'Advance rent & deposit fully settled. Keycard programmed and ready.',
  },
  {
    id: 'TEN-103',
    name: 'Arjun Mehta',
    phone: '+91 97654 32109',
    email: 'arjun.mehta@tcs.com',
    occupation: 'Associate Consultant • TCS',
    emergencyContact: '+91 97654 00003 (Brother)',
    roomId: 'RM-101',
    roomNumber: 'Room 101',
    bedId: '101-A',
    bedCode: 'Bed A',
    roomType: 'Triple Sharing',
    floor: 'Floor 1',
    moveInDate: '2026-09-01',
    expectedEndDate: '2027-02-28',
    noticePeriod: '1 Month',
    monthlyRent: 6500,
    securityDeposit: 6500,
    nextDueDate: '2026-09-26',
    outstandingAmount: 7000,
    paymentStatus: 'DUE_SOON',
    status: 'ACTIVE',
    notes: 'Regular tenant. Opted for south-Indian meal package.',
  },
  {
    id: 'TEN-104',
    name: 'Kavita Nair',
    phone: '+91 99012 34567',
    email: 'kavita.nair@wipro.com',
    occupation: 'QA Analyst • Wipro',
    emergencyContact: '+91 99012 00004 (Father)',
    roomId: 'RM-202',
    roomNumber: 'Room 202',
    bedId: '202-A',
    bedCode: 'Bed A',
    roomType: 'Double Sharing',
    floor: 'Floor 2',
    moveInDate: '2026-09-20',
    expectedEndDate: '2027-03-20',
    noticePeriod: '1 Month',
    monthlyRent: 8500,
    securityDeposit: 8500,
    nextDueDate: '2026-10-20',
    outstandingAmount: 0,
    paymentStatus: 'PAID',
    status: 'ACTIVE',
    notes: 'Biometric fingerprint enrolled. Two-wheeler parking slot #14 assigned.',
  },
  {
    id: 'TEN-105',
    name: 'Manish Sharma',
    phone: '+91 98711 22334',
    email: 'manish.sharma@gmail.com',
    occupation: 'Graduate Student • JNTU Hyderabad',
    emergencyContact: '+91 98711 00005 (Guardian)',
    roomId: 'RM-305',
    roomNumber: 'Room 305',
    bedId: '305-A',
    bedCode: 'Bed A',
    roomType: 'Double Sharing',
    floor: 'Floor 3',
    moveInDate: '2026-07-15',
    expectedEndDate: '2026-12-15',
    noticePeriod: '1 Month',
    monthlyRent: 8500,
    securityDeposit: 8500,
    nextDueDate: '2026-09-22',
    outstandingAmount: 5500,
    paymentStatus: 'OVERDUE',
    status: 'ACTIVE',
    notes: 'Semester exams in progress. Promised fee clearance by weekend.',
  },
  {
    id: 'TEN-106',
    name: 'Sneha Kapoor',
    phone: '+91 98223 34455',
    email: 'sneha.kapoor@accenture.com',
    occupation: 'Cloud Developer • Accenture',
    emergencyContact: '+91 98223 00006 (Spouse)',
    roomId: 'RM-205',
    roomNumber: 'Room 205',
    bedId: '205-A',
    bedCode: 'Bed A',
    roomType: 'Double Sharing',
    floor: 'Floor 2',
    moveInDate: '2026-04-01',
    expectedEndDate: '2027-04-01',
    noticePeriod: '1 Month',
    monthlyRent: 8500,
    securityDeposit: 8500,
    nextDueDate: '2026-10-05',
    outstandingAmount: 0,
    paymentStatus: 'PAID',
    status: 'ACTIVE',
    notes: 'Long-term resident. High reliability score.',
  },
  {
    id: 'TEN-107',
    name: 'Rohan Deshmukh',
    phone: '+91 97112 23344',
    email: 'rohan.deshmukh@gmail.com',
    occupation: 'Civil Engineer • L&T Construction',
    emergencyContact: '+91 97112 00007 (Father)',
    roomId: 'RM-104',
    roomNumber: 'Room 104',
    bedId: '104-A',
    bedCode: 'Bed A',
    roomType: 'Triple Sharing',
    floor: 'Floor 1',
    moveInDate: '2026-06-01',
    expectedEndDate: '2026-10-20', // 24 days remaining!
    noticePeriod: '30 Days Notice Served',
    monthlyRent: 6500,
    securityDeposit: 6500,
    nextDueDate: '2026-10-01',
    outstandingAmount: 0,
    paymentStatus: 'PAID',
    status: 'NOTICE_PERIOD',
    notes: 'Project site completion near Miyapur. Move-out inspection pending.',
  },
  {
    id: 'TEN-108',
    name: 'Aditya Varma',
    phone: '+91 99887 76655',
    email: 'aditya.varma@infosys.com',
    occupation: 'Systems Engineer • Infosys',
    emergencyContact: '+91 99887 00008 (Father)',
    roomId: 'RM-201',
    roomNumber: 'Room 201',
    bedId: '201-A',
    bedCode: 'Bed A',
    roomType: 'Double Sharing',
    floor: 'Floor 2',
    moveInDate: '2026-05-10',
    expectedEndDate: '2027-05-10',
    noticePeriod: '1 Month',
    monthlyRent: 8500,
    securityDeposit: 8500,
    nextDueDate: '2026-09-27',
    outstandingAmount: 1850,
    paymentStatus: 'DUE_SOON',
    status: 'ACTIVE',
    notes: 'Power backup and high-speed LAN patch cord provided.',
  },
  {
    id: 'TEN-109',
    name: 'Anil Teja',
    phone: '+91 98445 56677',
    email: 'anil.teja@gmail.com',
    occupation: 'Data Analyst • Cognizant',
    emergencyContact: '+91 98445 00009 (Friend)',
    roomId: 'RM-303',
    roomNumber: 'Room 303',
    bedId: '303-A',
    bedCode: 'Bed A',
    roomType: 'Double Sharing',
    floor: 'Floor 3',
    moveInDate: '2026-06-15',
    expectedEndDate: '2026-10-10', // 14 days remaining!
    noticePeriod: '30 Days Notice Served',
    monthlyRent: 8500,
    securityDeposit: 8500,
    nextDueDate: '2026-09-18',
    outstandingAmount: 8500,
    paymentStatus: 'OVERDUE',
    status: 'NOTICE_PERIOD',
    notes: 'Vacating for higher studies abroad. Pending rent reminder issued.',
  },
  {
    id: 'TEN-110',
    name: 'Suresh Babu',
    phone: '+91 97001 12233',
    email: 'suresh.babu@gmail.com',
    occupation: 'Accounts Executive • Dr. Reddy Labs',
    emergencyContact: '+91 97001 00010 (Brother)',
    roomId: 'RM-102',
    roomNumber: 'Room 102',
    bedId: '102-B',
    bedCode: 'Bed B',
    roomType: 'Double Sharing',
    floor: 'Floor 1',
    moveInDate: '2026-08-15',
    expectedEndDate: '2026-10-15', // 19 days remaining!
    noticePeriod: '30 Days Notice Served',
    monthlyRent: 8500,
    securityDeposit: 8500,
    nextDueDate: '2026-10-01',
    outstandingAmount: 0,
    paymentStatus: 'PAID',
    status: 'NOTICE_PERIOD',
    notes: 'Contract ending mid-October. Room inspection slated for Oct 14.',
  },
  {
    id: 'TEN-111',
    name: 'Harshita Sen',
    phone: '+91 99345 67890',
    email: 'harshita.sen@amazon.com',
    occupation: 'Operations Lead • Amazon',
    emergencyContact: '+91 99345 00011 (Father)',
    roomId: 'RM-304',
    roomNumber: 'Room 304',
    bedId: '304-A',
    bedCode: 'Bed A',
    roomType: 'Single Sharing',
    floor: 'Floor 3',
    moveInDate: '2026-03-01',
    expectedEndDate: '2026-10-31', // 35 days remaining
    noticePeriod: '1 Month',
    monthlyRent: 14000,
    securityDeposit: 14000,
    nextDueDate: '2026-09-29',
    outstandingAmount: 1200,
    paymentStatus: 'DUE_SOON',
    status: 'ACTIVE',
    notes: 'Maintenance ticket fee pending. Single occupancy room on top floor.',
  },
  {
    id: 'TEN-112',
    name: 'Gaurav Jain',
    phone: '+91 98667 78899',
    email: 'gaurav.jain@gmail.com',
    occupation: 'Chartered Accountant Intern',
    emergencyContact: '+91 98667 00012 (Father)',
    roomId: 'RM-206',
    roomNumber: 'Room 206',
    bedId: '206-A',
    bedCode: 'Bed A',
    roomType: 'Triple Sharing',
    floor: 'Floor 2',
    moveInDate: '2026-08-01',
    expectedEndDate: '2027-01-31',
    noticePeriod: '1 Month',
    monthlyRent: 6500,
    securityDeposit: 6500,
    nextDueDate: '2026-10-01',
    outstandingAmount: 0,
    paymentStatus: 'PAID',
    status: 'ACTIVE',
    notes: 'Paid via PhonePe QR code. No past due violations.',
  },
  {
    id: 'TEN-113',
    name: 'Ananya Verma',
    phone: '+91 97234 56780',
    email: 'ananya.verma@example.com',
    occupation: 'Talent Acquisition • Google GDC',
    emergencyContact: '+91 97234 00013 (Mother)',
    roomId: 'RM-102',
    roomNumber: 'Room 102',
    bedId: '102-A',
    bedCode: 'Bed A',
    roomType: 'Double Sharing',
    floor: 'Floor 1',
    moveInDate: '2026-10-02', // 6 days in future
    expectedEndDate: '2027-04-02',
    noticePeriod: '1 Month',
    monthlyRent: 8500,
    securityDeposit: 8500,
    nextDueDate: '2026-10-02',
    outstandingAmount: 0,
    paymentStatus: 'PAID',
    status: 'PENDING', // Moving in soon
    notes: 'Confirmed booking from public site enquiry. Advance token paid.',
  },
  {
    id: 'TEN-100',
    name: 'Vikram Joshi',
    phone: '+91 98112 34455',
    email: 'vikram.joshi@accenture.com',
    occupation: 'Technology Associate • Accenture',
    emergencyContact: '+91 98112 00000 (Father)',
    roomId: 'RM-204',
    roomNumber: 'Room 204',
    bedId: '204-B',
    bedCode: 'Bed B',
    roomType: 'Double Sharing',
    floor: 'Floor 2',
    moveInDate: '2026-02-01',
    expectedEndDate: '2026-08-31',
    noticePeriod: 'Completed',
    monthlyRent: 8500,
    securityDeposit: 8500,
    nextDueDate: null,
    outstandingAmount: 0,
    paymentStatus: 'PAID',
    status: 'MOVED_OUT',
    notes: 'Completed 7-month stay. Security deposit refunded in full after room clearance.',
  },
]

export function getTenantStats(tenantsList = initialTenants) {
  let activeTenants = 0
  let movingInSoon = 0
  let endingSoon = 0
  let movedOut = 0

  tenantsList.forEach((t) => {
    if (t.status === 'MOVED_OUT') {
      movedOut += 1
      return
    }

    if (t.status === 'PENDING') {
      movingInSoon += 1
    } else if (t.status === 'ACTIVE' || t.status === 'NOTICE_PERIOD') {
      activeTenants += 1
    }

    // Check if ending within 30 days
    const stay = calculateStayDuration(t.expectedEndDate)
    if (stay.isEndingSoon && t.status !== 'MOVED_OUT') {
      endingSoon += 1
    }
  })

  return {
    totalTenants: tenantsList.filter((t) => t.status !== 'MOVED_OUT').length,
    activeTenants,
    movingInSoon,
    endingSoon,
    movedOut,
  }
}
