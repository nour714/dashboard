/**
 * AfricaTravel — English Localization Dictionary
 */

export const en = {
  // Brand & Metadata
  brand: {
    name: 'AfricaTravel',
    tagline: 'Travel Operations',
    platform: 'Travel Operations Platform',
    terminal: 'Internal Travel Agency Operations Terminal'
  },

  // Boot Splash Screen
  bootSplash: {
    systemPreparing: 'Preparing the System...',
    systemWait: 'Please wait a moment',
    systemTagline: 'TRAVEL & TOURISM MANAGEMENT SYSTEM',
    checkingSession: 'Checking Session',
    checkingSessionSub: 'جاري التحقق من الجلسة',
    checkingSessionProgress: 'Checking session…',
    loadingUserData: 'Loading User Data',
    loadingUserDataSub: 'جاري تحميل بيانات المستخدم',
    loadingData: 'Loading System Data',
    loadingDataSub: 'جاري تحميل بيانات النظام',
    loadingDataProgress: 'Loading system data…',
    preparingDashboard: 'Preparing Dashboard',
    preparingDashboardSub: 'جاري تجهيز لوحة التحكم',
    preparingDashboardProgress: 'Preparing dashboard…',
    secureConnection: 'Secure & Encrypted',
    secureConnectionSub: 'نظام آمن ومشفّر'
  },

  // Navigation
  nav: {
    dashboard: 'Dashboard',
    tickets: 'Tickets',
    dueTickets: 'Tickets with Balance',
    customers: 'Customers',
    payments: 'Payments',
    refunds: 'Refunds',
    reports: 'Reports',
    expenses: 'Office Expenses',
    visas: 'Visas',
    hotels: 'Hotels (AI)',
    administration: 'Administration',
    employees: 'Employees',
    activity: 'Activity Log',
    settings: 'Settings',
    more: 'More',
    newTicket: 'New Ticket'
  },

  // Common UI Actions & Labels
  common: {
    search: 'Search',
    searchPlaceholder: 'Search tickets, PNRs, or customers...',
    filter: 'Filter',
    filterBy: 'Filter by',
    all: 'All',
    viewAll: 'View All',
    create: 'Create',
    edit: 'Edit',
    delete: 'Delete',
    save: 'Save',
    saveChanges: 'Save Changes',
    cancel: 'Cancel',
    yes: 'Yes',
    no: 'No',
    close: 'Close',
    closeSearch: 'Close search',
    back: 'Back',
    next: 'Next',
    previous: 'Previous',
    prev: 'Prev',
    fromDate: 'From Date',
    toDate: 'To Date',
    pageOf: 'Page {page} of {totalPages} ({total} records)',
    agent: 'Agent',
    actions: 'Actions',
    status: 'Status',
    date: 'Date',
    time: 'Time',
    amount: 'Amount',
    total: 'Total',
    subtotal: 'Subtotal',
    paid: 'Paid',
    remaining: 'Remaining',
    balance: 'Balance',
    fee: 'Fee',
    fees: 'Fees',
    notes: 'Notes',
    reason: 'Reason',
    reference: 'Reference',
    type: 'Type',
    method: 'Method',
    user: 'User',
    loading: 'Loading...',
    noData: 'No records found',
    showing: 'Showing',
    of: 'of',
    results: 'results',
    minutesAgo: 'min ago',
    hoursAgo: 'hrs ago',
    daysAgo: 'days ago',
    currency: 'EGP',
    currencyFull: 'EGP',
    required: 'Required',
    optional: 'Optional',
    confirm: 'Confirm',
    apply: 'Apply',
    reset: 'Reset',
    export: 'Export',
    print: 'Print',
    details: 'Details',
    overview: 'Overview',
    history: 'History',
    system: 'System',
    language: 'Language',
    english: 'English',
    arabic: 'العربية',
    switchLanguage: 'Switch Language',
    profile: 'Profile',
    signOut: 'Sign Out',
    collapseSidebar: 'Collapse sidebar',
    expandSidebar: 'Expand sidebar',
    active: 'Active',
    inactive: 'Inactive',
    enabled: 'Enabled',
    disabled: 'Disabled',
    notAvailable: 'Currently Unavailable',
    error: 'Something went wrong. Please try again.',
    exportSuccess: 'Exported successfully',
    noDataToExport: 'No data to export',
    noRecords: 'No records found',
    price: 'Price'
  },

  // User Roles
  roles: {
    admin: 'Administrator',
    agent: 'Ticketing Agent',
    ADMIN: 'Administrator',
    AGENT: 'Ticketing Agent',
    TICKET_ONLY: 'Ticket Creation Only',
    ticketOnly: 'Ticket Creation Only',
    operationsDirector: 'Senior Operations Director',
    'Senior Operations Director': 'Senior Operations Director'
  },

  // Status Labels
  status: {
    CONFIRMED: 'CONFIRMED',
    PAID: 'PAID',
    'PAID IN FULL': 'PAID IN FULL',
    'PARTIALLY PAID': 'PARTIALLY PAID',
    PARTIALLY_PAID: 'PARTIALLY PAID',
    UNPAID: 'UNPAID',
    BOOKED: 'BOOKED',
    ISSUED: 'ISSUED',
    MODIFIED: 'MODIFIED',
    'REFUND REQUESTED': 'REFUND REQUESTED',
    REFUND_REQUESTED: 'REFUND REQUESTED',
    'PARTIALLY REFUNDED': 'PARTIALLY REFUNDED',
    PARTIALLY_REFUNDED: 'PARTIALLY REFUNDED',
    REFUNDED: 'REFUNDED',
    CANCELLED: 'CANCELLED',
    COMPLETED: 'COMPLETED',
    PENDING: 'PENDING',
    'PENDING PAY': 'PENDING PAY',
    'PENDING PAYMENT': 'PENDING PAYMENT',
    ACTIVE: 'ACTIVE',
    INACTIVE: 'INACTIVE',
    VIP: 'VIP',
    REGULAR: 'REGULAR',
    STANDARD: 'STANDARD',
    CASH: 'CASH',
    BANK_TRANSFER: 'BANK TRANSFER',
    CREDIT_CARD: 'CREDIT CARD',
    VODAFONE_CASH: 'VODAFONE CASH',
    INSTAPAY: 'INSTAPAY'
  },

  // Dashboard Page
  dashboard: {
    title: 'Dashboard',
    subtitle: 'Real-time overview of airline ticketing operations, revenue, and daily performance.',
    kpi: {
      totalSales: 'Total Ticket Sales',
      totalCollected: 'Total Collected',
      remainingBalance: 'Outstanding Balance',
      activeTickets: 'Active Tickets',
      netProfit: 'Net Profit',
      refunds: 'Refunds',
      salesSubtitle: 'Gross booking value across all issued tickets',
      collectedSubtitle: 'Verified received customer payments',
      remainingSubtitle: 'Pending receivable from passengers',
      activeSubtitle: 'Confirmed and partially paid reservations'
    },
    quickActions: {
      title: 'Quick Operations',
      newTicket: 'Issue New Ticket',
      addCustomer: 'Register Customer',
      viewReports: 'Financial Reports',
      auditLog: 'View Audit Log'
    },
    recentTickets: {
      title: 'Recent Tickets',
      subtitle: 'Latest bookings processed today',
      viewAll: 'View All Tickets'
    },
    airlineBreakdown: {
      title: 'Sales by Airline',
      subtitle: 'Distribution of gross sales volume'
    },
    recentActivity: {
      title: 'Live Activity Stream',
      subtitle: 'Recent agent actions & system events'
    }
  },

  // Tickets Page & Module
  tickets: {
    title: 'Tickets',
    subtitle: 'Manage reservations, issue tickets, record payments, and track flight schedules.',
    createTicket: 'Issue Ticket',
    bulkImport: 'Import Tickets',
    bulkModal: {
      title: 'Bulk Ticket Upload',
      subtitle: 'Upload Excel (.xlsx, .xls, .csv) or PDF ticket documents to import tickets into the system.',
      dropTitle: 'Drag & drop your files here, or click to browse',
      dropHint: 'Supports Excel (.xlsx, .xls, .csv) and PDF documents (up to 50 files)',
      selectedFiles: 'Selected Files',
      downloadTemplate: 'Download Excel Template',
      startImport: 'Start Import',
      processing: 'Processing tickets...',
      analyzing: 'Analyzing files and extracting tickets...',
      saving: 'Saving tickets to database...',
      summaryTitle: 'Import Results Summary',
      totalProcessed: 'Total Processed',
      totalImported: 'Successfully Imported',
      totalDuplicates: 'Skipped Duplicates',
      totalErrors: 'Errors',
      duplicatesTitle: 'Skipped Duplicate Tickets',
      errorsTitle: 'Failed Tickets',
      refreshTable: 'Refresh & View Tickets',
      noFilesSelected: 'Please select at least one file to upload.'
    },
    pnr: 'PNR',
    ticketNumber: 'Ticket Number',
    flightNumber: 'Flight Number',
    route: 'Origin → Destination',
    seatAssignment: 'Seat Assignment',
    baggageAllowance: 'Baggage Allowance',
    ticketPrice: 'Ticket Price (Sale Price)',
    searchPlaceholder: 'Search by passenger, PNR, ticket # or airline...',
    filterStatus: 'Status',
    filterAirline: 'Airline',
    table: {
      ticketNumber: 'Ticket #',
      passenger: 'Passenger',
      airline: 'Airline',
      route: 'Route',
      flight: 'Flight',
      travelDate: 'Travel Date',
      price: 'Price',
      paid: 'Paid',
      remaining: 'Remaining',
      status: 'Status',
      actions: 'Actions'
    },
    empty: {
      title: 'No Tickets Found',
      description: 'No tickets matched your search criteria or filter selections.',
      createAction: 'Create New Ticket'
    }
  },

  // Due Tickets Page (Tickets with Balance)
  dueTickets: {
    title: 'Tickets with Balance',
    subtitle: 'List of bookings and tickets with pending or outstanding balances awaiting collection.',
    searchPlaceholder: 'Search by passenger, phone, PNR, or ticket number...',
    filterStatus: 'Filter Status',
    filterAll: 'All Due Tickets',
    filterUnpaid: 'Unpaid in Full',
    filterPartiallyPaid: 'Partially Paid',
    remainingAmount: 'Remaining Balance',
    table: {
      ticketNumber: 'Ticket #',
      passenger: 'Passenger',
      airlineRoute: 'Airline & Route',
      travelDate: 'Travel Date',
      price: 'Price',
      paid: 'Paid',
      remaining: 'Remaining Due',
      status: 'Payment Status',
      action: 'Action'
    },
    actionPay: 'View & Settle Ticket',
    emptyTitle: 'No Tickets with Balance Due',
    emptySubtitle: 'Great news! All current tickets are fully paid, or no tickets matched your search criteria.'
  },

  // Ticket Create Page
  ticketCreate: {
    title: 'Create Ticket',
    subtitle: 'Issue a new passenger airline reservation and configure financial schedule.',
    backToTickets: 'Back to Tickets',
    aiExtract: {
      button: 'Extract Details from File (PDF/Image)',
      hint: 'Review extracted details before saving — AI extraction is advisory and may not be 100% accurate.',
      loading: 'Extracting data with AI...',
      success: 'Data extracted successfully — please review before saving.'
    },
    passengerInfo: {
      title: 'Passenger & Customer Information',
      subtitle: 'Select an existing customer or enter passenger travel identity.',
      existingCustomer: 'Existing Customer (Optional)',
      selectCustomer: '-- Select registered customer --',
      passengerName: 'Passenger Full Name',
      passengerNamePlaceholder: 'e.g. Tarek Mahmoud Hassan',
      phone: 'Phone Number',
      phonePlaceholder: '+20 100 123 4567',
      email: 'Email Address',
      emailPlaceholder: 'passenger@example.com',
      passport: 'Passport Number',
      passportPlaceholder: 'A12345678'
    },
    flightInfo: {
      title: 'Flight & Itinerary Details',
      subtitle: 'Airline, flight numbers, routing and departure schedule.',
      airline: 'Airline',
      pnr: 'PNR Code (6-Chars)',
      pnrPlaceholder: 'e.g. AB7K92',
      ticketNumber: 'E-Ticket Number (13-Digits)',
      ticketNumberPlaceholder: 'e.g. 0771234567890',
      flightNumber: 'Flight Number',
      flightNumberPlaceholder: 'e.g. MS777',
      tripType: 'Trip Type',
      oneWay: 'One Way',
      roundTrip: 'Round Trip',
      origin: 'Origin Airport',
      destination: 'Destination Airport',
      departureDate: 'Departure Date',
      arrivalDate: 'Arrival Date & Time',
      returnDate: 'Return Date & Time',
      seatClass: 'Cabin Class',
      cabinClass: 'Cabin Class',
      economy: 'Economy (Y)',
      business: 'Business (J)',
      first: 'First (F)'
    },
    returnFlight: {
      title: 'Return Flight',
      subtitle: 'Return flight schedule and routing.',
      optionalHint: 'Leave blank for a one-way ticket',
      flightNumber: 'Return Flight Number',
      flightNumberPlaceholder: 'e.g. MS 987',
      departureDate: 'Return Departure Date',
      arrivalDate: 'Return Arrival Date & Time'
    },
    financials: {
      title: 'Pricing & Initial Payment',
      subtitle: 'Set ticket price, taxes, and record any initial payment received.',
      ticketPrice: 'Total Ticket Price',
      costPrice: 'Cost Price (Airline)',
      netProfit: 'Net Profit',
      initialPayment: 'Initial Payment Received',
      paymentMethod: 'Payment Method',
      paymentRef: 'Payment Reference / Transaction ID',
      paymentRefPlaceholder: 'e.g. CASH-001 or TXN-998822',
      remainingNotice: 'Calculated Remaining Balance:'
    },
    buttons: {
      submit: 'Issue Ticket',
      submitting: 'Issuing Ticket...',
      cancel: 'Cancel'
    }
  },

  // Ticket Details Page
  ticketDetails: {
    title: 'Ticket Details',
    pnrLabel: 'PNR',
    tabs: {
      overview: 'Overview',
      payments: 'Payments & Balance',
      modifications: 'Flight Modifications',
      refunds: 'Refund Requests',
      activity: 'Audit Trail'
    },
    actions: {
      addPayment: 'Add Payment',
      modifyFlight: 'Modify Flight',
      requestRefund: 'Request Refund',
      cancelTicket: 'Cancel Ticket',
      printTicket: 'Print Itinerary'
    },
    overview: {
      itineraryCard: 'Flight Itinerary',
      passengerCard: 'Passenger Information',
      financialSummary: 'Financial Breakdown',
      ticketPrice: 'Gross Ticket Price',
      costPrice: 'Cost Price (Airline)',
      netProfit: 'Net Profit',
      totalPaid: 'Total Paid',
      remainingBalance: 'Remaining Balance',
      modificationFees: 'Modification Fees',
      netAmount: 'Net Realized Value',
      paymentProgress: 'Payment Progress'
    },
    paymentsTab: {
      title: 'Recorded Payments',
      subtitle: 'Append-only ledger of verified customer transactions',
      addPaymentBtn: 'Record New Payment',
      table: {
        id: 'Payment ID',
        date: 'Date & Time',
        amount: 'Amount',
        method: 'Payment Method',
        reference: 'Reference #',
        receivedBy: 'Received By',
        notes: 'Notes'
      },
      empty: 'No payments have been recorded for this ticket yet.'
    },
    modificationsTab: {
      title: 'Flight Modifications History',
      subtitle: 'Schedule changes, route revisions, and associated change fees',
      modifyBtn: 'Record Modification',
      table: {
        id: 'Modification ID',
        date: 'Date',
        previousSchedule: 'Previous Schedule',
        newSchedule: 'New Schedule',
        fee: 'Modification Fee',
        airlineFee: 'Airline Fee',
        reason: 'Reason / Notes',
        processedBy: 'Processed By'
      },
      empty: 'No flight modifications have been made to this ticket.'
    },
    refundsTab: {
      title: 'Refunds & Reversals',
      subtitle: 'Processed refunds and reversals against customer paid balances',
      requestBtn: 'Process Refund',
      table: {
        id: 'Refund ID',
        date: 'Date',
        amount: 'Refund Amount',
        fee: 'Penalty Fee',
        netRefund: 'Net Refunded',
        reason: 'Reason',
        processedBy: 'Processed By',
        status: 'Status'
      },
      empty: 'No refund requests have been initiated for this ticket.'
    },
    activityTab: {
      title: 'Ticket Audit Trail',
      subtitle: 'Chronological immutable log of all operations performed on this ticket'
    }
  },

  // Customers Page
  customers: {
    title: 'Customers',
    subtitle: 'Manage passenger profiles, contact directories, and historical ticketing records.',
    newCustomer: 'Register Customer',
    searchPlaceholder: 'Search customers by name, phone, email, or passport...',
    table: {
      name: 'Customer Name',
      phone: 'Phone Number',
      email: 'Email',
      passport: 'Passport #',
      totalSpent: 'Total Bookings',
      activeTickets: 'Active Tickets',
      status: 'Status',
      actions: 'Actions'
    },
    empty: {
      title: 'No Customers Found',
      description: 'No customer profiles match your current search criteria.'
    }
  },

  // Customer Details Page
  customerDetails: {
    title: 'Customer Profile',
    backToCustomers: 'Back to Customers',
    editProfile: 'Edit Profile',
    contactInfo: 'Contact Information',
    phone: 'Phone',
    email: 'Email',
    passport: 'Passport Number',
    nationality: 'Nationality',
    notes: 'Internal Notes',
    addNote: 'Add Note',
    notePlaceholder: 'Write an internal note about this customer...',
    bookingHistory: 'Ticket Booking History',
    totalSpent: 'Lifetime Sales',
    totalTickets: 'Tickets Issued',
    emptyTickets: 'No tickets found for this customer.',
    passportDoc: {
      title: 'Passport Document',
      uploaded: 'Uploaded',
      view: 'View Document',
      delete: 'Delete',
      replace: 'Replace:',
      uploadNew: 'Upload New',
      empty: 'No passport document uploaded yet.',
      upload: 'Upload Document'
    },
    deletePassportTitle: 'Delete Passport Document',
    deletePassportConfirm: 'Are you sure you want to permanently delete this passport document?'
  },

  // Payments Page
  payments: {
    title: 'Payments',
    subtitle: 'Global ledger of all customer payments, transactions, and settlement methods.',
    recordPayment: 'Record Payment',
    searchPlaceholder: 'Search payments by ID, ticket, customer, or reference...',
    table: {
      id: 'Payment ID',
      date: 'Date',
      ticketId: 'Ticket #',
      passenger: 'Passenger',
      amount: 'Amount',
      method: 'Method',
      reference: 'Reference #',
      collectedBy: 'Collected By'
    },
    summary: {
      totalCollected: 'Total Collected This Period',
      cashVolume: 'Cash Transactions',
      digitalVolume: 'Digital / Bank Transfers'
    }
  },

  // Refunds Page
  refunds: {
    title: 'Refunds',
    subtitle: 'Process and audit customer refund requests, ticket cancellations, and penalty fees.',
    newRefund: 'Process Refund',
    searchPlaceholder: 'Search refunds by ID, ticket, or passenger...',
    table: {
      id: 'Refund ID',
      date: 'Date',
      ticketId: 'Ticket #',
      passenger: 'Passenger',
      refundAmount: 'Refund Amount',
      penaltyFee: 'Penalty Fee',
      status: 'Status',
      processedBy: 'Processed By'
    }
  },

  // Reports Page
  reports: {
    title: 'Reports',
    subtitle: 'Financial analytics, revenue trends, airline breakdowns, and agent performance.',
    exportCsv: 'Export CSV',
    exportPdf: 'Print Report',
    kpi: {
      grossRevenue: 'Gross Revenue',
      netCollected: 'Net Cash Collected',
      totalOutstanding: 'Total Outstanding',
      refundsTotal: 'Total Refunded',
      margin: 'Estimated Operating Margin'
    },
    monthlyTrends: 'Monthly Revenue Progression',
    customerPayments: {
      title: 'Customer Payments',
      customerTicket: 'Customer / Ticket №',
      oneWay: 'One Way',
      roundTrip: 'Round Trip'
    }
  },

  // Employees Page
  employees: {
    title: 'Employees',
    subtitle: 'Manage agency staff, ticketing agents, operational roles, and system access.',
    accessRestricted: 'Access Restricted',
    adminOnlyMessage: 'This page is only available to administrators.',
    addEmployee: 'Add Employee',
    passwordTooShort: 'Password must be at least 12 characters',
    createFailed: 'Failed to create employee',
    credentialsWarning: 'Share these credentials securely with the new employee. They will not be shown again.',
    newEmployeeCredentials: 'New Employee Credentials',
    password: 'Password',
    titleLabel: 'Title',
    generate: 'Generate',
    show: 'Show',
    hide: 'Hide',
    copy: 'Copy',
    copied: 'Copied',
    copyFailed: 'Unable to copy credentials',
    done: 'Done',
    roles: {
      admin: 'Administrator',
      agent: 'Ticketing Agent',
      ticketOnly: 'Ticket Creation Only'
    },
    searchPlaceholder: 'Search employees by name, role, or email...',
    table: {
      name: 'Employee Name',
      role: 'Role / Title',
      email: 'Email',
      phone: 'Phone',
      branch: 'Branch Office',
      status: 'Status',
      online: 'Status / Online',
      actions: 'Actions'
    },
    online: 'Online',
    onlineNow: 'Online now',
    lastSeen: 'Last seen',
    neverLoggedIn: 'Never logged in',
    deleteTitle: 'Delete Employee',
    deleteWarning: 'Warning: This action is permanent and cannot be undone.',
    deleteExplanation: 'The employee account will be permanently deleted. All their historical records (tickets, payments, etc.) will be preserved but will no longer be linked to this account.',
    deleteConfirmQuestion: 'Are you sure you want to delete this employee?',
    deleteSuccess: 'Employee account permanently deleted.',
    deleteFailed: 'Failed to delete employee',
    cannotDeleteSelf: 'You cannot delete your own account. Ask another administrator.',
    cannotDeleteLastAdmin: 'Cannot delete the last remaining active administrator.'
  },

  // Office Expenses Page
  expenses: {
    title: 'Office Expenses',
    subtitle: 'Track operational office expenses, service fees, and bank transfers.',
    addExpense: 'Add Expense',
    newExpenseModalTitle: 'Record New Office Expense',
    newExpenseModalSubtitle: 'Log a service or transfer expenditure.',
    editExpenseModalTitle: 'Edit Office Expense',
    editExpenseModalSubtitle: 'Update details for this expense record.',
    totalServices: 'Services Total',
    totalTransfers: 'Transfers Total',
    grandTotal: 'Total Expenses',
    filterCategory: 'All Categories',
    categories: {
      SERVICES: 'Services',
      TRANSFERS: 'Transfers'
    },
    table: {
      date: 'Date & Time',
      category: 'Category',
      amount: 'Amount',
      description: 'Description',
      recordedBy: 'Recorded By',
      actions: 'Actions'
    },
    form: {
      category: 'Category',
      amount: 'Amount (EGP)',
      date: 'Date & Time',
      description: 'Description / Notes',
      descriptionPlaceholder: 'e.g. Electricity bill, Office supplies, Vendor transfer...'
    },
    deleteConfirmTitle: 'Delete Expense Record',
    deleteConfirmMessage: 'Are you sure you want to delete this expense record? This action will remove it from the ledger.',
    createdSuccessfully: 'Expense record created successfully.',
    updatedSuccessfully: 'Expense record updated successfully.',
    deletedSuccessfully: 'Expense record deleted successfully.',
    emptyState: 'No expense records found matching the criteria.'
  },

  // Visas Page
  visas: {
    title: 'Visas',
    subtitle: 'Manage and track visa applications, types, and payment status.',
    addVisa: 'Add Visa',
    newVisaModalTitle: 'New Visa Application',
    newVisaModalSubtitle: 'Record a new visa application entry.',
    editVisaModalTitle: 'Edit Visa',
    editVisaModalSubtitle: 'Update details for this visa record.',
    totalPrice: 'Total Revenue',
    totalRevenue: 'Total Revenue',
    totalPaid: 'Total Collected',
    totalRemaining: 'Total Remaining',
    totalCost: 'Total Cost',
    totalVisas: 'Total Visas',
    totalCount: 'Total Visas',
    profit: 'Profit',
    filterType: 'All Types',
    filterPayment: 'All Payment Status',
    filterStatus: 'All Status',
    filterCurrency: 'All Currencies',
    types: {
      TOURIST: 'Tourist',
      WORK: 'Work',
      STUDY: 'Study',
      UMRAH_HAJJ: 'Umrah / Hajj',
      MEDICAL: 'Medical'
    },
    paymentStatus: {
      PAID: 'Paid',
      PARTIAL: 'Partially Paid',
      UNPAID: 'Unpaid'
    },
    payment: {
      PAID: 'Paid',
      PARTIAL: 'Partially Paid',
      UNPAID: 'Unpaid'
    },
    table: {
      clientName: 'Client Name',
      phone: 'Phone',
      visaType: 'Visa Type',
      country: 'Country',
      submissionDate: 'Submission Date',
      currency: 'Currency',
      price: 'Price',
      paidAmount: 'Collected',
      remainingAmount: 'Remaining',
      costPrice: 'Cost Price',
      status: 'Payment',
      paymentStatus: 'Payment',
      actions: 'Actions'
    },
    form: {
      clientName: 'Client Name',
      clientNamePlaceholder: 'Enter client full name',
      phone: 'Phone Number',
      phonePlaceholder: 'e.g. +20 1XX XXX XXXX',
      visaType: 'Visa Type',
      country: 'Country',
      countryPlaceholder: 'e.g. Saudi Arabia, Turkey, USA...',
      submissionDate: 'Submission Date',
      price: 'Price (Client)',
      paidAmount: 'Collected Amount',
      remainingAmount: 'Remaining Balance',
      costPrice: 'Cost Price (Office)',
      currency: 'Currency',
      paymentStatus: 'Payment Status',
      notes: 'Notes',
      notesPlaceholder: 'Additional notes about this visa application...'
    },
    details: {
      title: 'Visa Details',
      breadcrumb: 'Visas',
      clientInfo: 'Client Information',
      visaInfo: 'Visa Information',
      financialInfo: 'Financial Information',
      profit: 'Profit',
      changePaymentStatus: 'Change Payment Status',
      markAsPaid: 'Mark as Paid',
      markAsUnpaid: 'Mark as Unpaid'
    },
    deleteConfirmTitle: 'Delete Visa Record',
    deleteConfirmMessage: 'Are you sure you want to delete this visa record? This action will remove it from the system.',
    createdSuccessfully: 'Visa record created successfully.',
    updatedSuccessfully: 'Visa record updated successfully.',
    deletedSuccessfully: 'Visa record deleted successfully.',
    paymentUpdated: 'Payment status updated successfully.',
    emptyState: 'No visa records found matching the criteria.',
    searchPlaceholder: 'Search by client name or country...'
  },

  // Activity Page
  activity: {
    title: 'Activity Log',
    subtitle: 'Immutable system-wide audit trail recording all agent operations and security events.',
    filterAction: 'Filter Action',
    searchPlaceholder: 'Search audit trail...',
    table: {
      timestamp: 'Timestamp',
      user: 'Agent / User',
      action: 'Action',
      entity: 'Entity / Target',
      description: 'Operation Details'
    }
  },

  // Settings Page
  settings: {
    title: 'Settings',
    subtitle: 'Workspace preferences, profile details, security, language, and financial configuration.',
    darkMode: 'Dark Mode',
    darkModeDesc: 'Enable dark appearance to reduce eye strain in low-light environments',
    tabs: {
      profile: 'Profile',
      language: 'Language & Region',
      security: 'Security',
      company: 'Company',
      currency: 'Currency & Payments',
      notifications: 'Notifications',
      statuses: 'Ticket Statuses'
    },
    profile: {
      title: 'Personal Information',
      subtitle: 'Update your photo and personal contact details here.',
      fullName: 'Full Name',
      email: 'Email Address',
      roleTitle: 'Role Title',
      changePhoto: 'Change Photo',
      changePassword: 'Change Password',
      currentPassword: 'Current Password',
      newPassword: 'New Password',
      confirmPassword: 'Confirm New Password',
      updatePassword: 'Update Password'
    },
    languageSection: {
      title: 'Language & Direction Preferences',
      subtitle: 'Choose your preferred interface language and reading direction.',
      currentLang: 'Active Interface Language',
      englishOption: 'English (LTR — Left to Right)',
      arabicOption: 'العربية (RTL — من اليمين إلى اليسار)',
      description: 'Selecting Arabic will automatically configure Right-to-Left layout, Arabic numerals, and localized date/currency formats.'
    },
    securitySection: {
      title: 'Security & Session Management',
      twoFactor: 'Two-Factor Authentication (2FA)',
      twoFactorDesc: 'Add an extra layer of security to your operations account.',
      activeSessions: 'Active Sessions',
      activeSessionsDesc: 'Chrome on Windows • Cairo, Egypt (Current Session)',
      revokeOthers: 'Revoke Others',
      signOutAccount: 'Sign Out of Account',
      signOutDesc: 'End your active session on this device and return to login.'
    },
    companySection: {
      title: 'Company & Agency Profile',
      agencyName: 'Agency Legal Name',
      iataNumber: 'IATA Numeric Code',
      taxId: 'Tax ID / Commercial Reg.',
      address: 'Registered HQ Address',
      saveCompany: 'Save Company Details'
    },
    currencySection: {
      title: 'Currency & Payment Methods',
      baseCurrency: 'Base Operating Currency',
      acceptedMethods: 'Accepted Payment Methods'
    }
  },

  // Login Page
  login: {
    welcomeTitle: 'Welcome Back',
    welcomeSubtitle: 'Sign in to access your control panel',
    title: 'Welcome Back',
    subtitle: 'Sign in to access your control panel',
    systemTagline: 'TRAVEL & TOURISM MANAGEMENT SYSTEM',
    systemPreparing: 'Initializing System...',
    systemWait: 'Please wait a moment',
    emailLabel: 'Email Address',
    emailPlaceholder: 'example@mail.com',
    passwordLabel: 'Password',
    passwordPlaceholder: '••••••••',
    rememberMe: 'Remember this device',
    signInBtn: 'Sign In',
    signingIn: 'Authenticating...',
    switchLanguage: 'العربية',
    enterCredentials: 'Please enter your email and password'
  },

  // Modals & Action Dialogs
  modals: {
    addPayment: {
      title: 'Record Payment',
      subtitle: 'Add a verified customer payment to this ticket reservation.',
      amount: 'Payment Amount',
      type: 'Payment Classification',
      typeTicket: 'Ticket Payment',
      typeModification: 'Flight Modification Fee',
      method: 'Payment Method',
      ref: 'Transaction / Receipt Reference',
      refPlaceholder: 'e.g. CASH-992 or POS-1188',
      notes: 'Internal Notes (Optional)',
      submit: 'Record Payment',
      remainingIs: 'Remaining balance due:',
      modificationOutstandingIs: 'Outstanding modification fee balance:'
    },
    modifyFlight: {
      title: 'Modify Flight Schedule',
      subtitle: 'Record an itinerary change, new departure date, and modification fee.',
      outboundSection: 'Outbound Flight',
      returnSection: 'Return Flight',
      newFlightNumber: 'New Outbound Flight Number',
      newReturnFlightNumber: 'New Return Flight Number',
      newDeparture: 'New Outbound Departure Date',
      newArrival: 'New Outbound Arrival Date',
      newReturnDeparture: 'New Return Departure Date',
      newReturnArrival: 'New Return Arrival Date',
      modFeeAirline: 'Airline Modification Fee (Cost)',
      modFeeCustomer: 'Fee Charged to Customer',
      collectedNow: 'Fee collected from customer now?',
      paymentMethod: 'Payment Method',
      reason: 'Modification Reason',
      submit: 'Save Flight Modification'
    },
    processRefund: {
      title: 'Process Ticket Refund & Cancellation',
      subtitle: 'Record refunds from airline and to customer, calculate penalties and profit impact.',
      availableRefundable: 'Available Refundable to Customer:',
      refundAmount: 'Customer Refund Amount (from Agency)',
      airlineRefundAmount: 'Airline Refund Amount (to Agency)',
      costPrice: 'Airline Cost Price',
      costPriceMissingHint: 'Enter airline cost price to compute airline penalty and net profit accurately',
      financialSummaryTitle: 'Cancellation & Refund Financial Summary',
      costPriceLabel: 'Original Cost Price:',
      airlinePenalty: 'Airline Penalty Fee:',
      customerDeduction: 'Deducted from Customer:',
      netAgencyImpact: 'Net Agency Profit / Loss Impact:',
      closeTicketRefunded: 'Mark ticket as fully REFUNDED',
      penaltyFee: 'Agency Penalty / Cancellation Fee',
      reason: 'Refund Reason',
      status: 'Refund Status',
      statusCompleted: 'COMPLETED (Processed)',
      statusPending: 'PENDING (Under Review)',
      submit: 'Process Refund'
    },
    deleteTicket: {
      title: 'Delete Ticket',
      warningPermanent: 'Warning: Permanent deletion cannot be undone',
      explanationPermanent: 'The ticket along with all associated payments and refunds will be permanently deleted. This cannot be recovered, and only a summary record will be retained in the audit log.',
      confirmQuestion: 'Are you sure you want to delete this ticket?',
      yes: 'Yes',
      no: 'No'
    },
    deleteCustomer: {
      title: 'Delete Customer',
      warning: 'Are you sure you want to delete this customer?',
      explanation: 'The customer will be marked as deleted and will no longer appear in the main lists. This action cannot be completed if the customer has any active tickets.'
    },
    notifications: {
      title: 'Notifications & Alerts',
      subtitle: 'Recent system operations and ticketing updates',
      viewAll: 'View Full Audit Trail',
      departureSoon: 'Departure approaching',
      returnSoon: 'Return approaching'
    },
    help: {
      title: 'AfricaTravel Operational Guide',
      subtitle: 'System shortcuts and operational documentation',
      workflows: 'Key Operations Workflows',
      issueTicketDesc: 'Go to /tickets/new, fill customer, itinerary, and financial amounts. Remaining balance is automatically computed.',
      recordPaymentDesc: 'In ticket details, click + Add Payment. Payments are append-only and balance-validated.',
      modifyFlightDesc: 'In ticket details, click Modify Flight. Previous flights are archived in history.',
      refundDesc: 'Available refundable balances are strictly validated.',
      techSupport: 'Technical Support'
    }
  },

  // Validation Errors & Business Rule Messages
  validation: {
    requiredField: 'Required field.',
    paymentExceedsRemaining: 'Payment exceeds the remaining balance.',
    refundExceedsAvailable: 'Refund exceeds the available refundable amount.',
    invalidFlightSchedule: 'Invalid flight schedule.',
    invalidDates: 'Arrival time must be after departure time.',
    zeroOrNegativeAmount: 'Amount must be greater than zero.',
    negativeFee: 'Fee cannot be negative.',
    emptyPassenger: 'Passenger name is required.',
    invalidTicketPrice: 'Ticket price must be greater than zero.',
    initialPaymentExceedsPrice: 'Initial payment cannot exceed the total ticket price.',
    ticketNotFound: 'Ticket not found.',
    customerNotFound: 'Customer not found.',
    invalidEmail: 'Please enter a valid email address.',
    invalidPhone: 'Please enter a valid phone number.',
    returnFlightRequired: 'Please fill in all return flight details for a Round Trip ticket.',
    returnDateAfterDeparture: 'Return departure date must be after outbound departure date.',
    flightNumberRequired: 'Flight number is required.'
  },

  // Toast Notification Messages
  toasts: {
    signedIn: 'Signed in successfully',
    ticketCreated: 'Ticket created successfully.',
    ticketUpdated: 'Ticket updated successfully.',
    ticketDeleted: 'Ticket deleted successfully.',
    paymentAdded: 'Payment added successfully.',
    flightModified: 'Flight modification saved.',
    refundCreated: 'Refund request created.',
    customerCreated: 'Customer profile registered successfully.',
    customerUpdated: 'Customer updated successfully.',
    customerDeleted: 'Customer deleted successfully.',
    noteAdded: 'Note added successfully.',
    profileUpdated: 'Profile updated successfully!',
    passwordChanged: 'Password changed successfully!',
    companyUpdated: 'Company information updated!',
    sessionsRevoked: 'All other active sessions revoked',
    signedOut: 'Signed out successfully',
    languageChanged: 'Language updated successfully.',
    ticketCancelled: 'Ticket has been cancelled.'
  },

  // Time & Relative Formatting
  time: {
    justNow: 'Just now',
    minsAgo: '{n} mins ago',
    hoursAgo: '{n} hours ago',
    daysAgo: '{n} days ago'
  },

  // Flight Reminders & In-App Notifications
  notifications: {
    departureSoon: 'Departure approaching',
    returnSoon: 'Return approaching'
  },

  // Hotels (AI)
  hotels: {
    title: 'Hotel Bookings (AI)',
    subtitle: 'Generate and manage international hotel booking vouchers powered by AI',
    generateTitle: 'Generate Hotel Booking with AI',
    generateSubtitle: 'Enter client name, destination, and stay period to generate an official international voucher',
    clientName: 'Client Name',
    clientNamePlaceholder: 'Enter client name or pick from list...',
    destination: 'Country / City',
    destinationPlaceholder: 'e.g. Dubai, London, Paris, Istanbul, Riyadh...',
    checkIn: 'Check-in Date',
    checkOut: 'Check-out Date',
    nights: 'Nights',
    generateBtn: 'Generate Booking with AI ✦',
    generating: 'Selecting hotel & generating booking data...',
    previewTitle: 'Generated Hotel Voucher Preview',
    previewSubtitle: 'Review or adjust any details below before printing or saving',
    hotelName: 'Hotel Name',
    stars: 'Star Rating',
    address: 'Hotel Address',
    roomType: 'Room Category',
    boardBasis: 'Board Basis / Meals',
    confirmationNumber: 'Confirmation #',
    bookingRef: 'Booking Ref',
    status: 'Booking Status',
    confirmed: 'CONFIRMED',
    printVoucher: 'Download / Print Voucher PDF (English)',
    saveToSystem: 'Save to System',
    saving: 'Saving...',
    savedSuccess: 'Hotel booking saved to system successfully',
    archiveTitle: 'Saved Hotel Bookings Archive',
    archiveSubtitle: 'Historical hotel vouchers with 1-click reprinting',
    noBookings: 'No hotel bookings saved yet',
    noBookingsDesc: 'Generate your first hotel voucher with AI above and save it to the system.',
    reprint: 'Print Voucher',
    deleteBooking: 'Delete Booking',
    deleteConfirm: 'Are you sure you want to delete this hotel booking?',
    quickEdit: 'Quick Edit Details'
  }
};
