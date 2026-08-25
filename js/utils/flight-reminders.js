/**
 * AfricaTravel — Flight Reminders Utility
 *
 * Returns tickets whose departure or return date falls within the next 24 hours.
 * Only considers active (non-cancelled/non-refunded) tickets.
 */

export function getUpcomingFlightReminders(tickets = []) {
  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const reminders = [];

  for (const ticket of tickets) {
    if (!ticket) continue;
    if (['CANCELLED', 'REFUNDED'].includes(ticket.status)) continue;

    const departure = ticket.departureDate ? new Date(ticket.departureDate) : null;
    if (departure && !isNaN(departure.getTime()) && departure >= now && departure <= in24h) {
      reminders.push({
        ticketId: ticket.id,
        type: 'DEPARTURE',
        date: departure,
        passengerName: ticket.passengerName,
        route: `${ticket.origin} → ${ticket.destination}`,
        ticketNumber: ticket.ticketNumber
      });
    }

    const returnDep = ticket.returnDepartureDate ? new Date(ticket.returnDepartureDate) : null;
    if (returnDep && !isNaN(returnDep.getTime()) && returnDep >= now && returnDep <= in24h) {
      reminders.push({
        ticketId: ticket.id,
        type: 'RETURN',
        date: returnDep,
        passengerName: ticket.passengerName,
        route: `${ticket.destination} → ${ticket.origin}`,
        ticketNumber: ticket.ticketNumber
      });
    }
  }

  return reminders.sort((a, b) => a.date - b.date);
}
