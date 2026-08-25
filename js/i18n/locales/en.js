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

  // Navigation
  nav: {
    dashboard: 'Dashboard',
    tickets: 'Tickets',
    customers: 'Customers',
    payments: 'Payments',
    refunds: 'Refunds',
    reports: 'Reports',
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
    close: 'Close',
    back: 'Back',
    next: 'Next',
    previous: 'Previous',
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
    active: 'Active',
    inactive: 'Inactive',
    enabled: 'Enabled',
    disabled: 'Disabled'
  },

  // User Roles
  roles: {
    admin: 'Administrator',
    agent: 'Ticketing Agent',
    ADMIN: 'Administrator',
    AGENT: 'Ticketing Agent',
    operationsDirector: 'Senior Operations Director',
    'Senior Operations Director': 'Senior Operations Director'
  },

  // Status Labels
  status: {
    CONFIRMED: 'CONFIRMED',
    PAID: 'PAID',
    'PARTIALLY PAID': 'PARTIALLY PAID',
    PARTIALLY_PAID: 'PARTIALLY PAID',
    BOOKED: 'BOOKED',
    MODIFIED: 'MODIFIED',
    'REFUND REQUESTED': 'REFUND REQUESTED',
    REFUND_REQUESTED: 'REFUND REQUESTED',
    REFUNDED: 'REFUNDED',
    CANCELLED: 'CANCELLED',
    COMPLETED: 'COMPLETED',
    PENDING: 'PENDING',
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

  // Ticket Create Page
  ticketCreate: {
    title: 'Create Ticket',
    subtitle: 'Issue a new passenger airline reservation and configure financial schedule.',
    backToTickets: 'Back to Tickets',
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
      departureDate: 'Departure Date & Time',
      arrivalDate: 'Arrival Date & Time',
      returnDate: 'Return Date & Time',
      seatClass: 'Cabin Class',
      economy: 'Economy Class',
      business: 'Business Class',
      first: 'First Class'
    },
    returnFlight: {
      title: 'Return Flight',
      subtitle: 'Return flight schedule and routing.',
      flightNumber: 'Return Flight Number',
      flightNumberPlaceholder: 'e.g. MS 987',
      departureDate: 'Return Departure Date & Time',
      arrivalDate: 'Return Arrival Date & Time'
    },
    financials: {
      title: 'Pricing & Initial Payment',
      subtitle: 'Set ticket price, taxes, and record any initial payment received.',
      ticketPrice: 'Total Ticket Price',
      costPrice: 'Net Cost Price',
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
    emptyTickets: 'No tickets found for this customer.'
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
    salesByAirline: 'Sales Volume by Airline',
    agentPerformance: 'Agent Sales Performance',
    adminOnlyEmployees: 'Employee performance data requires administrator access.',
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
    passwordTooShort: 'Password must be at least 8 characters',
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
      actions: 'Actions'
    }
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
    title: 'Sign In to AfricaTravel',
    subtitle: 'Internal Travel Agency Operations Terminal',
    emailLabel: 'Operational Email',
    emailPlaceholder: 'agent@africatravel.com',
    passwordLabel: 'Password',
    passwordPlaceholder: '••••••••',
    rememberMe: 'Remember this device',
    signInBtn: 'Sign In to Terminal',
    signingIn: 'Authenticating...',
    switchLanguage: 'Language / اللغة'
  },

  // Modals & Action Dialogs
  modals: {
    addPayment: {
      title: 'Record Payment',
      subtitle: 'Add a verified customer payment to this ticket reservation.',
      amount: 'Payment Amount (EGP)',
      method: 'Payment Method',
      ref: 'Transaction / Receipt Reference',
      refPlaceholder: 'e.g. CASH-992 or POS-1188',
      notes: 'Internal Notes (Optional)',
      submit: 'Record Payment',
      remainingIs: 'Remaining balance due:'
    },
    modifyFlight: {
      title: 'Modify Flight Schedule',
      subtitle: 'Record an itinerary change, new departure date, and modification fee.',
      newFlightNumber: 'New Flight Number',
      newDeparture: 'New Departure Date & Time',
      newArrival: 'New Arrival Date & Time',
      modFee: 'Modification / Change Fee (EGP)',
      reason: 'Modification Reason',
      submit: 'Save Flight Modification'
    },
    processRefund: {
      title: 'Process Ticket Refund',
      subtitle: 'Validate available refundable balance and issue passenger refund.',
      availableRefundable: 'Available Refundable Amount:',
      refundAmount: 'Refund Amount (EGP)',
      penaltyFee: 'Agency Penalty / Cancellation Fee (EGP)',
      reason: 'Refund Reason',
      submit: 'Process Refund'
    },
    deleteTicket: {
      title: 'Delete Ticket',
      warningPermanent: 'Warning: Permanent deletion cannot be undone',
      explanationPermanent: 'The ticket along with all associated payments and refunds will be permanently deleted. This cannot be recovered, and only a summary record will be retained in the audit log.',
      typeToConfirm: 'Type the ticket number to confirm'
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
    flightNumberRequired: 'Flight number is required.'
  },

  // Toast Notification Messages
  toasts: {
    ticketCreated: 'Ticket created successfully.',
    paymentAdded: 'Payment added successfully.',
    flightModified: 'Flight modification saved.',
    refundCreated: 'Refund request created.',
    customerCreated: 'Customer profile registered successfully.',
    customerUpdated: 'Customer updated successfully.',
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
  }
};
