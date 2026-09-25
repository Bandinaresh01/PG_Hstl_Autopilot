// Configurable Demo Data for UrbanNest Hostel Owner Dashboard
// This structure is designed to be cleanly replaced by GET /api/owner/dashboard

export const ownerProfile = {
  name: 'Rajesh Kumar',
  role: 'Hostel Owner',
  email: 'rajesh.owner@urbannest.in',
  avatar: 'RK',
  hostelName: 'UrbanNest Hostel',
  city: 'Madhapur, Hyderabad',
}

export const primaryStats = {
  totalBeds: 60,
  occupiedBeds: 48,
  availableBeds: 12,
  currentTenants: 48,
  occupancyRate: 80, // 48 / 60
}

export const businessKPIs = {
  newEnquiries: 12,
  upcomingBookings: 5,
  rentCollected: 382500,
  pendingRent: 72500,
  overdueRent: 24000,
  expectedRent: 455000,
}

export const monthlyRentOverview = {
  expected: 455000,
  collected: 382500,
  pending: 72500,
  overdue: 24000,
  collectionRate: 84, // 382500 / 455000
}

export const rentCollectionTrend = [
  { month: 'Apr', expected: 420000, collected: 395000 },
  { month: 'May', expected: 430000, collected: 410000 },
  { month: 'Jun', expected: 440000, collected: 405000 },
  { month: 'Jul', expected: 440000, collected: 425000 },
  { month: 'Aug', expected: 450000, collected: 430000 },
  { month: 'Sep', expected: 455000, collected: 382500 },
]

export const occupancyBreakdown = {
  occupied: 48,
  available: 8,
  reserved: 2,
  maintenance: 2,
  total: 60,
  occupiedPct: 80,
  availablePct: 13.3,
  reservedPct: 3.3,
  maintenancePct: 3.3,
}

export const recentEnquiries = [
  {
    id: 'ENQ-101',
    name: 'Rahul Kumar',
    phone: '+91 98765 41011',
    room: 'Double Sharing',
    moveIn: 'Oct 10',
    status: 'Interested',
  },
  {
    id: 'ENQ-102',
    name: 'Priya Reddy',
    phone: '+91 98765 41012',
    room: 'Single Sharing',
    moveIn: 'Oct 12',
    status: 'New',
  },
  {
    id: 'ENQ-103',
    name: 'Arjun Patel',
    phone: '+91 98765 41013',
    room: 'Triple Sharing',
    moveIn: 'Oct 15',
    status: 'Visit Scheduled',
  },
  {
    id: 'ENQ-104',
    name: 'Sneha Rao',
    phone: '+91 98765 41014',
    room: 'Single Sharing',
    moveIn: 'Oct 08',
    status: 'Contacted',
  },
  {
    id: 'ENQ-105',
    name: 'Vikram Singh',
    phone: '+91 98765 41015',
    room: 'Double Sharing',
    moveIn: 'Oct 18',
    status: 'New',
  },
]

export const upcomingMoveIns = [
  {
    id: 'BKG-201',
    name: 'Rahul Kumar',
    roomType: 'Double Sharing (Room 204)',
    moveInDate: 'Oct 10, 2026',
    status: 'Confirmed',
    depositPaid: true,
  },
  {
    id: 'BKG-202',
    name: 'Sneha Rao',
    roomType: 'Single Sharing (Room 301)',
    moveInDate: 'Oct 08, 2026',
    status: 'Deposit Paid',
    depositPaid: true,
  },
  {
    id: 'BKG-203',
    name: 'Amit Gupta',
    roomType: 'Triple Sharing (Room 105)',
    moveInDate: 'Oct 14, 2026',
    status: 'Confirmed',
    depositPaid: true,
  },
  {
    id: 'BKG-204',
    name: 'Divya Nair',
    roomType: 'Double Sharing (Room 206)',
    moveInDate: 'Oct 18, 2026',
    status: 'Pending Verification',
    depositPaid: false,
  },
]

export const rentDueList = [
  {
    id: 'RNT-301',
    tenant: 'Rahul Sharma',
    room: 'Room 204',
    amount: 8500,
    dueDate: 'Sep 05',
    status: 'Overdue',
    daysOverdue: 20,
  },
  {
    id: 'RNT-302',
    tenant: 'Karthik M',
    room: 'Room 102',
    amount: 7000,
    dueDate: 'Sep 10',
    status: 'Overdue',
    daysOverdue: 15,
  },
  {
    id: 'RNT-303',
    tenant: 'Sandeep V',
    room: 'Room 210',
    amount: 8500,
    dueDate: 'Sep 15',
    status: 'Overdue',
    daysOverdue: 10,
  },
  {
    id: 'RNT-304',
    tenant: 'Priya Reddy',
    room: 'Room 302',
    amount: 12000,
    dueDate: 'Sep 28',
    status: 'Due Soon',
    daysOverdue: 0,
  },
  {
    id: 'RNT-305',
    tenant: 'Vignesh K',
    room: 'Room 208',
    amount: 8500,
    dueDate: 'Sep 29',
    status: 'Due Soon',
    daysOverdue: 0,
  },
]

export const upcomingStayEndDates = [
  {
    id: 'STY-401',
    tenant: 'Sai Kumar',
    room: 'Room 204',
    bed: 'Bed B',
    endDate: 'Oct 05',
    daysRemaining: 10,
    isUrgent: true,
  },
  {
    id: 'STY-402',
    tenant: 'Mahesh Babu',
    room: 'Room 108',
    bed: 'Bed C',
    endDate: 'Oct 08',
    daysRemaining: 13,
    isUrgent: true,
  },
  {
    id: 'STY-403',
    tenant: 'Anusha S',
    room: 'Room 305',
    bed: 'Bed A',
    endDate: 'Oct 12',
    daysRemaining: 17,
    isUrgent: false,
  },
  {
    id: 'STY-404',
    tenant: 'Rohan Mehra',
    room: 'Room 202',
    bed: 'Bed A',
    endDate: 'Oct 20',
    daysRemaining: 25,
    isUrgent: false,
  },
]

export const openComplaints = [
  {
    id: 'CMP-501',
    tenant: 'Room 204 (Vikas)',
    issue: 'WiFi signal dropping frequently in corner bed',
    category: 'Internet',
    status: 'Open',
    opened: '2 hrs ago',
    priority: 'High',
  },
  {
    id: 'CMP-502',
    tenant: 'Room 108 (Aditya)',
    issue: 'Attached washroom tap leaking continuously',
    category: 'Plumbing',
    status: 'In Progress',
    opened: 'Yesterday',
    priority: 'Medium',
  },
  {
    id: 'CMP-503',
    tenant: 'Room 302 (Priya)',
    issue: 'Geyser water heating takes longer than usual',
    category: 'Electrical',
    status: 'Open',
    opened: '5 hrs ago',
    priority: 'Medium',
  },
]

export const maintenanceAttention = [
  {
    id: 'MNT-601',
    issue: 'Room 305 AC Compressor Repair',
    location: '3rd Floor — Room 305',
    priority: 'High',
    status: 'Technician Assigned',
  },
  {
    id: 'MNT-602',
    issue: '2nd Floor Water Purifier Filter Service',
    location: '2nd Floor Corridor',
    priority: 'Medium',
    status: 'Due in 2 days',
  },
  {
    id: 'MNT-603',
    issue: 'Room 101 Balcony Light Replacement',
    location: '1st Floor — Room 101',
    priority: 'Low',
    status: 'Parts Ordered',
  },
]

export const todaysVisitors = [
  {
    id: 'VIS-701',
    name: 'Ramesh Verma',
    visitingTenant: 'Rahul Sharma (Room 204)',
    entryTime: '10:30 AM',
    status: 'Inside',
    purpose: 'Family',
  },
  {
    id: 'VIS-702',
    name: 'Suresh Rao',
    visitingTenant: 'Arjun Patel (Room 102)',
    entryTime: '09:15 AM',
    status: 'Exited',
    purpose: 'Friend',
  },
  {
    id: 'VIS-703',
    name: 'Deepak Joshi',
    visitingTenant: 'Aditya (Room 108)',
    entryTime: '11:45 AM',
    status: 'Inside',
    purpose: 'College Peer',
  },
]

export const monthlyExpenses = {
  items: [
    { category: 'Food & Kitchen Supplies', amount: 82000, pct: 63.2 },
    { category: 'Electricity Bill', amount: 18500, pct: 14.3 },
    { category: 'Facility Maintenance & Repairs', amount: 12500, pct: 9.6 },
    { category: 'Other Operational & Supplies', amount: 7500, pct: 5.8 },
    { category: 'Municipal Water Supply', amount: 5200, pct: 4.0 },
    { category: 'Commercial High-Speed Internet', amount: 4000, pct: 3.1 },
  ],
  total: 129700,
}

export const incomeVsExpenses = {
  rentCollected: 382500,
  otherIncome: 15000, // Laundry, security token, misc
  totalIncome: 397500,
  totalExpenses: 129700,
  netOperatingIncome: 267800,
  profitMarginPct: 67.4, // 267800 / 397500
}

export const recentActivity = [
  {
    id: 'ACT-01',
    text: 'New enquiry received from Rahul Kumar for Double Sharing',
    time: '15 min ago',
    type: 'lead',
  },
  {
    id: 'ACT-02',
    text: 'Payment of ₹8,500 recorded from Priya Reddy (Room 302)',
    time: '45 min ago',
    type: 'payment',
  },
  {
    id: 'ACT-03',
    text: 'Room 204 Bed B assigned to Sai Kumar',
    time: '2 hours ago',
    type: 'tenant',
  },
  {
    id: 'ACT-04',
    text: 'WiFi complaint opened by Room 204',
    time: '3 hours ago',
    type: 'complaint',
  },
  {
    id: 'ACT-05',
    text: 'Booking confirmed for Oct 10 move-in',
    time: '5 hours ago',
    type: 'booking',
  },
  {
    id: 'ACT-06',
    text: 'Visitor Ramesh Verma checked in at Front Desk',
    time: '6 hours ago',
    type: 'visitor',
  },
]

export const importantAlerts = [
  {
    id: 'ALT-1',
    severity: 'danger',
    title: '3 Overdue Rent Payments',
    description: 'Total ₹24,000 pending past due date (Rahul Sharma, Karthik M, Sandeep V)',
    actionText: 'View Overdue',
    actionLink: '#rent-due',
  },
  {
    id: 'ALT-2',
    severity: 'warning',
    title: '2 Stay Agreements Expiring Soon',
    description: 'Sai Kumar (10 days) and Mahesh Babu (13 days) ending this month',
    actionText: 'Review Stays',
    actionLink: '#stay-ends',
  },
  {
    id: 'ALT-3',
    severity: 'info',
    title: '1 Facility Maintenance in Progress',
    description: 'Room 305 AC compressor servicing technician assigned',
    actionText: 'Check Status',
    actionLink: '#maintenance',
  },
  {
    id: 'ALT-4',
    severity: 'success',
    title: '5 New Enquiries Pending Follow-Up',
    description: 'Prospective student and executive tenants looking for move-ins',
    actionText: 'Open Leads',
    actionLink: '#enquiries',
  },
]
